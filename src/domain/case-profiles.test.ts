import { describe, expect, it } from "vitest";
import { calculateFees, poundsToMillieme } from "./calculate.js";
import { caseTypes } from "./catalog.js";
import type { EstimateInput } from "./types.js";

const base: EstimateInput = {
  courtId: "cairo-north",
  caseTypeId: "payment-order",
  courtLevel: "primary",
  stage: "filing",
  valueKind: "known",
  claimStructure: "single",
  claimAmountMillieme: poundsToMillieme(10_000),
  urgent: false,
  exempt: false,
  calculationDate: "2026-08-08"
};

describe("case-type legal profiles", () => {
  it("assigns every selectable case type an explicit legal profile and coverage state", () => {
    for (const caseType of caseTypes) {
      const classified = caseType as typeof caseType & {
        profileId?: string;
        coverage?: string;
        jurisdiction?: string;
        finalSettlementPolicy?: string;
      };

      expect(classified.profileId, caseType.name).toBeTruthy();
      expect(["calculable", "conditional", "blocked"], caseType.name).toContain(classified.coverage);
      expect(classified.jurisdiction, caseType.name).toBeTruthy();
      expect(classified.finalSettlementPolicy, caseType.name).toBeTruthy();
    }
  });

  it.each([
    ["payment-order", "relative-on-relief"],
    ["expert", "fixed-paid-at-filing"],
    ["family-maintenance", "exempt-all-stages"],
    ["criminal-misdemeanor", "criminal-on-conviction"],
    ["constitutional-action", "constitutional-guarantee"],
    ["execution-first", "operation-not-applicable"],
    ["workbook-146", "value-kind-dependent"],
    ["handover", "value-kind-dependent"],
    ["bankruptcy-restructuring", "legal-review-required"]
  ])("assigns %s the final-settlement policy %s", (id, policy) => {
    expect(caseTypes.find((caseType) => caseType.id === id)?.finalSettlementPolicy).toBe(policy);
  });

  it.each([
    ["انهاء عقد ايجار", "lease-termination", "conditional"],
    ["صحة توقيع", "signature-validity", "calculable"],
    ["افلاس", "bankruptcy-declaration", "conditional"],
    ["دعوي عمالية", "labour-dispute", "conditional"],
    ["تزوير اصلية", "original-forgery", "calculable"]
  ])("maps %s to %s rather than a generic relative/fixed label", (name, profileId, coverage) => {
    const item = caseTypes.find((caseType) => caseType.name === name) as (typeof caseTypes)[number] & {
      profileId?: string;
      coverage?: string;
    };

    expect(item).toBeTruthy();
    expect(item.profileId).toBe(profileId);
    expect(item.coverage).toBe(coverage);
  });

  it("classifies every current workbook alias into a named legal family", () => {
    const genericAliases = caseTypes
      .filter((caseType) => caseType.profileId === "generic-legal-review")
      .map((caseType) => caseType.name);

    expect(genericAliases).toEqual([]);
  });

  it.each([
    ["criminal-misdemeanor", "criminal", "criminal-proceeding"],
    ["constitutional-action", "constitutional", "constitutional-action"],
    ["state-council-annulment", "state-council", "state-council-annulment"],
    ["family-maintenance", "family", "family-maintenance"],
    ["economic-monetary", "economic", "economic-money-claim"],
    ["bankruptcy-restructuring", "bankruptcy", "bankruptcy-restructuring"],
    ["execution-substantive", "enforcement", "enforcement-dispute"]
  ])("includes the cross-jurisdiction type %s", (id, jurisdiction, profileId) => {
    const item = caseTypes.find((caseType) => caseType.id === id);
    expect(item).toBeTruthy();
    expect(item?.jurisdiction).toBe(jurisdiction);
    expect(item?.profileId).toBe(profileId);
  });

  it.each([
    ["civil-appeal-known", "appeal", "ordinary-appeal-known"],
    ["civil-appeal-unknown", "appeal", "ordinary-appeal-unknown"],
    ["civil-cassation", "cassation", "ordinary-cassation"]
  ])("adds the ordinary challenge route %s", (id, courtLevel, profileId) => {
    const item = caseTypes.find((caseType) => caseType.id === id);
    expect(item?.supportedCourtLevels).toContain(courtLevel);
    expect(item?.profileId).toBe(profileId);
  });

  it.each([
    ["family-divorce", "family-divorce-fixed"],
    ["family-parentage", "family-parentage-fixed"]
  ])("uses a dedicated personal-status fee profile for %s", (id, profileId) => {
    const item = caseTypes.find((caseType) => caseType.id === id);
    expect(item?.coverage).toBe("calculable");
    expect(item?.profileId).toBe(profileId);
    expect(item?.finalSettlementPolicy).toBe("fixed-paid-at-filing");
  });

  it.each([
    "article76-voluntary-sale",
    "article76-sale-conditions-objection",
    "article76-cancel-security",
    "article76-bankruptcy-third-party-opposition",
    "article76-arbitration-execution-order-unknown",
    "article76-arbitration-execution-grievance",
    "article76-expropriation-procedure-objection",
    "article76-final-distribution-objection",
    "article76-customs-administrative-opposition",
    "article76-unknown-instrument-enforcement",
    "article76-petition-order-grievance",
    "article76-consensual-division-confirmation",
    "article76-easement"
  ])("models the statutory unknown-value route %s explicitly", (id) => {
    const item = caseTypes.find((caseType) => caseType.id === id);
    expect(item?.profileId).toBe("article-76-unknown");
    expect(item?.coverage).toBe("calculable");
    expect(item?.allowedValueKinds).toEqual(["unknown"]);
    expect(item?.finalSettlementPolicy).toBe("fixed-paid-at-filing");
  });

  it("separates the recusal request fee profile from its refundable guarantee", () => {
    const item = caseTypes.find((caseType) => caseType.id === "article76-recusal");
    expect(item?.profileId).toBe("recusal-request");
    expect(item?.coverage).toBe("calculable");
    expect(item?.sourceIds).toContain("law-13-1968-civil-procedure");
  });

  it("gives judgment interpretation and correction a dedicated Article 22 refund profile", () => {
    const item = caseTypes.find((caseType) => caseType.id === "article76-judgment-interpretation-correction");
    expect(item?.profileId).toBe("article-76-judgment-correction");
    expect(item?.finalSettlementPolicy).toBe("fixed-paid-at-filing");
  });

  it.each([
    ["حق ارتفاق", "article-76-unknown", "unknown"],
    ["تفسيـر حكم", "article-76-judgment-correction", "unknown"],
    ["تفسـير حكم", "article-76-judgment-correction", "unknown"]
  ])("corrects the legacy Article 76 alias %s", (name, profileId, defaultValueKind) => {
    const item = caseTypes.find((caseType) => caseType.name === name);
    expect(item, name).toBeTruthy();
    expect(item?.profileId).toBe(profileId);
    expect(item?.coverage).toBe("calculable");
    expect(item?.defaultValueKind).toBe(defaultValueKind);
  });

  it("does not treat recovery of undue maintenance as an exempt maintenance claim", () => {
    const legacy = caseTypes.find((caseType) => caseType.name === "رد نفقة غير مستحقة");
    const curated = caseTypes.find((caseType) => caseType.id === "family-maintenance-recovery");
    expect(legacy?.profileId).toBe("family-maintenance-recovery");
    expect(legacy?.finalSettlementPolicy).toBe("relative-on-relief");
    expect(curated?.profileId).toBe("family-maintenance-recovery");
  });

  it.each([
    ["family-marriage-objection", "family-article49-five-action"],
    ["family-estate-manager-executor", "family-article49-ten-application"],
    ["family-marriage-notary-grievance", "family-article49-two-application"],
    ["family-death-inheritance-record", "family-article49-one-application"],
    ["family-estate-movables-sale-permission", "family-article49-point-two-application"],
    ["family-death-inheritance-lawsuit-known", "family-inheritance-share-known"],
    ["family-will-deposit", "family-will-deposit"],
    ["family-mutaa", "family-money-nonexempt"]
  ])("adds the Article 49 family route %s", (id, profileId) => {
    const item = caseTypes.find((caseType) => caseType.id === id);
    expect(item?.coverage).toBe("calculable");
    expect(item?.profileId).toBe(profileId);
    expect(item?.sourceIds).toContain("law-90-1944-amended-126-2009");
  });
});

describe("case type controls the calculation route", () => {
  it("rejects an unknown case type instead of applying the generic civil formula", () => {
    expect(() => calculateFees({ ...base, caseTypeId: "not-in-the-legal-catalog" }))
      .toThrow("UNKNOWN_CASE_TYPE");
  });

  it("rejects a value-kind choice that contradicts the selected case profile", () => {
    expect(() => calculateFees({
      ...base,
      caseTypeId: "payment-order",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    })).toThrow("CASE_TYPE_VALUE_KIND_MISMATCH");
  });

  it("stops a derived-value lease case until its case-specific facts are supported", () => {
    expect(() => calculateFees({
      ...base,
      caseTypeId: "eviction-rent"
    })).toThrow("CASE_TYPE_FACTS_REQUIRED");
  });

  it("allows a conditionally classified accounting case to settle on the explicit monetary relief awarded", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "workbook-146",
      stage: "final",
      finalOutcome: "judgment-partial",
      claimAmountMillieme: poundsToMillieme(10_000),
      awardedAmountMillieme: poundsToMillieme(5_000),
      prepaidOriginalMillieme: poundsToMillieme(100)
    });

    expect(result.lines[0]?.code).toBe("ORIGINAL_RELATIVE_SETTLEMENT");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(87.5));
    expect(result.assumptions.join(" ")).toContain("منطوق الحكم");
  });

  it("does not repeat a fixed fee for a conditionally classified non-monetary case at final judgment", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "handover",
      stage: "final",
      finalOutcome: "judgment-full",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined,
      prepaidOriginalMillieme: poundsToMillieme(15)
    });

    expect(result.totalMillieme).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it("derives an eviction claim from rent facts and uses the higher linked basis", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "eviction-rent",
      claimAmountMillieme: poundsToMillieme(1),
      caseFacts: {
        leaseMonthlyRentMillieme: poundsToMillieme(1_000),
        leaseMonthsForValuation: 12,
        leaseIncludesArrears: true,
        leaseArrearsMillieme: poundsToMillieme(15_000)
      }
    });

    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(687.5));
    expect(result.lines[0]?.basis).toContain("١٥٬٠٠٠");
    expect(result.assumptions.join(" ")).toContain("الأعلى");
  });

  it("does not reuse the first-instance civil formula for an appeal", () => {
    expect(() => calculateFees({
      ...base,
      courtLevel: "appeal"
    })).toThrow("CASE_TYPE_COURT_LEVEL_UNSUPPORTED");
  });

  it("calculates a known-value civil appeal on the appealed interest", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "civil-appeal-known",
      courtLevel: "appeal",
      claimAmountMillieme: poundsToMillieme(10_000)
    });

    expect(result.lines[0]?.code).toBe("ORIGINAL_RELATIVE_FILING");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(437.5));
    expect(result.assumptions.join(" ")).toContain("الجزء المطعون فيه");
  });

  it("uses the fixed appeal fee for an unknown-value ordinary appeal", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "civil-appeal-unknown",
      courtLevel: "appeal",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });

    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(30));
  });

  it("uses the Article 21 one-thousand-pound basis when a known-value appeal judgment is cancelled", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "civil-appeal-known",
      courtLevel: "appeal",
      stage: "final",
      finalOutcome: "appeal-cancelled",
      claimAmountMillieme: poundsToMillieme(10_000),
      prepaidOriginalMillieme: poundsToMillieme(10)
    });
    expect(result.lines[0]?.code).toBe("APPEAL_ARTICLE_21_SETTLEMENT");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(17.5));
    expect(result.lines[0]?.basis).toContain("١٬٠٠٠");
  });

  it("settles a modified known-value appeal on the greater of one thousand and the final award", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "civil-appeal-known",
      courtLevel: "appeal",
      stage: "final",
      finalOutcome: "appeal-modified",
      claimAmountMillieme: poundsToMillieme(10_000),
      awardedAmountMillieme: poundsToMillieme(5_000),
      prepaidOriginalMillieme: poundsToMillieme(27.5)
    });
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(160));
    expect(result.assumptions.join(" ")).toContain("الحكم الاستئنافي");
  });

  it("does not recharge an unknown-value appeal after its final disposition", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "civil-appeal-unknown",
      courtLevel: "appeal",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "appeal-modified"
    });
    expect(result.totalMillieme).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it("uses the documented fixed fee for an ordinary civil cassation", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "civil-cassation",
      courtLevel: "cassation",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });

    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(75));
  });

  it.each(["family-divorce", "family-parentage"])("uses the five-pound personal-status fee for %s", (caseTypeId) => {
    const result = calculateFees({
      ...base,
      caseTypeId,
      courtLevel: "primary",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });

    expect(result.lines[0]?.code).toBe("PERSONAL_STATUS_FIXED");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(5));
  });

  it("does not recharge the fixed divorce fee at final judgment", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "family-divorce",
      courtLevel: "primary",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "judgment-full"
    });

    expect(result.lines).toEqual([]);
    expect(result.totalMillieme).toBe(0);
  });

  it("charges the statutory fixed route for an Article 76 case and does not repeat it at final judgment", () => {
    const filing = calculateFees({
      ...base,
      caseTypeId: "article76-easement",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });
    const final = calculateFees({
      ...base,
      caseTypeId: "article76-easement",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "judgment-full"
    });

    expect(filing.lines[0]?.code).toBe("ORIGINAL_FIXED");
    expect(filing.lines[0]?.amountMillieme).toBe(poundsToMillieme(15));
    expect(final.lines).toEqual([]);
    expect(final.totalMillieme).toBe(0);
    expect(final.warnings.join(" ")).toContain("لا يُكرر");
  });

  it("accounts for the recusal guarantee as an escrow deposit and refunds it on acceptance", () => {
    const filing = calculateFees({
      ...base,
      caseTypeId: "article76-recusal",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });
    const accepted = calculateFees({
      ...base,
      caseTypeId: "article76-recusal",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "judgment-full"
    });

    const guarantee = filing.lines.find((line) => line.code === "RECUSAL_GUARANTEE");
    expect(guarantee?.amountMillieme).toBe(poundsToMillieme(300));
    expect(guarantee?.financialClass).toBe("deposit");
    expect(accepted.lines[0]?.financialClass).toBe("refund");
    expect(accepted.lines.map((line) => line.code)).toEqual([
      "RECUSAL_ORIGINAL_FEE_REFUND",
      "RECUSAL_SERVICES_FEE_REFUND",
      "RECUSAL_GUARANTEE_REFUND"
    ]);
    expect(accepted.refundableMillieme).toBe(poundsToMillieme(322.5));
    expect(accepted.totalMillieme).toBe(0);
  });

  it("refunds the original and services fees when a judgment interpretation or correction request is granted", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "article76-judgment-interpretation-correction",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "judgment-full"
    });
    expect(result.lines.map((line) => line.code)).toEqual([
      "JUDGMENT_CORRECTION_FEE_REFUND",
      "JUDGMENT_CORRECTION_SERVICES_REFUND"
    ]);
    expect(result.refundableMillieme).toBe(poundsToMillieme(22.5));
    expect(result.totalMillieme).toBe(0);
  });

  it.each([
    ["family-marriage-objection", 5],
    ["family-estate-manager-executor", 10],
    ["family-marriage-notary-grievance", 2],
    ["family-death-inheritance-record", 1],
    ["family-estate-movables-sale-permission", 0.2]
  ])("uses the dedicated Article 49 original fee for %s", (caseTypeId, expectedPounds) => {
    const result = calculateFees({
      ...base,
      caseTypeId,
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });
    expect(result.lines[0]?.code).toBe("PERSONAL_STATUS_ARTICLE_49_FIXED");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(expectedPounds));
  });

  it("multiplies consensual-divorce topics and adds extra acknowledgment sheets", () => {
    const topics = calculateFees({
      ...base,
      caseTypeId: "family-consensual-divorce-petition",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      caseFacts: { personalStatusUnitCount: 3 }
    });
    const sheets = calculateFees({
      ...base,
      caseTypeId: "family-parentage-acknowledgment-record",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      caseFacts: { personalStatusAdditionalSheets: 2 }
    });
    expect(topics.lines[0]?.amountMillieme).toBe(poundsToMillieme(3));
    expect(sheets.lines[0]?.amountMillieme).toBe(poundsToMillieme(1.4));
  });

  it("calculates the inheritance lawsuit on two percent of the claimant share and settles on the awarded share", () => {
    const filing = calculateFees({
      ...base,
      caseTypeId: "family-death-inheritance-lawsuit-known",
      claimAmountMillieme: poundsToMillieme(100_000)
    });
    const final = calculateFees({
      ...base,
      caseTypeId: "family-death-inheritance-lawsuit-known",
      stage: "final",
      finalOutcome: "judgment-partial",
      claimAmountMillieme: poundsToMillieme(100_000),
      awardedAmountMillieme: poundsToMillieme(60_000),
      prepaidOriginalMillieme: poundsToMillieme(1_000)
    });
    expect(filing.lines[0]?.amountMillieme).toBe(poundsToMillieme(2_000));
    expect(final.lines[0]?.amountMillieme).toBe(poundsToMillieme(200));
    expect(final.lines[0]?.calculation).toContain("2%");
  });

  it("calculates will preservation at half a percent after the statutory prior-fee deduction", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "family-will-deposit",
      claimAmountMillieme: poundsToMillieme(100_000),
      caseFacts: { personalStatusPriorFeeMillieme: poundsToMillieme(10) }
    });
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(490));
    expect(result.lines[0]?.calculation).toContain("0.5%");
  });

  it("treats maintenance recovery and mutaa as non-exempt monetary claims", () => {
    for (const caseTypeId of ["family-maintenance-recovery", "family-mutaa"]) {
      const result = calculateFees({ ...base, caseTypeId, claimAmountMillieme: poundsToMillieme(10_000) });
      expect(result.lines[0]?.code).toBe("ORIGINAL_RELATIVE_FILING");
      expect(result.totalMillieme).toBeGreaterThan(0);
    }
  });

  it("does not offer a fictitious final-settlement lifecycle for an Article 49 application", () => {
    expect(() => calculateFees({
      ...base,
      caseTypeId: "family-estate-manager-executor",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "judgment-full"
    })).toThrow("FINAL_STAGE_NOT_APPLICABLE_TO_OPERATION");
  });

  it("derives an agricultural property claim from seventy times the annual land tax", () => {
    const propertyCase = caseTypes.find((item) => item.profileId === "property-right");
    expect(propertyCase).toBeTruthy();

    const result = calculateFees({
      ...base,
      caseTypeId: propertyCase!.id,
      caseFacts: {
        propertyKind: "agricultural",
        propertyAnnualTaxMillieme: poundsToMillieme(100),
        propertyShareNumerator: 1,
        propertyShareDenominator: 1
      }
    });

    expect(result.input.claimAmountMillieme).toBe(poundsToMillieme(7_000));
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(287.5));
    expect(result.assumptions.join(" ")).toContain("70");
  });

  it("derives a built-property claim from fifteen times the annual rental value", () => {
    const propertyCase = caseTypes.find((item) => item.profileId === "property-right");
    const result = calculateFees({
      ...base,
      caseTypeId: propertyCase!.id,
      caseFacts: {
        propertyKind: "built",
        propertyAnnualRentalValueMillieme: poundsToMillieme(12_000),
        propertyShareNumerator: 1,
        propertyShareDenominator: 1
      }
    });

    expect(result.input.claimAmountMillieme).toBe(poundsToMillieme(180_000));
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(5_000));
    expect(result.assumptions.join(" ")).toContain("15");
  });

  it("uses the higher subject value in an exchange contract instead of adding both sides", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "contract-validity",
      caseFacts: {
        contractSubjectValueMillieme: poundsToMillieme(10_000),
        contractCounterValueMillieme: poundsToMillieme(15_000)
      }
    });

    expect(result.input.claimAmountMillieme).toBe(poundsToMillieme(15_000));
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(687.5));
    expect(result.assumptions.join(" ")).toContain("الأعلى");
  });

  it("derives a permanent periodic entitlement from twenty annual payments", () => {
    const periodicCase = caseTypes.find((item) => item.profileId === "pension-insurance");
    expect(periodicCase).toBeTruthy();
    const result = calculateFees({
      ...base,
      caseTypeId: periodicCase!.id,
      caseFacts: {
        periodicAnnualAmountMillieme: poundsToMillieme(12_000),
        periodicTerm: "permanent"
      }
    });

    expect(result.input.claimAmountMillieme).toBe(poundsToMillieme(240_000));
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(5_000));
    expect(result.assumptions.join(" ")).toContain("20");
  });

  it("applies the family-maintenance statutory exemption without a generic exemption switch", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "family-maintenance",
      claimAmountMillieme: poundsToMillieme(5_000)
    });

    expect(result.totalMillieme).toBe(0);
    expect(result.assumptions.join(" ")).toContain("المادة 3");
  });

  it.each([
    ["criminal-violation", 1.5],
    ["criminal-misdemeanor", 5],
    ["criminal-felony", 30],
    ["criminal-appeal", 10],
    ["criminal-cassation", 20]
  ])("uses the dedicated criminal fee for %s", (caseTypeId, amount) => {
    const result = calculateFees({
      ...base,
      caseTypeId,
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });

    expect(result.lines[0]?.code).toBe("CRIMINAL_ORIGINAL_FIXED");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(amount));
  });

  it("separates the constitutional fee from its refundable guarantee", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "constitutional-action",
      courtLevel: "cassation",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });

    expect(result.lines.find((line) => line.code === "CONSTITUTIONAL_ORIGINAL")?.amountMillieme).toBe(poundsToMillieme(25));
    expect(result.lines.find((line) => line.code === "CONSTITUTIONAL_GUARANTEE")?.amountMillieme).toBe(poundsToMillieme(25));
    expect(result.warnings.join(" ")).toContain("أمانة");
  });

  it("uses the dedicated State Council annulment fixed fee", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "state-council-annulment",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });

    expect(result.lines[0]?.code).toBe("STATE_COUNCIL_ANNULMENT");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(10));
  });

  it("does not invent a separate rate for a known-value economic case", () => {
    const result = calculateFees({ ...base, caseTypeId: "economic-monetary" });
    expect(result.lines[0]?.code).toBe("ORIGINAL_RELATIVE_FILING");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(437.5));
  });

  it("calculates first execution as one third of the original fee with its fixed surcharge", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "execution-first",
      caseFacts: { executionAmountMillieme: poundsToMillieme(10_000) }
    });

    expect(result.lines.find((line) => line.code === "EXECUTION_PRINCIPAL")?.amountMillieme).toBe(145_833);
    expect(result.lines.find((line) => line.code === "EXECUTION_FIXED_SURCHARGE")?.amountMillieme).toBe(poundsToMillieme(2.5));
  });

  it("calculates repeat execution as one ninth of the original and one third of the fixed surcharge", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "execution-repeat",
      caseFacts: { executionAmountMillieme: poundsToMillieme(10_000) }
    });

    expect(result.lines.find((line) => line.code === "EXECUTION_PRINCIPAL")?.amountMillieme).toBe(48_611);
    expect(result.lines.find((line) => line.code === "EXECUTION_FIXED_SURCHARGE")?.amountMillieme).toBe(833);
  });

  it("does not add the execution fixed surcharge below fifteen pounds", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "execution-first",
      caseFacts: { executionAmountMillieme: poundsToMillieme(10) }
    });

    expect(result.lines.find((line) => line.code === "EXECUTION_PRINCIPAL")?.amountMillieme).toBe(500);
    expect(result.lines.some((line) => line.code === "EXECUTION_FIXED_SURCHARGE")).toBe(false);
  });

  it("routes enforcement of a known arbitration award through execution fees", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "arbitration-award-execution",
      caseFacts: { executionAmountMillieme: poundsToMillieme(10_000) }
    });

    expect(result.lines[0]?.code).toBe("EXECUTION_PRINCIPAL");
    expect(result.assumptions.join(" ")).toContain("حكم التحكيم");
  });

  it("applies the 2025 Labour Law exemption only to the explicit employee-side route", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "labour-employee",
      calculationDate: "2026-08-08"
    });
    expect(result.totalMillieme).toBe(0);
    expect(result.assumptions.join(" ")).toContain("القانون 14 لسنة 2025");

    expect(() => calculateFees({
      ...base,
      caseTypeId: "labour-employee",
      calculationDate: "2025-08-31"
    })).toThrow("CASE_TYPE_EFFECTIVE_DATE_UNSUPPORTED");
  });

  it("does not extend the employee exemption to a claim filed by an employer", () => {
    const result = calculateFees({ ...base, caseTypeId: "labour-employer" });
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(437.5));
    expect(result.totalMillieme).toBeGreaterThan(0);
  });

  it("uses the special fixed fee for an explicit bankruptcy declaration request", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "bankruptcy-declaration-request",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    });
    expect(result.lines[0]?.code).toBe("BANKRUPTCY_DECLARATION_FIXED");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(50));
  });

  it("asks the claimant side before applying an exemption to a workbook labour alias", () => {
    const labourAlias = caseTypes.find((item) => item.name === "دعوي عمالية");
    const employeeResult = calculateFees({
      ...base,
      caseTypeId: labourAlias!.id,
      caseFacts: { labourClaimantRole: "employee", labourArisesUnderLaw14: true }
    });
    expect(employeeResult.totalMillieme).toBe(0);

    const employerResult = calculateFees({
      ...base,
      caseTypeId: labourAlias!.id,
      caseFacts: { labourClaimantRole: "employer", labourArisesUnderLaw14: true }
    });
    expect(employerResult.lines[0]?.amountMillieme).toBe(poundsToMillieme(437.5));
  });

  it("derives a company dispute from the financial interest actually in dispute", () => {
    const companyCase = caseTypes.find((item) => item.profileId === "company-dispute");
    const result = calculateFees({
      ...base,
      caseTypeId: companyCase!.id,
      caseFacts: { companyInterestValueMillieme: poundsToMillieme(10_000) }
    });
    expect(result.input.claimAmountMillieme).toBe(poundsToMillieme(10_000));
    expect(result.assumptions.join(" ")).toContain("المصلحة المالية");
  });
});
