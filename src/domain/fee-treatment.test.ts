import { describe, expect, it } from "vitest";
import { caseTypes } from "./catalog.js";
import { calculateFees, unknownValueFee } from "./calculate.js";
import { resolveFeeTreatment } from "./fee-treatment.js";
import type { EstimateInput } from "./types.js";

const base: EstimateInput = {
  courtId: "cairo-north",
  caseTypeId: "payment-order",
  courtLevel: "primary",
  stage: "filing",
  valueKind: "known",
  claimStructure: "single",
  claimAmountMillieme: 10_000_000,
  urgent: false,
  exempt: false,
  calculationDate: "2026-08-08"
};

function treatment(input: EstimateInput) {
  const caseType = caseTypes.find((item) => item.id === input.caseTypeId);
  if (!caseType) throw new Error("missing case type");
  return resolveFeeTreatment(input, caseType);
}

describe("statutory fee treatment registry", () => {
  it("classifies selected known and unknown actions without asking the employee to guess", () => {
    expect(treatment(base).baseNature).toBe("relative");
    expect(treatment({ ...base, caseTypeId: "article76-easement", valueKind: "unknown", claimAmountMillieme: undefined }).baseNature).toBe("fixed");
  });

  it("applies article 50 only to an action filed by government in its narrow meaning", () => {
    const government = treatment({
      ...base,
      feeRelief: { applicant: "government", governmentActionFiledByGovernment: true }
    });
    expect(government.kind).toBe("exempt");
    expect(government.ruleId).toBe("law90-article50-government");

    const publicBody = treatment({
      ...base,
      feeRelief: { applicant: "independent-public-body", governmentActionFiledByGovernment: true }
    });
    expect(publicBody.kind).toBe("standard");
  });

  it("requires an operative full legal-aid decision before applying the personal exemption", () => {
    expect(treatment({ ...base, feeRelief: { applicant: "ordinary-person", legalAidDecision: "full" } }).ruleId)
      .toBe("law90-articles23-29-legal-aid");
    expect(treatment({ ...base, feeRelief: { applicant: "ordinary-person", legalAidDecision: "partial" } }).kind)
      .toBe("review");
  });

  it("requires both the disability evidence and a rights-related dispute", () => {
    const eligible = treatment({
      ...base,
      feeRelief: { applicant: "disabled-person", disabilityCardVerified: true, disabilityRightsDispute: true }
    });
    expect(eligible.ruleId).toBe("law10-2018-disability-rights");
    expect(treatment({
      ...base,
      feeRelief: { applicant: "disabled-person", disabilityCardVerified: true, disabilityRightsDispute: false }
    }).kind).toBe("standard");
  });

  it("confines social-insurance and universal-health exemptions to disputes under their own laws", () => {
    expect(treatment({
      ...base,
      feeRelief: { applicant: "social-insured-or-beneficiary", socialInsuranceLawDispute: true }
    }).ruleId).toBe("law148-2019-social-insurance");
    expect(treatment({
      ...base,
      feeRelief: { applicant: "social-insured-or-beneficiary", socialInsuranceLawDispute: false }
    }).kind).toBe("standard");
    expect(treatment({
      ...base,
      feeRelief: { applicant: "universal-health-insured", universalHealthLawDispute: true }
    }).ruleId).toBe("law2-2018-universal-health");
  });

  it("recognises the specific Bank Nasser exemption", () => {
    expect(treatment({ ...base, feeRelief: { applicant: "nasser-social-bank" } }).ruleId)
      .toBe("law66-1971-nasser-bank");
  });

  it("automatically applies the article 6 half and quarter categories", () => {
    expect(treatment({ ...base, caseTypeId: "article76-petition-order-grievance", valueKind: "unknown", claimAmountMillieme: undefined }).factorBasisPoints)
      .toBe(5_000);
    expect(treatment({ ...base, caseTypeId: "article76-arbitration-execution-order-unknown", valueKind: "unknown", claimAmountMillieme: undefined }).factorBasisPoints)
      .toBe(2_500);
    expect(treatment({ ...base, caseTypeId: "tax-profit-assessment-dispute" }).factorBasisPoints)
      .toBe(5_000);
    expect(treatment({ ...base, caseTypeId: "arbitration-exequatur-order-known" }).factorBasisPoints)
      .toBe(2_500);
  });

  it("does not turn every tax dispute into the profit-assessment reduction", () => {
    const vatCase = treatment({ ...base, caseTypeId: "tax-vat-dispute-review" });
    expect(vatCase.kind).toBe("review");
    expect(vatCase.factorBasisPoints).toBe(10_000);
  });

  it("keeps government filing status distinct from the tax subject", () => {
    const authorityAction = treatment({
      ...base,
      caseTypeId: "tax-profit-assessment-dispute",
      feeRelief: { applicant: "government", governmentActionFiledByGovernment: true }
    });
    expect(authorityAction.kind).toBe("exempt");
    expect(authorityAction.ruleId).toBe("law90-article50-government");
  });

  it("requires identity of subject and parties for a return after strike", () => {
    expect(treatment({
      ...base,
      feeRelief: { applicant: "ordinary-person", reductionContext: "return-after-strike", sameSubjectAndParties: true }
    }).factorBasisPoints).toBe(2_500);
    expect(treatment({
      ...base,
      feeRelief: { applicant: "ordinary-person", reductionContext: "return-after-strike", sameSubjectAndParties: false }
    }).factorBasisPoints).toBe(10_000);
  });

  it("changes the charged original fee and its services follower, but not lawyer fees", () => {
    const input: EstimateInput = {
      ...base,
      caseTypeId: "article76-petition-order-grievance",
      valueKind: "unknown",
      claimAmountMillieme: undefined
    };
    const result = calculateFees(input);
    const original = result.lines.find((line) => line.code === "ORIGINAL_FIXED");
    const services = result.lines.find((line) => line.code === "SERVICES_FUND");
    const lawyer = result.lines.find((line) => line.code === "LAWYER_FEE");
    expect(original?.amountMillieme).toBe(Math.round(unknownValueFee("primary", false) / 2));
    expect(services?.amountMillieme).toBe(Math.round((original?.amountMillieme ?? 0) / 2));
    expect(lawyer?.amountMillieme).toBe(75_000);
    expect(result.treatment?.kind).toBe("reduced");
  });
});
