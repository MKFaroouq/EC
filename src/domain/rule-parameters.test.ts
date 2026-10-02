import { describe, expect, it } from "vitest";
import {
  DEFAULT_JUDICIAL_FEE_RULES,
  DEFAULT_RULE_PARAMETERS,
  applyRuleParameters,
  formatRuleFormula,
  validateRuleParameters
} from "./rule-parameters.js";

describe("governed rule parameters", () => {
  it("accepts and canonically applies a complete unknown-value fee change", () => {
    const parameters = {
      ...DEFAULT_RULE_PARAMETERS.UNKNOWN_FIXED,
      primaryFeeMillieme: 20_000
    };

    expect(validateRuleParameters("UNKNOWN_FIXED", parameters)).toEqual(parameters);
    const configured = applyRuleParameters(DEFAULT_JUDICIAL_FEE_RULES, "UNKNOWN_FIXED", parameters);
    expect(configured.unknownFixed.primaryFeeMillieme).toBe(20_000);
    expect(formatRuleFormula("UNKNOWN_FIXED", parameters)).toContain("٢٠");
  });

  it("rejects missing, extra, negative, fractional, and unordered parameters", () => {
    expect(() => validateRuleParameters("UNKNOWN_FIXED", { primaryFeeMillieme: 20_000 })).toThrow("RULE_PARAMETERS_INVALID");
    expect(() => validateRuleParameters("SERVICES_FUND", { rateBasisPoints: -1 })).toThrow("RULE_PARAMETERS_INVALID");
    expect(() => validateRuleParameters("SERVICES_FUND", { rateBasisPoints: 5_000.5 })).toThrow("RULE_PARAMETERS_INVALID");
    expect(() => validateRuleParameters("SERVICES_FUND", { rateBasisPoints: 5_000, injected: 1 })).toThrow("RULE_PARAMETERS_INVALID");
    expect(() => validateRuleParameters("FILING_CAP", {
      ...DEFAULT_RULE_PARAMETERS.FILING_CAP,
      secondThresholdPounds: 10_000
    })).toThrow("RULE_PARAMETERS_INVALID");
  });

  it("does not mutate the published default configuration when applying an override", () => {
    const parameters = { ...DEFAULT_RULE_PARAMETERS.SERVICES_FUND, rateBasisPoints: 4_000 };
    const configured = applyRuleParameters(DEFAULT_JUDICIAL_FEE_RULES, "SERVICES_FUND", parameters);
    expect(configured.servicesFundRateBasisPoints).toBe(4_000);
    expect(DEFAULT_JUDICIAL_FEE_RULES.servicesFundRateBasisPoints).toBe(5_000);
  });
});
