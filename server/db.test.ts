import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { calculateCourtServiceFees } from "../src/domain/service-fees.js";
import { calculateFees } from "../src/domain/calculate.js";
import { DEFAULT_RULE_PARAMETERS } from "../src/domain/rule-parameters.js";

const tempDirectory = mkdtempSync(join(tmpdir(), "judicial-fees-db-"));
process.env.JUDICIAL_FEES_DB_PATH = join(tempDirectory, "test.db");

const {
  db,
  listEstimates,
  listRuleChangeRequests,
  publishRuleChangeRequest,
  resolveEffectiveRuleConfiguration,
  reviewRuleChangeRequest,
  saveRuleChangeRequest,
  saveServiceEstimate
} = await import("./db.js");

afterAll(() => {
  db.close();
  rmSync(tempDirectory, { recursive: true, force: true });
  delete process.env.JUDICIAL_FEES_DB_PATH;
});

describe("unified estimate register", () => {
  it("lists a saved court service estimate with its service identity", () => {
    const input = { kind: "attestation", pageCount: 2 } as const;
    const result = calculateCourtServiceFees(input);
    const saved = saveServiceEstimate("cairo-north", input, result, {
      id: "test-estimator",
      name: "موظف اختبار",
      role: "estimator",
      courtId: "cairo-north"
    });

    expect(listEstimates(20)).toContainEqual(expect.objectContaining({
      id: saved.estimateId,
      entryType: "service",
      serviceKind: "attestation",
      courtId: "cairo-north",
      actorName: "موظف اختبار",
      totalMillieme: result.totalMillieme
    }));
  });

  it("persists court scope and publishes only after independent legal approval", () => {
    const supervisor = { id: "supervisor-north", name: "رئيس قلم شمال القاهرة", role: "supervisor" as const, courtId: "cairo-north" };
    const proposal = saveRuleChangeRequest({
      ruleCode: "ORIGINAL_RELATIVE",
      proposedFormula: "صيغة اختبار محلية موثقة",
      proposedParameters: { ...DEFAULT_RULE_PARAMETERS.ORIGINAL_RELATIVE, firstBandRateBasisPoints: 210 },
      effectiveDate: "2026-08-01",
      reason: "اختبار حوكمة النطاق المحلي للمحكمة",
      sourceIds: ["law-90-1944-amended-126-2009"],
      scope: "court",
      courtId: "cairo-north"
    }, supervisor);

    expect(listRuleChangeRequests().find((item) => item.id === proposal.id)).toMatchObject({ scope: "court", courtId: "cairo-north" });
    expect(() => publishRuleChangeRequest(proposal.id, supervisor, "demo-project-manager")).toThrow("RULE_CHANGE_NOT_APPROVED");

    reviewRuleChangeRequest(proposal.id, "approve", "تمت المراجعة القانونية المستقلة للاختبار", {
      id: "legal-1", name: "مراجع قانوني", role: "legal_reviewer"
    });

    expect(() => publishRuleChangeRequest(proposal.id, {
      id: "supervisor-giza", name: "رئيس قلم الجيزة", role: "supervisor", courtId: "giza-primary"
    }, "demo-project-manager")).toThrow("RULE_CHANGE_PUBLISH_FORBIDDEN");

    const published = publishRuleChangeRequest(proposal.id, supervisor, "demo-project-manager");
    expect(published?.publishedAt).toBeTruthy();
    expect(published?.publisherName).toBe(supervisor.name);
  });

  it("applies a court rule only to that court and lets the court override the global rule", () => {
    const reviewer = { id: "legal-runtime", name: "مراجع قواعد التشغيل", role: "legal_reviewer" as const };
    const manager = { id: "demo-project-manager", name: "مدير المشروع", role: "project_manager" as const };
    const supervisor = { id: "supervisor-north-runtime", name: "رئيس قلم شمال القاهرة", role: "supervisor" as const, courtId: "cairo-north" };

    const globalChange = saveRuleChangeRequest({
      ruleCode: "UNKNOWN_FIXED",
      proposedFormula: "ابتدائي 18 جنيهًا",
      proposedParameters: { ...DEFAULT_RULE_PARAMETERS.UNKNOWN_FIXED, primaryFeeMillieme: 18_000 },
      effectiveDate: "2026-08-01",
      reason: "اختبار تأثير التعديل العام على جميع المحاكم",
      sourceIds: ["law-90-1944-amended-126-2009"],
      scope: "global"
    }, manager);
    reviewRuleChangeRequest(globalChange.id, "approve", "اعتماد مستقل لاختبار التعديل العام", reviewer);
    publishRuleChangeRequest(globalChange.id, manager, manager.id);

    const courtChange = saveRuleChangeRequest({
      ruleCode: "UNKNOWN_FIXED",
      proposedFormula: "ابتدائي 20 جنيهًا",
      proposedParameters: { ...DEFAULT_RULE_PARAMETERS.UNKNOWN_FIXED, primaryFeeMillieme: 20_000 },
      effectiveDate: "2026-08-01",
      reason: "اختبار قصر التعديل على محكمة شمال القاهرة",
      sourceIds: ["law-90-1944-amended-126-2009"],
      scope: "court",
      courtId: "cairo-north"
    }, supervisor);
    reviewRuleChangeRequest(courtChange.id, "approve", "اعتماد مستقل لاختبار تعديل المحكمة", reviewer);
    publishRuleChangeRequest(courtChange.id, supervisor, manager.id);

    const cairoRules = resolveEffectiveRuleConfiguration("cairo-north", "2026-08-06");
    const gizaRules = resolveEffectiveRuleConfiguration("giza-primary", "2026-08-06");
    expect(cairoRules.config.unknownFixed.primaryFeeMillieme).toBe(20_000);
    expect(gizaRules.config.unknownFixed.primaryFeeMillieme).toBe(18_000);
    expect(resolveEffectiveRuleConfiguration("cairo-north", "2026-07-31").config.unknownFixed.primaryFeeMillieme).toBe(15_000);

    const input = {
      courtId: "cairo-north", caseTypeId: "expert", courtLevel: "primary", stage: "filing",
      valueKind: "unknown", claimStructure: "single", urgent: false, exempt: false, calculationDate: "2026-08-06"
    } as const;
    const cairoResult = calculateFees(input, new Date("2026-08-06T12:00:00Z"), cairoRules.config, cairoRules.version);
    const gizaResult = calculateFees({ ...input, courtId: "giza-primary" }, new Date("2026-08-06T12:00:00Z"), gizaRules.config, gizaRules.version);
    expect(cairoResult.lines[0]?.amountMillieme).toBe(20_000);
    expect(gizaResult.lines[0]?.amountMillieme).toBe(18_000);
  });
});
