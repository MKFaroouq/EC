import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { calculateFees } from "../src/domain/calculate.js";
import { caseTypes, courts, legalSources, RULE_SET, ruleRegister } from "../src/domain/catalog.js";
import { canProposeRuleChange } from "../src/domain/governance.js";
import { formatRuleFormula, validateRuleParameters } from "../src/domain/rule-parameters.js";
import { calculateCourtServiceFees, type CourtServiceInput } from "../src/domain/service-fees.js";
import type { EstimateInput } from "../src/domain/types.js";
import { authorize, createDemoToken, isDemoLoginEnabled, PROJECT_MANAGER_ID, type AuthenticatedRequest, type Role } from "./auth.js";
import { appendAudit, dashboardSnapshot, listAudit, listCustomSources, listEstimates, listRuleChangeRequests, publishRuleChangeRequest, resolveEffectiveRuleConfiguration, reviewRuleChangeRequest, saveCustomSource, saveEstimate, saveRuleChangeRequest, saveServiceEstimate } from "./db.js";
import { serviceInputSchema } from "./service-schema.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization", "body.token"] },
  trustProxy: false,
  bodyLimit: 128 * 1024,
  requestIdHeader: "x-request-id"
});

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
});
await app.register(cors, {
  origin: process.env.NODE_ENV === "production" ? false : ["http://127.0.0.1:4173", "http://localhost:4173"],
  credentials: false
});
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

const demoCredentialSchema = z.object({
  username: z.string().trim().min(3).max(80),
  password: z.string().min(8).max(128)
}).strict();
const calculationSchema = z.object({
  courtId: z.string().min(1).max(80),
  caseTypeId: z.string().min(1).max(100),
  courtLevel: z.enum(["partial", "primary", "appeal", "cassation"]),
  stage: z.enum(["filing", "final"]),
  finalOutcome: z.enum([
    "judgment-full", "judgment-partial", "rejected", "inadmissible", "settled", "abandoned",
    "struck", "lapsed", "deemed-never-filed", "criminal-conviction", "criminal-acquittal", "constitutional-accepted",
    "constitutional-rejected", "constitutional-inadmissible", "cassation-referral",
    "appeal-affirmed", "appeal-modified", "appeal-cancelled"
  ]).optional(),
  finalTiming: z.enum([
    "first-session-before-pleading", "before-dispositive-judgment", "after-dispositive-judgment"
  ]).optional(),
  valueKind: z.enum(["known", "unknown"]),
  claimStructure: z.enum(["single", "same-basis", "different-bases", "rent-termination", "unsure"]),
  claimAmountMillieme: z.number().int().min(0).max(10_000_000_000_000).optional(),
  awardedAmountMillieme: z.number().int().min(0).max(10_000_000_000_000).optional(),
  prepaidOriginalMillieme: z.number().int().min(0).max(10_000_000_000_000).optional(),
  settlementAmountMillieme: z.number().int().min(0).max(10_000_000_000_000).optional(),
  settlementHasKnownExecutableTerms: z.boolean().optional(),
  settlementReducedFeeCase: z.boolean().optional(),
  finalClaims: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(200),
    requestKind: z.enum(["original", "additional", "incidental", "intervention"]),
    valueKind: z.enum(["known", "unknown"]),
    disposition: z.enum(["awarded-full", "awarded-partial", "rejected", "inadmissible", "ended-without-merits"]),
    aggregation: z.enum(["sum-same-basis", "separate-basis", "higher-of-related"]),
    groupKey: z.string().trim().min(1).max(80),
    claimedAmountMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    awardedAmountMillieme: z.number().int().min(0).max(10_000_000_000_000).optional()
  }).strict()).max(100).optional(),
  finalAccruals: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(200),
    kind: z.enum(["rent", "yield", "daily-compensation", "interest"]),
    filingBasisMillieme: z.number().int().min(0).max(10_000_000_000_000),
    accruedToJudgmentMillieme: z.number().int().positive().max(10_000_000_000_000)
  }).strict()).max(100).optional(),
  urgent: z.boolean(),
  exempt: z.boolean(),
  exemptionReason: z.string().trim().max(500).optional(),
  feeRelief: z.object({
    applicant: z.enum([
      "ordinary-person", "government", "independent-public-body", "worker-or-beneficiary",
      "social-insurance-authority", "social-insured-or-beneficiary", "universal-health-authority",
      "universal-health-insured", "nasser-social-bank", "disabled-person",
      "national-disability-council", "childhood-motherhood-council"
    ]),
    legalAidDecision: z.enum(["none", "full", "partial"]).optional(),
    governmentActionFiledByGovernment: z.boolean().optional(),
    disabilityCardVerified: z.boolean().optional(),
    disabilityRightsDispute: z.boolean().optional(),
    socialInsuranceLawDispute: z.boolean().optional(),
    universalHealthLawDispute: z.boolean().optional(),
    protectedEntityLawDispute: z.boolean().optional(),
    reductionContext: z.enum([
      "none", "return-invalid-proceedings", "return-invalid-summons", "appeal-deemed-never-filed",
      "default-judgment-opposition", "fee-list-opposition", "provisional-distribution-objection",
      "return-after-strike"
    ]).optional(),
    sameSubjectAndParties: z.boolean().optional()
  }).strict().optional(),
  calculationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  caseFacts: z.object({
    leaseMonthlyRentMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    leaseMonthsForValuation: z.number().int().positive().max(1200).optional(),
    leaseIncludesArrears: z.boolean().optional(),
    leaseArrearsMillieme: z.number().int().min(0).max(10_000_000_000_000).optional(),
    contractSubjectValueMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    contractCounterValueMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    propertyKind: z.enum(["agricultural", "built"]).optional(),
    propertyAnnualTaxMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    propertyAnnualRentalValueMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    propertyShareNumerator: z.number().int().positive().max(100_000).optional(),
    propertyShareDenominator: z.number().int().positive().max(100_000).optional(),
    periodicAnnualAmountMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    periodicTerm: z.enum(["permanent", "life", "temporary"]).optional(),
    periodicYears: z.number().int().positive().max(10).optional(),
    stateCouncilIncludesStay: z.boolean().optional(),
    executionAmountMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    labourClaimantRole: z.enum(["employee", "employer", "other"]).optional(),
    labourArisesUnderLaw14: z.boolean().optional(),
    companyInterestValueMillieme: z.number().int().positive().max(10_000_000_000_000).optional(),
    personalStatusUnitCount: z.number().int().positive().max(1000).optional(),
    personalStatusAdditionalSheets: z.number().int().min(0).max(100_000).optional(),
    personalStatusPriorFeeMillieme: z.number().int().min(0).max(10_000_000_000_000).optional(),
    taxKind: z.enum(["income-profit-assessment", "value-added", "stamp", "real-estate", "customs", "other"]).optional(),
    taxRoute: z.enum(["court-action", "appeal-committee", "termination-committee"]).optional(),
    taxDisputedPeriods: z.array(z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(120),
      disputedProfitMillieme: z.number().int().positive().max(10_000_000_000_000)
    }).strict()).max(50).optional()
  }).strict().optional()
}).strict();
const serviceCalculationSchema = z.object({
  courtId: z.string().min(1).max(80),
  service: serviceInputSchema
}).strict();
const sourceSchema = z.object({
  title: z.string().trim().min(5).max(300),
  kind: z.enum(["law", "regulation", "circular", "judgment", "research", "workbook", "legacy-screen"]),
  status: z.enum(["primary", "supporting", "incomplete", "operational-only"]),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  url: z.string().url().max(1000).refine((value) => value.startsWith("https://"), "HTTPS_REQUIRED").optional(),
  notes: z.string().trim().min(10).max(2000)
}).strict();
const ruleChangeSchema = z.object({
  ruleCode: z.string().trim().min(2).max(100),
  proposedFormula: z.string().trim().min(5).max(2000).optional(),
  proposedParameters: z.record(z.string().min(1).max(100), z.number().int()).refine((value) => Object.keys(value).length > 0),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(10).max(2000),
  sourceIds: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  scope: z.enum(["court", "global"]),
  courtId: z.string().min(1).max(80).optional()
}).strict();
const ruleReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reviewNote: z.string().trim().min(10).max(2000)
}).strict();

app.get("/api/health", async () => ({ status: "ok", service: "judicial-fees-api", ruleSetVersion: RULE_SET.version }));

app.post("/api/auth/demo", { config: { rateLimit: { max: 15, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!isDemoLoginEnabled()) return reply.code(404).send({ error: "NOT_FOUND" });
  const parsed = demoCredentialSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_CREDENTIALS" });
  const session = await createDemoToken(parsed.data.username, parsed.data.password);
  if (!session) return reply.code(401).send({ error: "INVALID_CREDENTIALS", message: "اسم المستخدم أو كلمة المرور غير صحيحة." });
  return session;
});

app.get("/api/me", { preHandler: authorize(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]) }, async (request) => ({
  user: (request as AuthenticatedRequest).user
}));

app.get("/api/catalog", { preHandler: authorize(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]) }, async () => ({
  ruleSet: RULE_SET,
  courts,
  caseTypes,
  legalSources: [...legalSources, ...listCustomSources()],
  ruleRegister
}));

app.post("/api/sources", {
  preHandler: authorize(["legal_reviewer"]),
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
}, async (request, reply) => {
  const parsed = sourceSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_SOURCE", fields: z.flattenError(parsed.error).fieldErrors });
  const source = saveCustomSource(parsed.data, (request as AuthenticatedRequest).user);
  return reply.code(201).send(source);
});

app.get("/api/rule-change-requests", { preHandler: authorize(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]) }, async () => ({
  items: listRuleChangeRequests()
}));

app.post("/api/rule-change-requests", {
  preHandler: authorize(["supervisor", "project_manager"]),
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
}, async (request, reply) => {
  const parsed = ruleChangeSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_RULE_CHANGE", fields: z.flattenError(parsed.error).fieldErrors });
  if (!ruleRegister.some((rule) => rule.code === parsed.data.ruleCode)) return reply.code(400).send({ error: "RULE_NOT_FOUND" });
  const actor = (request as AuthenticatedRequest).user;
  const scopedCourtId = parsed.data.scope === "court" ? parsed.data.courtId : undefined;
  if (!canProposeRuleChange(actor, parsed.data.scope, scopedCourtId, PROJECT_MANAGER_ID)) {
    return reply.code(403).send({ error: "RULE_CHANGE_SCOPE_FORBIDDEN" });
  }
  if (scopedCourtId && !courts.some((court) => court.id === scopedCourtId && court.active)) {
    return reply.code(400).send({ error: "INVALID_COURT" });
  }
  const availableSources = new Set([...legalSources, ...listCustomSources() as Array<{ id: string }>].map((source) => source.id));
  if (parsed.data.sourceIds.some((id) => !availableSources.has(id))) return reply.code(400).send({ error: "SOURCE_NOT_FOUND" });
  try {
    const proposedParameters = validateRuleParameters(parsed.data.ruleCode, parsed.data.proposedParameters);
    const proposedFormula = formatRuleFormula(parsed.data.ruleCode, proposedParameters);
    return reply.code(201).send(saveRuleChangeRequest({ ...parsed.data, proposedFormula, proposedParameters, courtId: scopedCourtId }, actor));
  } catch (error) {
    return reply.code(400).send({ error: error instanceof Error ? error.message : "RULE_PARAMETERS_INVALID" });
  }
});

app.post("/api/rule-change-requests/:id/publish", {
  preHandler: authorize(["supervisor", "project_manager"]),
  config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
}, async (request, reply) => {
  const id = (request.params as { id: string }).id;
  try {
    const published = publishRuleChangeRequest(id, (request as AuthenticatedRequest).user, PROJECT_MANAGER_ID);
    if (!published) return reply.code(404).send({ error: "RULE_CHANGE_NOT_FOUND" });
    return reply.send(published);
  } catch (error) {
    const code = error instanceof Error ? error.message : "RULE_CHANGE_PUBLISH_FAILED";
    const status = code === "RULE_CHANGE_PUBLISH_FORBIDDEN" ? 403 : 409;
    return reply.code(status).send({ error: code });
  }
});

app.post("/api/rule-change-requests/:id/review", {
  preHandler: authorize(["legal_reviewer"]),
  config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
}, async (request, reply) => {
  const parsed = ruleReviewSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_RULE_REVIEW", fields: z.flattenError(parsed.error).fieldErrors });
  const id = (request.params as { id: string }).id;
  try {
    const reviewed = reviewRuleChangeRequest(id, parsed.data.decision, parsed.data.reviewNote, (request as AuthenticatedRequest).user);
    if (!reviewed) return reply.code(404).send({ error: "RULE_CHANGE_NOT_FOUND" });
    return reply.send(reviewed);
  } catch (error) {
    if (error instanceof Error && error.message === "RULE_CHANGE_ALREADY_REVIEWED") return reply.code(409).send({ error: error.message });
    throw error;
  }
});

app.post("/api/calculate", {
  preHandler: authorize(["estimator", "supervisor"]),
  config: { rateLimit: { max: 40, timeWindow: "1 minute" } }
}, async (request, reply) => {
  const parsed = calculationSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", fields: z.flattenError(parsed.error).fieldErrors });
  if (!courts.some((court) => court.id === parsed.data.courtId && court.active)) return reply.code(400).send({ error: "INVALID_COURT" });
  if (!caseTypes.some((caseType) => caseType.id === parsed.data.caseTypeId)) return reply.code(400).send({ error: "INVALID_CASE_TYPE" });
  try {
    const input = parsed.data as EstimateInput;
    const effectiveRules = resolveEffectiveRuleConfiguration(input.courtId, input.calculationDate);
    const baseCalculation = calculateFees(input, new Date(), effectiveRules.config, effectiveRules.version);
    const calculated = {
      ...baseCalculation,
      appliedRuleChanges: effectiveRules.appliedRuleChanges,
      assumptions: [
        ...baseCalculation.assumptions,
        ...(effectiveRules.appliedRuleChanges.length > 0
          ? effectiveRules.appliedRuleChanges.map((change) => `طُبق تعديل ${change.ruleCode} بنطاق ${change.scope === "court" ? "المحكمة" : "عام"} الساري من ${change.effectiveDate}.`)
          : ["لم توجد تعديلات محلية أو عامة منشورة سارية في تاريخ الحساب؛ طُبق الإصدار الأساسي."])
      ]
    };
    return reply.code(201).send(saveEstimate(input, calculated, (request as AuthenticatedRequest).user));
  } catch (error) {
    request.log.warn({ error }, "calculation rejected");
    return reply.code(400).send({ error: error instanceof Error ? error.message : "CALCULATION_FAILED" });
  }
});

app.post("/api/calculate-service", {
  preHandler: authorize(["estimator", "supervisor"]),
  config: { rateLimit: { max: 40, timeWindow: "1 minute" } }
}, async (request, reply) => {
  const parsed = serviceCalculationSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_SERVICE_INPUT", fields: z.flattenError(parsed.error).fieldErrors });
  if (!courts.some((court) => court.id === parsed.data.courtId && court.active)) return reply.code(400).send({ error: "INVALID_COURT" });
  try {
    const input = parsed.data.service as CourtServiceInput;
    const calculated = calculateCourtServiceFees(input);
    return reply.code(201).send(saveServiceEstimate(parsed.data.courtId, input, calculated, (request as AuthenticatedRequest).user));
  } catch (error) {
    request.log.warn({ error }, "service calculation rejected");
    return reply.code(400).send({ error: error instanceof Error ? error.message : "SERVICE_CALCULATION_FAILED" });
  }
});

app.get("/api/estimates", { preHandler: authorize(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]) }, async () => ({ items: listEstimates() }));
app.get("/api/dashboard", { preHandler: authorize(["supervisor", "legal_reviewer", "project_manager", "leader"]) }, async () => ({
  ...dashboardSnapshot(),
  dataStatus: "demo",
  asOf: "2026-06-30",
  note: "مؤشرات تجريبية منفصلة عن تقديرات الرسوم، وتستبدل بتكامل نظام التحصيل الفعلي."
}));
app.get("/api/audit", { preHandler: authorize(["supervisor", "legal_reviewer", "project_manager", "leader"]) }, async () => ({ items: listAudit() }));

if (process.env.NODE_ENV === "production") {
  const webRoot = resolve("dist/web");
  if (!existsSync(webRoot)) throw new Error("Run pnpm build before starting production");
  await app.register(fastifyStatic, { root: webRoot });
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) return reply.code(404).send({ error: "NOT_FOUND" });
    return reply.sendFile("index.html");
  });
}

app.setErrorHandler((error, request, reply) => {
  request.log.error({ error }, "unhandled request error");
  reply.code(500).send({ error: "INTERNAL_ERROR", requestId: request.id });
});

const port = Number(process.env.PORT ?? 4174);
await app.listen({ host: "127.0.0.1", port });
