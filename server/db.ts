import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RULE_SET, courts } from "../src/domain/catalog.js";
import { canPublishRuleChange, transitionRuleChange, transitionRulePublication, type RuleChangeDecision } from "../src/domain/governance.js";
import { DEFAULT_JUDICIAL_FEE_RULES, applyRuleParameters, validateRuleParameters, type JudicialFeeRuleConfig } from "../src/domain/rule-parameters.js";
import type { CourtServiceCalculationResult, CourtServiceInput } from "../src/domain/service-fees.js";
import type { CalculationResult, EstimateInput, RuleChangeRequest } from "../src/domain/types.js";
import type { SessionUser } from "./auth.js";

const databasePath = resolve(process.env.JUDICIAL_FEES_DB_PATH ?? ".data/judicial-fees.db");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

db.exec(`
  CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    court_id TEXT NOT NULL,
    case_type_id TEXT NOT NULL,
    stage TEXT NOT NULL CHECK(stage IN ('filing','final')),
    status TEXT NOT NULL CHECK(status IN ('draft','reviewed','issued')),
    total_millieme INTEGER NOT NULL CHECK(total_millieme >= 0),
    refundable_millieme INTEGER NOT NULL DEFAULT 0 CHECK(refundable_millieme >= 0),
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_estimates_created_court ON estimates(created_at, court_id);

  CREATE TABLE IF NOT EXISTS service_estimates (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    court_id TEXT NOT NULL,
    case_reference TEXT,
    prior_registry_fee_millieme INTEGER NOT NULL DEFAULT 0 CHECK(prior_registry_fee_millieme BETWEEN 0 AND 100000),
    service_kind TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft','reviewed','issued')),
    total_millieme INTEGER NOT NULL CHECK(total_millieme >= 0),
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_service_estimates_created_court ON service_estimates(created_at, court_id);

  CREATE TABLE IF NOT EXISTS collection_events (
    id TEXT PRIMARY KEY,
    court_id TEXT NOT NULL,
    recorded_on TEXT NOT NULL,
    assessed_millieme INTEGER NOT NULL CHECK(assessed_millieme >= 0),
    collected_millieme INTEGER NOT NULL CHECK(collected_millieme >= 0),
    source TEXT NOT NULL
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_collections_date_court ON collection_events(recorded_on, court_id);

  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    previous_hash TEXT,
    event_hash TEXT NOT NULL UNIQUE
  ) STRICT;

  CREATE TABLE IF NOT EXISTS custom_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('law','regulation','circular','workbook','legacy-screen')),
    status TEXT NOT NULL CHECK(status IN ('primary','supporting','incomplete','operational-only')),
    effective_date TEXT,
    url TEXT,
    notes TEXT NOT NULL,
    created_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS rule_change_requests (
    id TEXT PRIMARY KEY,
    rule_code TEXT NOT NULL,
    proposed_formula TEXT NOT NULL,
    proposed_parameters_json TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    source_ids_json TEXT NOT NULL,
    scope TEXT NOT NULL CHECK(scope IN ('court','global')),
    court_id TEXT,
    status TEXT NOT NULL CHECK(status IN ('in_review','approved','rejected')),
    created_at TEXT NOT NULL,
    proposer_id TEXT NOT NULL,
    proposer_name TEXT NOT NULL,
    reviewed_at TEXT,
    reviewer_id TEXT,
    reviewer_name TEXT,
    review_note TEXT,
    published_at TEXT,
    publisher_id TEXT,
    publisher_name TEXT,
    CHECK((scope = 'global' AND court_id IS NULL) OR (scope = 'court' AND court_id IS NOT NULL))
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_rule_changes_status_created ON rule_change_requests(status, created_at);
`);

ensureEstimateColumns();
ensureServiceEstimateColumns();
ensureRuleChangeGovernanceColumns();
db.exec("CREATE INDEX IF NOT EXISTS idx_service_estimates_court_case ON service_estimates(court_id, case_reference);");
db.exec("CREATE INDEX IF NOT EXISTS idx_rule_changes_effective_scope ON rule_change_requests(rule_code, scope, court_id, effective_date, published_at);");

seedDemoCollections();

export function saveEstimate(input: EstimateInput, result: CalculationResult, actor: SessionUser): CalculationResult {
  const id = randomUUID();
  const createdAt = result.calculatedAt;
  const persisted = { ...result, estimateId: id };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO estimates
      (id, created_at, actor_id, actor_name, court_id, case_type_id, stage, status, total_millieme, refundable_millieme, input_json, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`)
      .run(id, createdAt, actor.id, actor.name, input.courtId, input.caseTypeId, input.stage, persisted.totalMillieme, persisted.refundableMillieme, JSON.stringify(input), JSON.stringify(persisted));
    appendAudit(actor, "ESTIMATE_CREATED", "estimate", id, { totalMillieme: persisted.totalMillieme, refundableMillieme: persisted.refundableMillieme, ruleSetVersion: persisted.ruleSetVersion }, false);
    db.exec("COMMIT");
    return persisted;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function saveServiceEstimate(
  courtId: string,
  input: CourtServiceInput,
  result: CourtServiceCalculationResult,
  actor: SessionUser
): CourtServiceCalculationResult & { estimateId: string; courtId: string } {
  const id = randomUUID();
  const persisted = { ...result, estimateId: id, courtId };
  const caseReference = "caseReference" in input ? input.caseReference : null;
  const priorRegistryFeeMillieme = "priorRegistryFeeMillieme" in input ? input.priorRegistryFeeMillieme : 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO service_estimates
      (id, created_at, actor_id, actor_name, court_id, case_reference, prior_registry_fee_millieme, service_kind, status, total_millieme, input_json, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`) 
      .run(id, result.calculatedAt, actor.id, actor.name, courtId, caseReference, priorRegistryFeeMillieme, input.kind, persisted.totalMillieme, JSON.stringify(input), JSON.stringify(persisted));
    appendAudit(actor, "SERVICE_ESTIMATE_CREATED", "service_estimate", id, {
      courtId,
      serviceKind: input.kind,
      totalMillieme: persisted.totalMillieme,
      ruleSetVersion: persisted.ruleSetVersion
    }, false);
    db.exec("COMMIT");
    return persisted;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ensureServiceEstimateColumns(): void {
  const columns = new Set(
    (db.prepare("PRAGMA table_info(service_estimates)").all() as Array<{ name: string }>).map((column) => column.name)
  );
  if (!columns.has("case_reference")) db.exec("ALTER TABLE service_estimates ADD COLUMN case_reference TEXT;");
  if (!columns.has("prior_registry_fee_millieme")) {
    db.exec("ALTER TABLE service_estimates ADD COLUMN prior_registry_fee_millieme INTEGER NOT NULL DEFAULT 0 CHECK(prior_registry_fee_millieme BETWEEN 0 AND 100000);");
  }
}

function ensureEstimateColumns(): void {
  const columns = new Set(
    (db.prepare("PRAGMA table_info(estimates)").all() as Array<{ name: string }>).map((column) => column.name)
  );
  if (!columns.has("refundable_millieme")) {
    db.exec("ALTER TABLE estimates ADD COLUMN refundable_millieme INTEGER NOT NULL DEFAULT 0 CHECK(refundable_millieme >= 0);");
  }
}

function ensureRuleChangeGovernanceColumns(): void {
  const columns = new Set(
    (db.prepare("PRAGMA table_info(rule_change_requests)").all() as Array<{ name: string }>).map((column) => column.name)
  );
  if (!columns.has("scope")) db.exec("ALTER TABLE rule_change_requests ADD COLUMN scope TEXT NOT NULL DEFAULT 'global' CHECK(scope IN ('court','global'));");
  if (!columns.has("court_id")) db.exec("ALTER TABLE rule_change_requests ADD COLUMN court_id TEXT;");
  if (!columns.has("published_at")) db.exec("ALTER TABLE rule_change_requests ADD COLUMN published_at TEXT;");
  if (!columns.has("publisher_id")) db.exec("ALTER TABLE rule_change_requests ADD COLUMN publisher_id TEXT;");
  if (!columns.has("publisher_name")) db.exec("ALTER TABLE rule_change_requests ADD COLUMN publisher_name TEXT;");
  if (!columns.has("proposed_parameters_json")) db.exec("ALTER TABLE rule_change_requests ADD COLUMN proposed_parameters_json TEXT NOT NULL DEFAULT '{}';");
}

export function appendAudit(
  actor: SessionUser,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
  ownTransaction = true
): void {
  const occurredAt = new Date().toISOString();
  const previous = db.prepare("SELECT event_hash FROM audit_events ORDER BY rowid DESC LIMIT 1").get() as { event_hash?: string } | undefined;
  const previousHash = previous?.event_hash ?? null;
  const payload = JSON.stringify({ occurredAt, actorId: actor.id, actorRole: actor.role, action, entityType, entityId, metadata, previousHash });
  const eventHash = createHash("sha256").update(payload).digest("hex");
  if (ownTransaction) db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO audit_events
      (id, occurred_at, actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata_json, previous_hash, event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), occurredAt, actor.id, actor.name, actor.role, action, entityType, entityId, JSON.stringify(metadata), previousHash, eventHash);
    if (ownTransaction) db.exec("COMMIT");
  } catch (error) {
    if (ownTransaction) db.exec("ROLLBACK");
    throw error;
  }
}

export function listEstimates(limit = 20): unknown[] {
  return db.prepare(`SELECT * FROM (
    SELECT id, created_at AS createdAt, actor_name AS actorName, court_id AS courtId,
      'case' AS entryType, case_type_id AS caseTypeId, stage,
      NULL AS serviceKind, NULL AS caseReference, status, total_millieme AS totalMillieme,
      refundable_millieme AS refundableMillieme
    FROM estimates
    UNION ALL
    SELECT id, created_at AS createdAt, actor_name AS actorName, court_id AS courtId,
      'service' AS entryType, NULL AS caseTypeId, NULL AS stage,
      service_kind AS serviceKind, case_reference AS caseReference, status,
      total_millieme AS totalMillieme, 0 AS refundableMillieme
    FROM service_estimates
  ) ORDER BY createdAt DESC LIMIT ?`).all(limit);
}

export function listAudit(limit = 50): unknown[] {
  return db.prepare(`SELECT id, occurred_at AS occurredAt, actor_name AS actorName, actor_role AS actorRole,
    action, entity_type AS entityType, entity_id AS entityId, metadata_json AS metadataJson,
    previous_hash AS previousHash, event_hash AS eventHash
    FROM audit_events ORDER BY occurred_at DESC LIMIT ?`).all(limit);
}

export function listCustomSources(): unknown[] {
  return db.prepare(`SELECT id, title, kind, status, effective_date AS effectiveDate,
    url, notes FROM custom_sources ORDER BY created_at DESC`).all();
}

export function saveCustomSource(
  source: { title: string; kind: string; status: string; effectiveDate?: string; url?: string; notes: string },
  actor: SessionUser
): Record<string, unknown> {
  const id = `custom-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO custom_sources
      (id, title, kind, status, effective_date, url, notes, created_at, actor_id, actor_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, source.title, source.kind, source.status, source.effectiveDate ?? null, source.url ?? null, source.notes, createdAt, actor.id, actor.name);
    appendAudit(actor, "SOURCE_CREATED", "legal_source", id, { title: source.title, kind: source.kind, status: source.status }, false);
    db.exec("COMMIT");
    return { id, ...source };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function listRuleChangeRequests(): RuleChangeRequest[] {
  const rows = db.prepare(`SELECT id, rule_code AS ruleCode, proposed_formula AS proposedFormula,
    proposed_parameters_json AS proposedParametersJson, effective_date AS effectiveDate, reason, source_ids_json AS sourceIdsJson, scope, court_id AS courtId, status,
    created_at AS createdAt, proposer_name AS proposerName, reviewed_at AS reviewedAt,
    reviewer_name AS reviewerName, review_note AS reviewNote, published_at AS publishedAt,
    publisher_name AS publisherName
    FROM rule_change_requests ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    ruleCode: String(row.ruleCode),
    proposedFormula: String(row.proposedFormula),
    proposedParameters: JSON.parse(String(row.proposedParametersJson ?? "{}")) as Record<string, number>,
    effectiveDate: String(row.effectiveDate),
    reason: String(row.reason),
    sourceIds: JSON.parse(String(row.sourceIdsJson)) as string[],
    scope: row.scope as RuleChangeRequest["scope"],
    courtId: row.courtId ? String(row.courtId) : undefined,
    status: row.status as RuleChangeRequest["status"],
    createdAt: String(row.createdAt),
    proposerName: String(row.proposerName),
    reviewedAt: row.reviewedAt ? String(row.reviewedAt) : undefined,
    reviewerName: row.reviewerName ? String(row.reviewerName) : undefined,
    reviewNote: row.reviewNote ? String(row.reviewNote) : undefined,
    publishedAt: row.publishedAt ? String(row.publishedAt) : undefined,
    publisherName: row.publisherName ? String(row.publisherName) : undefined
  }));
}

export function saveRuleChangeRequest(
  proposal: Pick<RuleChangeRequest, "ruleCode" | "proposedFormula" | "proposedParameters" | "effectiveDate" | "reason" | "sourceIds" | "scope" | "courtId">,
  actor: SessionUser
): RuleChangeRequest {
  const parameters = validateRuleParameters(proposal.ruleCode, proposal.proposedParameters);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(proposal.effectiveDate)) throw new Error("RULE_EFFECTIVE_DATE_REQUIRED");
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO rule_change_requests
      (id, rule_code, proposed_formula, proposed_parameters_json, effective_date, reason, source_ids_json, scope, court_id, status, created_at, proposer_id, proposer_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', ?, ?, ?)`).run(
      id, proposal.ruleCode, proposal.proposedFormula, JSON.stringify(parameters), proposal.effectiveDate,
      proposal.reason, JSON.stringify(proposal.sourceIds), proposal.scope, proposal.courtId ?? null, createdAt, actor.id, actor.name
    );
    appendAudit(actor, "RULE_CHANGE_PROPOSED", "rule_change", id, { ruleCode: proposal.ruleCode, sourceIds: proposal.sourceIds, scope: proposal.scope, courtId: proposal.courtId }, false);
    db.exec("COMMIT");
    return { id, ...proposal, status: "in_review", createdAt, proposerName: actor.name };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function reviewRuleChangeRequest(
  id: string,
  decision: RuleChangeDecision,
  reviewNote: string,
  actor: SessionUser
): RuleChangeRequest | undefined {
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare("SELECT status, proposer_id AS proposerId FROM rule_change_requests WHERE id = ?").get(id) as { status?: RuleChangeRequest["status"]; proposerId?: string } | undefined;
    if (!row?.status) { db.exec("ROLLBACK"); return undefined; }
    if (row.proposerId === actor.id) throw new Error("RULE_CHANGE_SELF_REVIEW_FORBIDDEN");
    const status = transitionRuleChange(row.status, decision);
    const reviewedAt = new Date().toISOString();
    db.prepare(`UPDATE rule_change_requests SET status = ?, reviewed_at = ?, reviewer_id = ?, reviewer_name = ?, review_note = ?
      WHERE id = ? AND status = 'in_review'`).run(status, reviewedAt, actor.id, actor.name, reviewNote, id);
    appendAudit(actor, status === "approved" ? "RULE_CHANGE_APPROVED" : "RULE_CHANGE_REJECTED", "rule_change", id, { reviewNote }, false);
    db.exec("COMMIT");
    return listRuleChangeRequests().find((item) => item.id === id);
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* transaction may already be closed */ }
    throw error;
  }
}

export function publishRuleChangeRequest(
  id: string,
  actor: SessionUser,
  configuredProjectManagerId: string
): RuleChangeRequest | undefined {
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare(`SELECT status, scope, court_id AS courtId, published_at AS publishedAt,
      rule_code AS ruleCode, proposed_parameters_json AS proposedParametersJson, effective_date AS effectiveDate
      FROM rule_change_requests WHERE id = ?`).get(id) as {
        status?: RuleChangeRequest["status"];
        scope?: RuleChangeRequest["scope"];
        courtId?: string;
        publishedAt?: string;
        ruleCode?: string;
        proposedParametersJson?: string;
        effectiveDate?: string;
      } | undefined;
    if (!row?.status || !row.scope) { db.exec("ROLLBACK"); return undefined; }
    if (row.publishedAt) throw new Error("RULE_CHANGE_ALREADY_PUBLISHED");
    transitionRulePublication(row.status);
    validateRuleParameters(row.ruleCode ?? "", JSON.parse(row.proposedParametersJson ?? "{}"));
    if (!row.effectiveDate) throw new Error("RULE_EFFECTIVE_DATE_REQUIRED");
    if (!canPublishRuleChange(actor, row.scope, row.courtId ?? undefined, configuredProjectManagerId)) {
      throw new Error("RULE_CHANGE_PUBLISH_FORBIDDEN");
    }
    const publishedAt = new Date().toISOString();
    db.prepare(`UPDATE rule_change_requests SET published_at = ?, publisher_id = ?, publisher_name = ?
      WHERE id = ? AND published_at IS NULL`).run(publishedAt, actor.id, actor.name, id);
    appendAudit(actor, "RULE_CHANGE_PUBLISHED", "rule_change", id, { ruleCode: row.ruleCode, scope: row.scope, courtId: row.courtId, effectiveDate: row.effectiveDate }, false);
    db.exec("COMMIT");
    return listRuleChangeRequests().find((item) => item.id === id);
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* transaction may already be closed */ }
    throw error;
  }
}

export interface EffectiveRuleConfiguration {
  config: JudicialFeeRuleConfig;
  version: string;
  appliedRuleChanges: NonNullable<CalculationResult["appliedRuleChanges"]>;
}

export function resolveEffectiveRuleConfiguration(courtId: string, calculationDate: string): EffectiveRuleConfiguration {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(calculationDate)) throw new Error("INVALID_DATE");
  const rows = db.prepare(`SELECT id, rule_code AS ruleCode, proposed_parameters_json AS proposedParametersJson,
      effective_date AS effectiveDate, scope, court_id AS courtId, published_at AS publishedAt
    FROM rule_change_requests
    WHERE published_at IS NOT NULL AND effective_date IS NOT NULL AND effective_date <= ?
      AND (scope = 'global' OR (scope = 'court' AND court_id = ?))
    ORDER BY effective_date DESC, published_at DESC, created_at DESC`).all(calculationDate, courtId) as Array<Record<string, unknown>>;

  const courtRules = new Map<string, Record<string, unknown>>();
  const globalRules = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const code = String(row.ruleCode);
    const target = row.scope === "court" ? courtRules : globalRules;
    if (!target.has(code)) target.set(code, row);
  }

  let config = structuredClone(DEFAULT_JUDICIAL_FEE_RULES);
  const appliedRuleChanges: NonNullable<CalculationResult["appliedRuleChanges"]> = [];
  const codes = new Set([...globalRules.keys(), ...courtRules.keys()]);
  for (const code of codes) {
    const row = courtRules.get(code) ?? globalRules.get(code);
    if (!row) continue;
    const parameters = JSON.parse(String(row.proposedParametersJson)) as Record<string, number>;
    config = applyRuleParameters(config, code, parameters);
    appliedRuleChanges.push({
      id: String(row.id),
      ruleCode: code,
      scope: row.scope as "court" | "global",
      courtId: row.courtId ? String(row.courtId) : undefined,
      effectiveDate: String(row.effectiveDate)
    });
  }
  const suffix = appliedRuleChanges.map((change) => `${change.scope === "court" ? "C" : "G"}-${change.id.slice(0, 8)}`).sort().join(".");
  return { config, version: suffix ? `${RULE_SET.version}+${suffix}` : RULE_SET.version, appliedRuleChanges };
}

export function dashboardSnapshot(): {
  assessedMillieme: number;
  collectedMillieme: number;
  outstandingMillieme: number;
  collectionRate: number;
  reportingCourts: number;
  byCourt: unknown[];
  trend: unknown[];
} {
  const totals = db.prepare(`SELECT COALESCE(SUM(assessed_millieme),0) assessed, COALESCE(SUM(collected_millieme),0) collected
    FROM collection_events`).get() as { assessed: number; collected: number };
  const byCourtRows = db.prepare(`SELECT court_id AS courtId, SUM(assessed_millieme) assessedMillieme,
    SUM(collected_millieme) collectedMillieme FROM collection_events GROUP BY court_id ORDER BY collectedMillieme DESC`).all() as Array<Record<string, unknown>>;
  const byCourt = byCourtRows.map((row) => ({
    ...row,
    courtName: courts.find((court) => court.id === row.courtId)?.name ?? row.courtId
  }));
  const trend = db.prepare(`SELECT substr(recorded_on,1,7) month, SUM(assessed_millieme) assessedMillieme,
    SUM(collected_millieme) collectedMillieme FROM collection_events GROUP BY month ORDER BY month`).all();
  return {
    assessedMillieme: totals.assessed,
    collectedMillieme: totals.collected,
    outstandingMillieme: totals.assessed - totals.collected,
    collectionRate: totals.assessed ? totals.collected / totals.assessed : 0,
    reportingCourts: byCourt.length,
    byCourt,
    trend
  };
}

function seedDemoCollections(): void {
  const row = db.prepare("SELECT COUNT(*) count FROM collection_events").get() as { count: number };
  if (row.count > 0) return;
  const insert = db.prepare(`INSERT INTO collection_events
    (id, court_id, recorded_on, assessed_millieme, collected_millieme, source) VALUES (?, ?, ?, ?, ?, 'demo-seed')`);
  const monthFactors = [0.82, 0.91, 1.02, 0.97, 1.11, 1.18];
  db.exec("BEGIN IMMEDIATE");
  try {
    courts.forEach((court, courtIndex) => {
      monthFactors.forEach((factor, monthIndex) => {
        const assessedPounds = Math.round((2_400_000 + courtIndex * 285_000) * factor);
        const collectionRatio = 0.78 + ((courtIndex + monthIndex) % 5) * 0.027;
        insert.run(randomUUID(), court.id, `2026-${String(monthIndex + 1).padStart(2, "0")}-28`, assessedPounds * 1000, Math.round(assessedPounds * collectionRatio) * 1000);
      });
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
