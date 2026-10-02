import { describe, expect, it } from "vitest";
import { serviceInputSchema } from "../../server/service-schema.js";

describe("court service API schema", () => {
  it("accepts complete relative and fixed execution requests", () => {
    expect(serviceInputSchema.safeParse({
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "cassation-judgment",
      executableFormulaConfirmed: true,
      feeBasis: "relative",
      executionAmountMillieme: 100_000
    }).success).toBe(true);

    expect(serviceInputSchema.safeParse({
      kind: "execution",
      requestKind: "repeat",
      instrumentKind: "official-contract-or-attestation",
      executableFormulaConfirmed: true,
      sameTypePriorExecutionReference: "محضر 42/2026",
      feeBasis: "fixed",
      executionAmountMillieme: 20_000,
      underlyingFixedFeeMillieme: 15_000,
      underlyingAssessmentReference: "أمر تقدير 18/2026"
    }).success).toBe(true);
  });

  it.each([
    {
      kind: "execution",
      requestKind: "initial",
      instrumentKind: "cassation-judgment",
      executableFormulaConfirmed: false,
      feeBasis: "relative",
      executionAmountMillieme: 100_000
    },
    {
      kind: "execution",
      requestKind: "repeat",
      instrumentKind: "cassation-judgment",
      executableFormulaConfirmed: true,
      feeBasis: "relative",
      executionAmountMillieme: 100_000
    },
    {
      kind: "executive-formula-other-authority",
      issuerAuthority: "محكمة شمال القاهرة",
      requestedAuthority: "  محكمة شمال القاهرة  ",
      documentCount: 1
    },
    {
      kind: "external-authentication",
      authenticationKind: "attestation",
      chargeableUnitCount: 1,
      travelExpenseMillieme: 1_000
    }
  ])("rejects a service request missing a legal precondition", (input) => {
    expect(serviceInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects unknown fields instead of allowing request smuggling into the audit record", () => {
    expect(serviceInputSchema.safeParse({
      kind: "attestation",
      pageCount: 1,
      manuallyOverriddenTotal: 1
    }).success).toBe(false);
  });
});
