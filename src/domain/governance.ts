export type RuleChangeStatus = "in_review" | "approved" | "rejected";
export type RulePublicationStatus = "published";
export type RuleChangeDecision = "approve" | "reject";
export type RuleScope = "court" | "global";
export type GovernanceRole = "estimator" | "supervisor" | "legal_reviewer" | "project_manager" | "leader";

interface GovernanceActor {
  id: string;
  role: GovernanceRole;
  courtId?: string;
}

export function canProposeRuleChange(
  actor: GovernanceActor,
  scope: RuleScope,
  courtId: string | undefined,
  configuredProjectManagerId: string
): boolean {
  if (scope === "global") return actor.role === "project_manager" && actor.id === configuredProjectManagerId && courtId === undefined;
  return actor.role === "supervisor" && Boolean(actor.courtId) && actor.courtId === courtId;
}

export function canPublishRuleChange(
  actor: GovernanceActor,
  scope: RuleScope,
  courtId: string | undefined,
  configuredProjectManagerId: string
): boolean {
  if (scope === "global") return actor.role === "project_manager" && actor.id === configuredProjectManagerId && courtId === undefined;
  return actor.role === "supervisor" && Boolean(actor.courtId) && actor.courtId === courtId;
}

export function transitionRuleChange(current: RuleChangeStatus, decision: RuleChangeDecision): RuleChangeStatus {
  if (current !== "in_review") throw new Error("RULE_CHANGE_ALREADY_REVIEWED");
  return decision === "approve" ? "approved" : "rejected";
}

export function transitionRulePublication(current: RuleChangeStatus): RulePublicationStatus {
  if (current !== "approved") throw new Error("RULE_CHANGE_NOT_APPROVED");
  return "published";
}
