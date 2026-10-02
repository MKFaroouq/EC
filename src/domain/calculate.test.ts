import { describe, expect, it } from "vitest";
import {
  calculateCourtBuildingsFee,
  calculateFees,
  calculateProgressiveRelative,
  filingCollectionCap,
  poundsToMillieme,
  unknownValueFee
} from "./calculate.js";
import type { EstimateInput } from "./types.js";
import { DEFAULT_JUDICIAL_FEE_RULES } from "./rule-parameters.js";

const base: EstimateInput = {
  courtId: "cairo-north",
  caseTypeId: "payment-order",
  courtLevel: "primary",
  stage: "filing",
  valueKind: "known",
  claimStructure: "single",
  claimAmountMillieme: poundsToMillieme(40_000),
  urgent: false,
  exempt: false,
  calculationDate: "2026-08-06"
};

describe("progressive judicial fee", () => {
  it.each([
    [0, 0],
    [5, 0.5],
    [250, 5],
    [2_000, 57.5],
    [4_000, 137.5],
    [40_000, 1_937.5]
  ])("calculates the boundary %s", (pounds, expected) => {
    expect(calculateProgressiveRelative(poundsToMillieme(pounds))).toBe(poundsToMillieme(expected));
  });

  it("rounds the value basis up to a whole pound", () => {
    expect(calculateProgressiveRelative(poundsToMillieme(250.01))).toBe(poundsToMillieme(5.03));
  });

  it.each([
    [40_000, 1_000],
    [40_001, 2_000],
    [100_001, 5_000],
    [1_000_001, 10_000]
  ])("selects filing cap for %s", (pounds, expected) => {
    expect(filingCollectionCap(poundsToMillieme(pounds))).toBe(poundsToMillieme(expected));
  });
});

describe("tax-profit assessment disputes", () => {
  it("calculates every tax period on a separate progressive basis, then applies the article 6 half rate", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "tax-profit-assessment-dispute",
      claimAmountMillieme: poundsToMillieme(255),
      caseFacts: {
        taxKind: "income-profit-assessment",
        taxRoute: "court-action",
        taxDisputedPeriods: [
          { id: "2023", label: "2023", disputedProfitMillieme: poundsToMillieme(5) },
          { id: "2024", label: "2024", disputedProfitMillieme: poundsToMillieme(250) }
        ]
      }
    });

    const original = result.lines.find((line) => line.code === "TAX_PROFIT_PERIODS_ORIGINAL");
    expect(original?.amountMillieme).toBe(poundsToMillieme(2.75));
    expect(original?.basis).toContain("2023");
    expect(original?.basis).toContain("2024");
    expect(result.treatment?.ruleId).toBe("law90-article6-half");
  });

  it("refuses to price a tax committee request as though it were a court filing", () => {
    expect(() => calculateFees({
      ...base,
      caseTypeId: "tax-profit-assessment-dispute",
      caseFacts: {
        taxKind: "income-profit-assessment",
        taxRoute: "termination-committee",
        taxDisputedPeriods: [
          { id: "2024", label: "2024", disputedProfitMillieme: poundsToMillieme(250) }
        ]
      }
    })).toThrow("TAX_ROUTE_NOT_JUDICIAL_FILING");
  });
});

describe("fixed and complementary fees", () => {
  it("uses a governed runtime configuration instead of hard-coded court values", () => {
    const configured = structuredClone(DEFAULT_JUDICIAL_FEE_RULES);
    configured.unknownFixed.primaryFeeMillieme = poundsToMillieme(20);
    configured.servicesFundRateBasisPoints = 4_000;
    configured.lawyer.primaryFeeMillieme = poundsToMillieme(80);

    const result = calculateFees({
      ...base,
      caseTypeId: "expert",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    }, new Date("2026-08-06T12:00:00Z"), configured, "2026.2+court-change-1");

    expect(result.ruleSetVersion).toBe("2026.2+court-change-1");
    expect(result.lines.find((line) => line.code === "ORIGINAL_FIXED")?.amountMillieme).toBe(poundsToMillieme(20));
    expect(result.lines.find((line) => line.code === "SERVICES_FUND")?.amountMillieme).toBe(poundsToMillieme(8));
    expect(result.lines.find((line) => line.code === "LAWYER_FEE")?.amountMillieme).toBe(poundsToMillieme(80));
  });

  it.each([
    ["partial", "known", 3, 0],
    ["partial", "known", 3.001, 0.5],
    ["partial", "known", 100, 0.5],
    ["partial", "known", 100.001, 1.5],
    ["partial", "unknown", undefined, 1.5],
    ["primary", "known", 40_000, 1.5],
    ["appeal", "known", 40_000, 3],
    ["cassation", "known", 40_000, 6]
  ] as const)(
    "calculates the court-buildings fee for %s %s at %s",
    (courtLevel, valueKind, claimAmount, expected) => {
      expect(calculateCourtBuildingsFee(courtLevel, valueKind, claimAmount === undefined ? undefined : poundsToMillieme(claimAmount)))
        .toBe(poundsToMillieme(expected));
    }
  );

  it("rejects a missing value basis when calculating a known-value court-buildings fee", () => {
    expect(() => calculateCourtBuildingsFee("partial", "known", undefined)).toThrow("CLAIM_AMOUNT_REQUIRED");
  });

  it("adds the court-buildings fee only when filing the claim", () => {
    const filing = calculateFees(base);
    const settlement = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "judgment-partial",
      awardedAmountMillieme: poundsToMillieme(10_000),
      prepaidOriginalMillieme: poundsToMillieme(300)
    });

    expect(filing.lines.find((line) => line.code === "COURT_BUILDINGS_FEE")?.amountMillieme)
      .toBe(poundsToMillieme(1.5));
    expect(settlement.lines.some((line) => line.code === "COURT_BUILDINGS_FEE")).toBe(false);
  });

  it("uses 15 pounds for an unknown-value primary claim", () => {
    expect(unknownValueFee("primary", false)).toBe(poundsToMillieme(15));
  });

  it("does not apply the martyrs stamp when the service fee equals 15", () => {
    const result = calculateFees({ ...base, caseTypeId: "expert", valueKind: "unknown", claimAmountMillieme: undefined });
    expect(result.lines.some((line) => line.code === "MARTYRS_STAMP")).toBe(false);
    expect(result.totalMillieme).toBe(poundsToMillieme(99));
  });

  it("does not generalize the martyrs stamp to every claim filing without an applicability map", () => {
    const result = calculateFees(base);
    expect(result.lines.map((line) => line.code)).toEqual([
      "ORIGINAL_RELATIVE_FILING",
      "SERVICES_FUND",
      "COURT_BUILDINGS_FEE",
      "LAWYER_FEE"
    ]);
    expect(result.totalMillieme).toBe(poundsToMillieme(1_576.5));
    expect(result.warnings.join(" ")).toContain("طابع صندوق تكريم الشهداء");
  });

  it("settles on the amount awarded after subtracting the prepaid original fee", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "judgment-partial",
      awardedAmountMillieme: poundsToMillieme(10_000),
      prepaidOriginalMillieme: poundsToMillieme(300)
    });
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(137.5));
  });

  it("does not create complementary fees when the final judgment awards nothing", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "rejected",
      awardedAmountMillieme: 0
    });
    expect(result.totalMillieme).toBe(0);
    expect(result.lines.some((line) => line.code === "LAWYER_FEE")).toBe(false);
  });

  it("requires legal review when multiple claims arise from different legal bases", () => {
    const input: EstimateInput = { ...base, claimStructure: "different-bases" };
    expect(() => calculateFees(input)).toThrow("LEGAL_REVIEW_REQUIRED_MULTIPLE_CLAIMS");
  });

  it("records the shared legal basis assumption for aggregated multiple claims", () => {
    const input: EstimateInput = { ...base, claimStructure: "same-basis" };
    const result = calculateFees(input);
    expect(result.assumptions).toContain("الطلبات المتعددة ناشئة عن سند قانوني واحد، ولذلك حُسب الرسم على مجموعها المدخل.");
  });

  it("requires legal review for a final settlement of an unknown-value claim", () => {
    expect(() => calculateFees({
      ...base,
      caseTypeId: "expert",
      stage: "final",
      finalOutcome: "judgment-partial",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined
    })).toThrow("LEGAL_REVIEW_REQUIRED_UNKNOWN_FINAL");
  });

  it("requires an explicit procedural outcome for final settlement", () => {
    expect(() => calculateFees({
      ...base,
      stage: "final",
      awardedAmountMillieme: poundsToMillieme(10_000)
    })).toThrow("FINAL_OUTCOME_REQUIRED");
  });

  it("uses the legally derived property value when the final judgment grants the whole claim", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "workbook-210",
      stage: "final",
      finalOutcome: "judgment-full",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined,
      prepaidOriginalMillieme: poundsToMillieme(5_000),
      caseFacts: {
        propertyKind: "built",
        propertyAnnualRentalValueMillieme: poundsToMillieme(12_000),
        propertyShareNumerator: 1,
        propertyShareDenominator: 1
      }
    });

    expect(result.lines[0]?.code).toBe("ORIGINAL_RELATIVE_SETTLEMENT");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(3_937.5));
    expect(result.lines[0]?.basis).toContain("١٨٠٬٠٠٠");
  });

  it("refunds three quarters of the original fee paid for a first-session abandonment", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "abandoned",
      finalTiming: "first-session-before-pleading",
      awardedAmountMillieme: undefined,
      prepaidOriginalMillieme: poundsToMillieme(1_000)
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.code).toBe("ORIGINAL_EARLY_ENDING_ADJUSTMENT");
    expect(result.lines[0]?.amountMillieme).toBe(-poundsToMillieme(750));
    expect(result.totalMillieme).toBe(0);
    expect(result.refundableMillieme).toBe(poundsToMillieme(750));
    expect(result.warnings.join(" ")).toContain("رد");
  });

  it("charges half the full original fee for a recorded settlement before any dispositive or preliminary judgment", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "settled",
      finalTiming: "before-dispositive-judgment",
      awardedAmountMillieme: undefined,
      prepaidOriginalMillieme: poundsToMillieme(300)
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.code).toBe("ORIGINAL_SETTLEMENT_ADJUSTMENT");
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(668.75));
  });

  it("uses the Article 20 one-thousand-pound basis when a claim above one thousand settles below it", () => {
    const result = calculateFees({
      ...base,
      claimAmountMillieme: poundsToMillieme(10_000),
      stage: "final",
      finalOutcome: "settled",
      finalTiming: "before-dispositive-judgment",
      settlementAmountMillieme: poundsToMillieme(500),
      prepaidOriginalMillieme: poundsToMillieme(10)
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(3.75));
    expect(result.lines[0]?.basis).toContain("١٬٠٠٠");
  });

  it("adds the fixed and relative components when an unknown-value settlement contains executable known-value terms", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "expert",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      stage: "final",
      finalOutcome: "settled",
      finalTiming: "before-dispositive-judgment",
      settlementHasKnownExecutableTerms: true,
      settlementAmountMillieme: poundsToMillieme(100_000),
      prepaidOriginalMillieme: poundsToMillieme(15)
    });

    expect(result.lines[0]?.amountMillieme).toBe(poundsToMillieme(2_461.25));
    expect(result.lines[0]?.basis).toContain("مجهولة القيمة");
  });

  it("does not assess more than the paid filing fee when abandonment ends the case after the first session", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "abandoned",
      finalTiming: "before-dispositive-judgment",
      prepaidOriginalMillieme: poundsToMillieme(300)
    });

    expect(result.lines).toHaveLength(0);
    expect(result.totalMillieme).toBe(0);
    expect(result.warnings.join(" ")).toContain("لا يستحق قلم الكتاب رسمًا أكثر");
  });

  it.each(["lapsed", "deemed-never-filed"] as const)("does not assess an additional fee when the final disposition is %s without merits or an obligation", (finalOutcome) => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome,
      prepaidOriginalMillieme: poundsToMillieme(1_000)
    });

    expect(result.lines).toHaveLength(0);
    expect(result.totalMillieme).toBe(0);
    expect(result.warnings.join(" ")).toContain("لا يستحق قلم الكتاب رسمًا أكثر");
  });

  it("does not charge the fixed filing fee again when an unknown-value case reaches judgment", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "expert",
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

  it("blocks a struck case because striking does not by itself settle the final fee", () => {
    expect(() => calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "struck",
      awardedAmountMillieme: undefined
    })).toThrow("FINAL_OUTCOME_NOT_TERMINAL");
  });

  it("returns the constitutional guarantee after a successful constitutional action without charging the filing fee twice", () => {
    const result = calculateFees({
      ...base,
      caseTypeId: "constitutional-action",
      stage: "final",
      finalOutcome: "constitutional-accepted",
      valueKind: "unknown",
      courtLevel: "cassation",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined,
      prepaidOriginalMillieme: poundsToMillieme(25)
    });

    expect(result.lines.map((line) => line.code)).toEqual(["CONSTITUTIONAL_GUARANTEE_REFUND"]);
    expect(result.totalMillieme).toBe(0);
    expect(result.refundableMillieme).toBe(poundsToMillieme(25));
  });

  it("charges the criminal fee on conviction according to the final offence description and nothing on acquittal", () => {
    const conviction = calculateFees({
      ...base,
      caseTypeId: "criminal-misdemeanor",
      courtLevel: "primary",
      stage: "final",
      finalOutcome: "criminal-conviction",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined
    });
    const acquittal = calculateFees({
      ...base,
      caseTypeId: "criminal-misdemeanor",
      courtLevel: "primary",
      stage: "final",
      finalOutcome: "criminal-acquittal",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined
    });

    expect(conviction.lines[0]?.code).toBe("CRIMINAL_ORIGINAL_FIXED");
    expect(conviction.totalMillieme).toBe(poundsToMillieme(5));
    expect(acquittal.totalMillieme).toBe(0);
  });

  it.each([
    ["state-council-annulment", "primary"],
    ["bankruptcy-declaration-request", "primary"]
  ] as const)("does not recharge the fixed filing fee at final judgment for %s", (caseTypeId, courtLevel) => {
    const result = calculateFees({
      ...base,
      caseTypeId,
      courtLevel,
      stage: "final",
      finalOutcome: "judgment-full",
      valueKind: "unknown",
      claimAmountMillieme: undefined,
      awardedAmountMillieme: undefined
    });

    expect(result.totalMillieme).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it("rejects final-stage settlement for an execution operation", () => {
    expect(() => calculateFees({
      ...base,
      caseTypeId: "execution-first",
      stage: "final",
      finalOutcome: "judgment-full",
      caseFacts: { executionAmountMillieme: poundsToMillieme(10_000) }
    })).toThrow("FINAL_STAGE_NOT_APPLICABLE_TO_OPERATION");
  });

  it("rejects a free-form manual exemption that bypasses the published relief registry", () => {
    expect(() => calculateFees({ ...base, exempt: true, exemptionReason: "إعفاء بنص خاص" }))
      .toThrow("MANUAL_EXEMPTION_DISABLED");
  });
});

describe("request-by-request final settlement", () => {
  it("aggregates known-value requests that arise from the same legal basis before applying the progressive bands", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "judgment-partial",
      claimStructure: "same-basis",
      prepaidOriginalMillieme: poundsToMillieme(300),
      finalClaims: [
        { id: "principal", label: "أصل الدين", requestKind: "original", valueKind: "known", disposition: "awarded-full", aggregation: "sum-same-basis", groupKey: "contract-1", claimedAmountMillieme: poundsToMillieme(40_000) },
        { id: "damages", label: "تعويض تابع للسند", requestKind: "additional", valueKind: "known", disposition: "awarded-full", aggregation: "sum-same-basis", groupKey: "contract-1", claimedAmountMillieme: poundsToMillieme(10_000) }
      ]
    });

    expect(result.lines[0]?.code).toBe("FINAL_MULTI_CLAIM_ADJUSTMENT");
    expect(result.lines[0]?.amountMillieme).toBe(calculateProgressiveRelative(poundsToMillieme(50_000)) - poundsToMillieme(300));
    expect(result.lines[0]?.basis).toContain("السند الواحد");
  });

  it("assesses requests from different legal bases independently instead of combining them", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "judgment-partial",
      claimStructure: "different-bases",
      prepaidOriginalMillieme: poundsToMillieme(300),
      finalClaims: [
        { id: "a", label: "طلب العقد الأول", requestKind: "original", valueKind: "known", disposition: "awarded-full", aggregation: "separate-basis", groupKey: "contract-a", claimedAmountMillieme: poundsToMillieme(25_000) },
        { id: "b", label: "طلب العقد الثاني", requestKind: "original", valueKind: "known", disposition: "awarded-full", aggregation: "separate-basis", groupKey: "contract-b", claimedAmountMillieme: poundsToMillieme(25_000) }
      ]
    });

    const expectedGross = 2 * calculateProgressiveRelative(poundsToMillieme(25_000));
    expect(result.lines[0]?.amountMillieme).toBe(expectedGross - poundsToMillieme(300));
    expect(result.assumptions.join(" ")).toContain("كل سند على حدة");
  });

  it("takes the higher fee for an original request and its ancillary request", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "judgment-partial",
      prepaidOriginalMillieme: poundsToMillieme(100),
      finalClaims: [
        { id: "original", label: "الطلب الأصلي", requestKind: "original", valueKind: "known", disposition: "awarded-partial", aggregation: "higher-of-related", groupKey: "relief-1", claimedAmountMillieme: poundsToMillieme(50_000), awardedAmountMillieme: poundsToMillieme(20_000) },
        { id: "ancillary", label: "الطلب التابع", requestKind: "incidental", valueKind: "unknown", disposition: "awarded-full", aggregation: "higher-of-related", groupKey: "relief-1" }
      ]
    });

    expect(result.lines[0]?.amountMillieme).toBe(calculateProgressiveRelative(poundsToMillieme(20_000)) - poundsToMillieme(100));
    expect(result.assumptions.join(" ")).toContain("أرجح الرسمين");
  });

  it("omits rejected requests while settling the requests that were actually awarded", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "judgment-partial",
      prepaidOriginalMillieme: poundsToMillieme(100),
      finalClaims: [
        { id: "won", label: "الطلب المقضي به", requestKind: "original", valueKind: "known", disposition: "awarded-partial", aggregation: "separate-basis", groupKey: "won", claimedAmountMillieme: poundsToMillieme(50_000), awardedAmountMillieme: poundsToMillieme(10_000) },
        { id: "lost", label: "الطلب المرفوض", requestKind: "additional", valueKind: "known", disposition: "rejected", aggregation: "separate-basis", groupKey: "lost", claimedAmountMillieme: poundsToMillieme(70_000) }
      ]
    });

    expect(result.lines[0]?.amountMillieme).toBe(calculateProgressiveRelative(poundsToMillieme(10_000)) - poundsToMillieme(100));
    expect(result.lines[0]?.basis).not.toContain("٧٠٬٠٠٠");
  });

  it("adds the Article 11 accrual complement through judgment even when the principal request was rejected", () => {
    const result = calculateFees({
      ...base,
      stage: "final",
      finalOutcome: "rejected",
      prepaidOriginalMillieme: poundsToMillieme(300),
      finalAccruals: [{
        id: "rent-after-filing",
        label: "الأجرة المستجدة حتى الحكم",
        kind: "rent",
        filingBasisMillieme: poundsToMillieme(40_000),
        accruedToJudgmentMillieme: poundsToMillieme(12_000)
      }]
    });

    const expected = calculateProgressiveRelative(poundsToMillieme(52_000)) - calculateProgressiveRelative(poundsToMillieme(40_000));
    expect(result.lines.find((line) => line.code === "ARTICLE_11_POST_FILING_ACCRUAL")?.amountMillieme).toBe(expected);
    expect(result.warnings.join(" ")).toContain("ولو انتهى الطلب بالرفض");
  });
});
