import { describe, expect, it } from "vitest";
import {
  calculateAttestationFee,
  calculateAnnouncementFee,
  calculateCassationMemorandumFee,
  calculateCourtServiceFees,
  calculateExecutionFixedSurcharge,
  calculateExecutionPrincipalFee,
  calculateJudicialPaperCopyFee,
  calculateNamedSearchFee,
  calculateOrderFee,
  calculatePowerOfAttorneyFee,
  calculateRegistryCopyFee,
  calculateSignatureCertificationFee,
  calculateTheoreticalSearchFee,
  calculateTranslationFee
} from "./service-fees.js";
import { poundsToMillieme } from "./calculate.js";

describe("registry copies and certificates under article 30", () => {
  it.each([
    [1, 1, 0.5],
    [20, 2, 20],
    [200, 1, 100],
    [201, 1, 100]
  ])("charges %s pages across %s copies with the statutory case cap", (pages, copies, expectedPounds) => {
    expect(calculateRegistryCopyFee(pages, copies)).toBe(poundsToMillieme(expectedPounds));
  });

  it("rejects a zero page count instead of silently returning a fee", () => {
    expect(() => calculateRegistryCopyFee(0, 1)).toThrow("INVALID_UNIT_COUNT");
  });

  it.each([
    [0, 20],
    [90, 10],
    [99.5, 0.5],
    [100, 0]
  ])("charges only the remaining part of the case cap after %s pounds were assessed", (priorPounds, expectedPounds) => {
    expect(calculateRegistryCopyFee(40, 1, poundsToMillieme(priorPounds))).toBe(poundsToMillieme(expectedPounds));
  });

  it.each([-1_000, 100_001])("rejects an impossible prior case fee of %s milliemes", (priorMillieme) => {
    expect(() => calculateRegistryCopyFee(1, 1, priorMillieme)).toThrow("INVALID_PRIOR_REGISTRY_FEE");
  });
});

describe("copies of judicial papers under article 30", () => {
  it.each([
    ["partial", 0.25],
    ["primary", 0.75],
    ["appeal", 1.5],
    ["cassation", 1.5]
  ] as const)("uses the %s court rate", (level, expectedPounds) => {
    expect(calculateJudicialPaperCopyFee(level, 1, 1)).toBe(poundsToMillieme(expectedPounds));
  });

  it("multiplies the rate by pages and requested copies", () => {
    expect(calculateJudicialPaperCopyFee("primary", 4, 3)).toBe(poundsToMillieme(9));
  });
});

describe("search and translation fees under articles 31 and 32", () => {
  it("charges fifteen piastres for every name in every searched year", () => {
    expect(calculateNamedSearchFee(2, 3)).toBe(poundsToMillieme(0.9));
  });

  it("charges fifty piastres for every matter in a theoretical search", () => {
    expect(calculateTheoreticalSearchFee(3)).toBe(poundsToMillieme(1.5));
  });

  it("charges fifty piastres for every translated page", () => {
    expect(calculateTranslationFee(7)).toBe(poundsToMillieme(3.5));
  });
});

describe("orders, cassation memoranda, and announcements", () => {
  it.each([
    ["partial", 0.25],
    ["primary", 0.75],
    ["appeal", 1.5],
    ["cassation", 1.5]
  ] as const)("charges the article 34 rate for an order before a %s court", (level, expectedPounds) => {
    expect(calculateOrderFee(level, 1)).toBe(poundsToMillieme(expectedPounds));
  });

  it("charges fifty piastres for every page of a cassation memorandum", () => {
    expect(calculateCassationMemorandumFee(6)).toBe(poundsToMillieme(3));
  });

  it.each([
    ["partial", 0.25],
    ["primary", 0.75],
    ["appeal", 1.5],
    ["cassation", 1.5]
  ] as const)("charges the article 42 rate per original page for a %s announcement", (level, expectedPounds) => {
    expect(calculateAnnouncementFee(level, 1)).toBe(poundsToMillieme(expectedPounds));
  });
});

describe("explainable court-service calculation", () => {
  it("adds the court-buildings certificate fee and keeps every amount traceable", () => {
    const result = calculateCourtServiceFees({
      kind: "certificate",
      caseReference: "2026/125 مدني كلي شمال القاهرة",
      priorRegistryFeeMillieme: 0,
      pageCount: 2,
      copyCount: 1
    }, new Date("2026-08-06T12:00:00Z"));

    expect(result.totalMillieme).toBe(poundsToMillieme(1.6));
    expect(result.lines.map((line) => [line.code, line.amountMillieme, line.source.article])).toEqual([
      ["REGISTRY_COPY_OR_CERTIFICATE", poundsToMillieme(1), "المادة 30"],
      ["COURT_BUILDINGS_CERTIFICATE", poundsToMillieme(0.6), "المادة 1 والجدول المرفق - بند الشهادات"]
    ]);
  });

  it("explains the case-wide cap and never recharges amounts already assessed", () => {
    const result = calculateCourtServiceFees({
      kind: "registry-copy",
      caseReference: "2026/125 مدني كلي شمال القاهرة",
      priorRegistryFeeMillieme: poundsToMillieme(99),
      pageCount: 10,
      copyCount: 1
    });

    const cappedLine = result.lines.find((line) => line.code === "REGISTRY_COPY_OR_CERTIFICATE");
    expect(cappedLine?.amountMillieme).toBe(poundsToMillieme(1));
    expect(cappedLine?.basis).toContain("2026/125 مدني كلي شمال القاهرة");
    expect(cappedLine?.calculation).toContain(`سبق احتساب ${new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(99)}`);
  });

  it("calculates translation as its own fee plus the required judicial-paper copy fee", () => {
    const result = calculateCourtServiceFees({
      kind: "translation",
      pageCount: 2,
      copyCount: 1,
      sourceKind: "judicial-paper",
      courtLevel: "appeal"
    });

    expect(result.lines.map((line) => [line.code, line.amountMillieme])).toEqual([
      ["TRANSLATION", poundsToMillieme(1)],
      ["JUDICIAL_PAPER_COPY", poundsToMillieme(3)],
      ["COURT_BUILDINGS_COPY", poundsToMillieme(0.8)]
    ]);
    expect(result.totalMillieme).toBe(poundsToMillieme(4.8));
  });

  it("adds one martyr stamp only when the judicial service fee exceeds fifteen pounds", () => {
    const exactlyFifteen = calculateCourtServiceFees({ kind: "judicial-paper-copy", courtLevel: "appeal", pageCount: 10, copyCount: 1 });
    const aboveFifteen = calculateCourtServiceFees({ kind: "judicial-paper-copy", courtLevel: "appeal", pageCount: 11, copyCount: 1 });

    expect(exactlyFifteen.lines.some((line) => line.code === "MARTYRS_STAMP")).toBe(false);
    expect(aboveFifteen.lines.filter((line) => line.code === "MARTYRS_STAMP")).toHaveLength(1);
    expect(aboveFifteen.totalMillieme).toBe(poundsToMillieme(22.3));
  });

  it("does not invent ancillary charges whose legal vessel mapping is still unpublished", () => {
    const result = calculateCourtServiceFees({ kind: "named-search", nameCount: 2, yearCount: 3 });

    expect(result.totalMillieme).toBe(poundsToMillieme(0.9));
    expect(result.warnings).toContain("لم تُضف ضريبة الدمغة أو رسم تنمية موارد الدولة قبل اعتماد وعاء كل منهما لهذه الخدمة.");
  });
});

describe("execution fees under articles 43, 46 bis, 54, and 55", () => {
  it("charges one third of the underlying fee and rounds only to the nearest millieme", () => {
    expect(calculateExecutionPrincipalFee(437_500, "initial")).toBe(145_833);
  });

  it("charges one ninth of the underlying fee for a same-type re-execution without intermediate rounding", () => {
    expect(calculateExecutionPrincipalFee(437_500, "repeat")).toBe(48_611);
  });

  it.each([
    [500, "initial", 500],
    [1_000, "initial", 500],
    [1_000, "repeat", 500]
  ] as const)("never charges less than fifty piastres for an execution fee", (underlying, requestKind, expected) => {
    expect(calculateExecutionPrincipalFee(underlying, requestKind)).toBe(expected);
  });

  it.each([
    ["partial-judgment-or-payment-order", "initial", 1_000],
    ["partial-judgment-or-payment-order", "repeat", 500],
    ["primary-appeal-judgment-or-payment-order", "initial", 2_500],
    ["primary-appeal-judgment-or-payment-order", "repeat", 833],
    ["cassation-judgment", "initial", 2_500],
    ["official-contract-or-attestation", "initial", 2_500],
    ["arbitral-award", "initial", 2_500],
    ["enforceable-administrative-order", "initial", 2_500]
  ] as const)("applies the article 46 bis surcharge to %s on an %s request", (instrumentKind, requestKind, expected) => {
    expect(calculateExecutionFixedSurcharge(instrumentKind, requestKind, poundsToMillieme(15))).toBe(expected);
  });

  it("exempts the article 46 bis surcharge only when the execution amount is below fifteen pounds", () => {
    expect(calculateExecutionFixedSurcharge("primary-appeal-judgment-or-payment-order", "initial", 14_999)).toBe(0);
    expect(calculateExecutionFixedSurcharge("primary-appeal-judgment-or-payment-order", "initial", 15_000)).toBe(2_500);
  });

  it("derives a relative execution fee from the executable amount and explains every component", () => {
    const result = calculateCourtServiceFees({
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "primary-appeal-judgment-or-payment-order",
      executableFormulaConfirmed: true,
      feeBasis: "relative",
      executionAmountMillieme: poundsToMillieme(10_000)
    }, new Date("2026-08-06T12:00:00Z"));

    expect(result.lines.map((line) => [line.code, line.amountMillieme, line.source.article])).toEqual([
      ["EXECUTION_PRINCIPAL", 145_833, "المواد 43 و54 و55"],
      ["EXECUTION_FIXED_SURCHARGE", 2_500, "المادة 46 مكررًا"],
      ["MARTYRS_STAMP", 5_000, "المادة 7"]
    ]);
    expect(result.lines[0]?.calculation).toContain("437.500");
    expect(result.lines[0]?.calculation).toContain("أقرب مليم");
  });

  it("requires the executable formula and a prior same-type reference for re-execution", () => {
    expect(() => calculateCourtServiceFees({
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "cassation-judgment",
      executableFormulaConfirmed: false,
      feeBasis: "relative",
      executionAmountMillieme: poundsToMillieme(100)
    })).toThrow("EXECUTABLE_FORMULA_REQUIRED");

    expect(() => calculateCourtServiceFees({
      kind: "execution",
      requestKind: "repeat",
      instrumentKind: "cassation-judgment",
      executableFormulaConfirmed: true,
      feeBasis: "relative",
      executionAmountMillieme: poundsToMillieme(100)
    })).toThrow("SAME_TYPE_PRIOR_EXECUTION_REFERENCE_REQUIRED");
  });

  it("accepts a fixed basis only with a traceable prior assessment", () => {
    const result = calculateCourtServiceFees({
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "partial-judgment-or-payment-order",
      executableFormulaConfirmed: true,
      feeBasis: "fixed",
      underlyingFixedFeeMillieme: poundsToMillieme(15),
      underlyingAssessmentReference: "أمر تقدير 18/2026",
      executionAmountMillieme: poundsToMillieme(20)
    });

    expect(result.lines.map((line) => [line.code, line.amountMillieme])).toEqual([
      ["EXECUTION_PRINCIPAL", poundsToMillieme(5)],
      ["EXECUTION_FIXED_SURCHARGE", poundsToMillieme(1)]
    ]);
    expect(result.lines[0]?.basis).toContain("أمر تقدير 18/2026");
  });
});

describe("executive formula and attestation fees under articles 57, 60, 68, and 72 to 74", () => {
  it.each([
    [1, 5],
    [3, 7]
  ])("charges five pounds for the first attestation page and one for every extra page", (pages, expectedPounds) => {
    expect(calculateAttestationFee(pages)).toBe(poundsToMillieme(expectedPounds));
  });

  it.each([
    [1, false, 2],
    [3, false, 3],
    [3, true, 1.5]
  ])("calculates a power of attorney attestation with the statutory half-rate path", (pages, caseFileHalfRate, expectedPounds) => {
    expect(calculatePowerOfAttorneyFee(pages, caseFileHalfRate)).toBe(poundsToMillieme(expectedPounds));
  });

  it("charges one pound for every certified signature or seal", () => {
    expect(calculateSignatureCertificationFee(4)).toBe(poundsToMillieme(4));
  });

  it("charges an executive formula only when the requesting authority differs from the issuer", () => {
    const result = calculateCourtServiceFees({
      kind: "executive-formula-other-authority",
      issuerAuthority: "محكمة شمال القاهرة الابتدائية",
      requestedAuthority: "محكمة جنوب القاهرة الابتدائية",
      documentCount: 2
    });

    expect(result.lines.map((line) => [line.code, line.amountMillieme, line.source.article])).toEqual([
      ["EXECUTIVE_FORMULA_OTHER_AUTHORITY", poundsToMillieme(2), "المادة 57"]
    ]);
    expect(() => calculateCourtServiceFees({
      kind: "executive-formula-other-authority",
      issuerAuthority: "محكمة شمال القاهرة الابتدائية",
      requestedAuthority: "  محكمة شمال القاهرة الابتدائية  ",
      documentCount: 1
    })).toThrow("DIFFERENT_AUTHORITY_REQUIRED");
  });

  it("calculates the published attestation, power-of-attorney, signature, and foreign-use services", () => {
    const attestation = calculateCourtServiceFees({ kind: "attestation", pageCount: 3 });
    const power = calculateCourtServiceFees({ kind: "power-of-attorney-attestation", pageCount: 2, caseFileHalfRate: true });
    const signature = calculateCourtServiceFees({ kind: "signature-or-seal-certification", markCount: 3 });
    const foreignUse = calculateCourtServiceFees({ kind: "foreign-use-authentication", authenticationCount: 2 });

    expect(attestation.lines[0]?.amountMillieme).toBe(poundsToMillieme(7));
    expect(power.lines[0]?.amountMillieme).toBe(poundsToMillieme(1.25));
    expect(signature.lines[0]?.amountMillieme).toBe(poundsToMillieme(3));
    expect(foreignUse.lines[0]?.amountMillieme).toBe(poundsToMillieme(2));
  });

  it("adds documented travel expenses to an external attestation or certification", () => {
    const result = calculateCourtServiceFees({
      kind: "external-authentication",
      authenticationKind: "certification",
      chargeableUnitCount: 2,
      travelExpenseMillieme: poundsToMillieme(12.75),
      travelExpenseReference: "مأمورية انتقال 42/2026"
    });

    expect(result.lines.map((line) => [line.code, line.amountMillieme])).toEqual([
      ["EXTERNAL_CERTIFICATION", poundsToMillieme(3)],
      ["EXTERNAL_TRAVEL_EXPENSE", poundsToMillieme(12.75)]
    ]);
    expect(result.lines[1]?.basis).toContain("مأمورية انتقال 42/2026");
  });
});
