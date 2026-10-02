import { describe, expect, it } from "vitest";
import { buildCourtServiceInput, type CourtServiceFormState } from "./service-form.js";

const base: CourtServiceFormState = {
  kind: "certificate",
  courtLevel: "primary",
  pageCount: "2",
  copyCount: "3",
  nameCount: "1",
  yearCount: "1",
  matterCount: "1",
  documentCount: "1",
  sourceKind: "registry",
  caseReference: "2026/125 مدني كلي شمال القاهرة",
  priorRegistryFeePounds: "12.5",
  executionRequestKind: "initial",
  executionInstrumentKind: "primary-appeal-judgment-or-payment-order",
  executableFormulaConfirmed: true,
  executionFeeBasis: "relative",
  executionAmountPounds: "10000",
  underlyingFixedFeePounds: "15",
  underlyingAssessmentReference: "أمر تقدير 18/2026",
  sameTypePriorExecutionReference: "",
  issuerAuthority: "محكمة شمال القاهرة الابتدائية",
  requestedAuthority: "محكمة جنوب القاهرة الابتدائية",
  caseFileHalfRate: false,
  markCount: "2",
  authenticationCount: "2",
  authenticationKind: "attestation",
  chargeableUnitCount: "1",
  travelExpensePounds: "0",
  travelExpenseReference: ""
};

describe("court service form mapping", () => {
  it.each([
    ["registry-copy", { kind: "registry-copy", caseReference: "2026/125 مدني كلي شمال القاهرة", priorRegistryFeeMillieme: 12_500, pageCount: 2, copyCount: 3 }],
    ["certificate", { kind: "certificate", caseReference: "2026/125 مدني كلي شمال القاهرة", priorRegistryFeeMillieme: 12_500, pageCount: 2, copyCount: 3 }],
    ["judicial-paper-copy", { kind: "judicial-paper-copy", courtLevel: "primary", pageCount: 2, copyCount: 3 }],
    ["named-search", { kind: "named-search", nameCount: 1, yearCount: 1 }],
    ["theoretical-search", { kind: "theoretical-search", matterCount: 1 }],
    ["order", { kind: "order", courtLevel: "primary", documentCount: 1 }],
    ["cassation-memorandum", { kind: "cassation-memorandum", pageCount: 2 }],
    ["announcement", { kind: "announcement", courtLevel: "primary", originalPageCount: 2 }]
  ] as const)("maps the %s service to its legally relevant fields only", (kind, expected) => {
    expect(buildCourtServiceInput({ ...base, kind })).toEqual(expected);
  });

  it("keeps the court level only when translating a judicial paper", () => {
    expect(buildCourtServiceInput({ ...base, kind: "translation", sourceKind: "registry" })).toEqual({
      kind: "translation",
      pageCount: 2,
      copyCount: 3,
      sourceKind: "registry",
      caseReference: "2026/125 مدني كلي شمال القاهرة",
      priorRegistryFeeMillieme: 12_500
    });
    expect(buildCourtServiceInput({ ...base, kind: "translation", sourceKind: "judicial-paper", courtLevel: "appeal" })).toEqual({
      kind: "translation",
      pageCount: 2,
      copyCount: 3,
      sourceKind: "judicial-paper",
      courtLevel: "appeal"
    });
  });

  it.each(["0", "-1", "1.5", "not-a-number"])("rejects the invalid unit count %s", (pageCount) => {
    expect(() => buildCourtServiceInput({ ...base, pageCount })).toThrow("INVALID_UNIT_COUNT");
  });

  it.each(["", "   "])("requires a case reference for registry-capped services", (caseReference) => {
    expect(() => buildCourtServiceInput({ ...base, caseReference })).toThrow("CASE_REFERENCE_REQUIRED");
  });

  it.each(["-0.001", "100.001", "1.2345", "not-a-number"])("rejects an invalid prior registry fee of %s pounds", (priorRegistryFeePounds) => {
    expect(() => buildCourtServiceInput({ ...base, priorRegistryFeePounds })).toThrow("INVALID_PRIOR_REGISTRY_FEE");
  });

  it("maps a relative execution request to the fields needed by the legal rule", () => {
    expect(buildCourtServiceInput({ ...base, kind: "execution" })).toEqual({
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "primary-appeal-judgment-or-payment-order",
      executableFormulaConfirmed: true,
      feeBasis: "relative",
      executionAmountMillieme: 10_000_000
    });
  });

  it("keeps the prior assessment reference for a fixed-basis execution", () => {
    expect(buildCourtServiceInput({
      ...base,
      kind: "execution",
      executionFeeBasis: "fixed",
      executionAmountPounds: "20"
    })).toEqual({
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "primary-appeal-judgment-or-payment-order",
      executableFormulaConfirmed: true,
      feeBasis: "fixed",
      executionAmountMillieme: 20_000,
      underlyingFixedFeeMillieme: 15_000,
      underlyingAssessmentReference: "أمر تقدير 18/2026"
    });
  });

  it("requires the same-type prior execution reference in a repeat request", () => {
    expect(() => buildCourtServiceInput({ ...base, kind: "execution", executionRequestKind: "repeat" }))
      .toThrow("SAME_TYPE_PRIOR_EXECUTION_REFERENCE_REQUIRED");
  });

  it.each([
    ["executive-formula-other-authority", { kind: "executive-formula-other-authority", issuerAuthority: "محكمة شمال القاهرة الابتدائية", requestedAuthority: "محكمة جنوب القاهرة الابتدائية", documentCount: 1 }],
    ["attestation", { kind: "attestation", pageCount: 2 }],
    ["power-of-attorney-attestation", { kind: "power-of-attorney-attestation", pageCount: 2, caseFileHalfRate: false }],
    ["signature-or-seal-certification", { kind: "signature-or-seal-certification", markCount: 2 }],
    ["foreign-use-authentication", { kind: "foreign-use-authentication", authenticationCount: 2 }],
    ["external-authentication", { kind: "external-authentication", authenticationKind: "attestation", chargeableUnitCount: 1, travelExpenseMillieme: 0 }]
  ] as const)("maps the %s service without unrelated form state", (kind, expected) => {
    expect(buildCourtServiceInput({ ...base, kind })).toEqual(expected);
  });

  it("requires a reference whenever external travel expenses are entered", () => {
    expect(() => buildCourtServiceInput({
      ...base,
      kind: "external-authentication",
      travelExpensePounds: "12.75"
    })).toThrow("TRAVEL_EXPENSE_REFERENCE_REQUIRED");
  });
});
