import { describe, expect, it } from "vitest";
import { canProposeRuleChange, canPublishRuleChange, transitionRuleChange, transitionRulePublication } from "./governance.js";

describe("rule change governance", () => {
  it("moves an in-review proposal to approved after legal approval", () => {
    expect(transitionRuleChange("in_review", "approve")).toBe("approved");
  });

  it("moves an in-review proposal to rejected after legal rejection", () => {
    expect(transitionRuleChange("in_review", "reject")).toBe("rejected");
  });

  it("prevents a completed proposal from being reviewed twice", () => {
    expect(() => transitionRuleChange("approved", "reject")).toThrow("RULE_CHANGE_ALREADY_REVIEWED");
  });

  it("limits a court supervisor to proposals for their own court", () => {
    const supervisor = { id: "s-1", role: "supervisor" as const, courtId: "cairo-north" };
    expect(canProposeRuleChange(supervisor, "court", "cairo-north", "pm-1")).toBe(true);
    expect(canProposeRuleChange(supervisor, "court", "giza-primary", "pm-1")).toBe(false);
    expect(canProposeRuleChange(supervisor, "global", undefined, "pm-1")).toBe(false);
  });

  it("allows only the configured sole project manager to propose a global rule", () => {
    const configured = { id: "pm-1", role: "project_manager" as const };
    const secondManager = { id: "pm-2", role: "project_manager" as const };
    expect(canProposeRuleChange(configured, "global", undefined, "pm-1")).toBe(true);
    expect(canProposeRuleChange(secondManager, "global", undefined, "pm-1")).toBe(false);
  });

  it("separates publication authority by scope after legal approval", () => {
    const supervisor = { id: "s-1", role: "supervisor" as const, courtId: "cairo-north" };
    const projectManager = { id: "pm-1", role: "project_manager" as const };
    expect(canPublishRuleChange(supervisor, "court", "cairo-north", "pm-1")).toBe(true);
    expect(canPublishRuleChange(supervisor, "global", undefined, "pm-1")).toBe(false);
    expect(canPublishRuleChange(projectManager, "global", undefined, "pm-1")).toBe(true);
    expect(canPublishRuleChange(projectManager, "court", "cairo-north", "pm-1")).toBe(false);
  });

  it("publishes only a legally approved proposal", () => {
    expect(transitionRulePublication("approved")).toBe("published");
    expect(() => transitionRulePublication("in_review")).toThrow("RULE_CHANGE_NOT_APPROVED");
    expect(() => transitionRulePublication("rejected")).toThrow("RULE_CHANGE_NOT_APPROVED");
  });
});
