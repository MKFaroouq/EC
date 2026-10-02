export type CourtLevel = "partial" | "primary" | "appeal" | "cassation";
export type EstimateStage = "filing" | "final";
export type FinalOutcome =
  | "judgment-full"
  | "judgment-partial"
  | "rejected"
  | "inadmissible"
  | "settled"
  | "abandoned"
  | "struck"
  | "lapsed"
  | "deemed-never-filed"
  | "criminal-conviction"
  | "criminal-acquittal"
  | "constitutional-accepted"
  | "constitutional-rejected"
  | "constitutional-inadmissible"
  | "cassation-referral"
  | "appeal-affirmed"
  | "appeal-modified"
  | "appeal-cancelled";
export type FinalTiming =
  | "first-session-before-pleading"
  | "before-dispositive-judgment"
  | "after-dispositive-judgment";
export type FinalClaimDisposition =
  | "awarded-full"
  | "awarded-partial"
  | "rejected"
  | "inadmissible"
  | "ended-without-merits";
export type FinalClaimAggregation = "sum-same-basis" | "separate-basis" | "higher-of-related";
export type FinalClaimRequestKind = "original" | "additional" | "incidental" | "intervention";
export type FinalAccrualKind = "rent" | "yield" | "daily-compensation" | "interest";
export type ClaimValueKind = "known" | "unknown";
export type ClaimStructure = "single" | "same-basis" | "different-bases" | "rent-termination" | "unsure";
export type FeeBaseNature = "relative" | "fixed" | "regulated" | "review";
export type FeeTreatmentKind = "standard" | "reduced" | "exempt" | "review";
export type FeeReliefApplicant =
  | "ordinary-person"
  | "government"
  | "independent-public-body"
  | "worker-or-beneficiary"
  | "social-insurance-authority"
  | "social-insured-or-beneficiary"
  | "universal-health-authority"
  | "universal-health-insured"
  | "nasser-social-bank"
  | "disabled-person"
  | "national-disability-council"
  | "childhood-motherhood-council";
export type FeeReductionContext =
  | "none"
  | "return-invalid-proceedings"
  | "return-invalid-summons"
  | "appeal-deemed-never-filed"
  | "default-judgment-opposition"
  | "fee-list-opposition"
  | "provisional-distribution-objection"
  | "return-after-strike";
export type TaxKind =
  | "income-profit-assessment"
  | "value-added"
  | "stamp"
  | "real-estate"
  | "customs"
  | "other";
export type TaxDisputeRoute = "court-action" | "appeal-committee" | "termination-committee";
export type RuleConfidence = "verified" | "operational" | "candidate";
export type JudicialJurisdiction =
  | "ordinary-civil"
  | "ordinary-commercial"
  | "economic"
  | "family"
  | "labour"
  | "state-council"
  | "criminal"
  | "enforcement"
  | "arbitration"
  | "bankruptcy"
  | "constitutional";
export type CaseCoverage = "calculable" | "conditional" | "blocked";
export type FinalSettlementPolicy =
  | "relative-on-relief"
  | "fixed-paid-at-filing"
  | "exempt-all-stages"
  | "criminal-on-conviction"
  | "constitutional-guarantee"
  | "operation-not-applicable"
  | "value-kind-dependent"
  | "eligibility-dependent"
  | "legal-review-required";
export type ValuationTemplate =
  | "money-claim"
  | "compensation-amount"
  | "contract-value"
  | "lease-derived-value"
  | "property-derived-value"
  | "periodic-payment"
  | "company-interest"
  | "enforcement-amount"
  | "arbitration-award"
  | "unknown-value"
  | "statutory-exemption"
  | "case-specific-review";

export interface EstimateInput {
  courtId: string;
  caseTypeId: string;
  courtLevel: CourtLevel;
  stage: EstimateStage;
  valueKind: ClaimValueKind;
  claimStructure: ClaimStructure;
  claimAmountMillieme?: number;
  awardedAmountMillieme?: number;
  prepaidOriginalMillieme?: number;
  settlementAmountMillieme?: number;
  settlementHasKnownExecutableTerms?: boolean;
  settlementReducedFeeCase?: boolean;
  finalClaims?: FinalClaimItem[];
  finalAccruals?: FinalAccrualItem[];
  finalOutcome?: FinalOutcome;
  finalTiming?: FinalTiming;
  urgent: boolean;
  exempt: boolean;
  exemptionReason?: string;
  feeRelief?: {
    applicant: FeeReliefApplicant;
    legalAidDecision?: "none" | "full" | "partial";
    governmentActionFiledByGovernment?: boolean;
    disabilityCardVerified?: boolean;
    disabilityRightsDispute?: boolean;
    socialInsuranceLawDispute?: boolean;
    universalHealthLawDispute?: boolean;
    protectedEntityLawDispute?: boolean;
    reductionContext?: FeeReductionContext;
    sameSubjectAndParties?: boolean;
  };
  calculationDate: string;
  caseFacts?: {
    leaseMonthlyRentMillieme?: number;
    leaseMonthsForValuation?: number;
    leaseIncludesArrears?: boolean;
    leaseArrearsMillieme?: number;
    contractSubjectValueMillieme?: number;
    contractCounterValueMillieme?: number;
    propertyKind?: "agricultural" | "built";
    propertyAnnualTaxMillieme?: number;
    propertyAnnualRentalValueMillieme?: number;
    propertyShareNumerator?: number;
    propertyShareDenominator?: number;
    periodicAnnualAmountMillieme?: number;
    periodicTerm?: "permanent" | "life" | "temporary";
    periodicYears?: number;
    stateCouncilIncludesStay?: boolean;
    executionAmountMillieme?: number;
    labourClaimantRole?: "employee" | "employer" | "other";
    labourArisesUnderLaw14?: boolean;
    companyInterestValueMillieme?: number;
    personalStatusUnitCount?: number;
    personalStatusAdditionalSheets?: number;
    personalStatusPriorFeeMillieme?: number;
    taxKind?: TaxKind;
    taxRoute?: TaxDisputeRoute;
    taxDisputedPeriods?: TaxDisputedPeriod[];
  };
}

export interface TaxDisputedPeriod {
  id: string;
  label: string;
  disputedProfitMillieme: number;
}

export interface FinalClaimItem {
  id: string;
  label: string;
  requestKind: FinalClaimRequestKind;
  valueKind: ClaimValueKind;
  disposition: FinalClaimDisposition;
  aggregation: FinalClaimAggregation;
  groupKey: string;
  claimedAmountMillieme?: number;
  awardedAmountMillieme?: number;
}

export interface FinalAccrualItem {
  id: string;
  label: string;
  kind: FinalAccrualKind;
  filingBasisMillieme: number;
  accruedToJudgmentMillieme: number;
}

export interface SourceRef {
  id: string;
  title: string;
  article: string;
  page?: number;
  url?: string;
}

export interface FeeLine {
  code: string;
  label: string;
  amountMillieme: number;
  basis: string;
  calculation: string;
  ruleVersion: string;
  confidence: RuleConfidence;
  source: SourceRef;
  financialClass?: "fee" | "deposit" | "refund" | "expense";
}

export interface CalculationResult {
  estimateId?: string;
  ruleSetId: string;
  ruleSetVersion: string;
  calculatedAt: string;
  totalMillieme: number;
  refundableMillieme: number;
  lines: FeeLine[];
  warnings: string[];
  assumptions: string[];
  treatment?: FeeTreatment;
  appliedRuleChanges?: Array<{
    id: string;
    ruleCode: string;
    scope: "court" | "global";
    courtId?: string;
    effectiveDate: string;
  }>;
  input: EstimateInput;
}

export interface FeeTreatment {
  baseNature: FeeBaseNature;
  kind: FeeTreatmentKind;
  factorBasisPoints: number;
  ruleId?: string;
  title: string;
  reason: string;
  source?: SourceRef;
  evidenceRequired: string[];
  scopeNote?: string;
}

export interface FeeReliefRule {
  id: string;
  title: string;
  kind: "exemption" | "reduction";
  factorBasisPoints: number;
  source: SourceRef;
  effectiveFrom?: string;
  evidenceRequired: string[];
  scopeNote: string;
  status: "verified" | "conditional";
}

export interface Court {
  id: string;
  name: string;
  code: string;
  governorate: string;
  level: "appeal" | "primary";
  active: boolean;
}

export interface CaseTypeSeed {
  id: string;
  name: string;
  defaultValueKind: ClaimValueKind;
  classification: "relative" | "fixed" | "review";
  source: "workbook" | "curated";
}

export interface CaseType extends CaseTypeSeed {
  profileId: string;
  profileName: string;
  jurisdiction: JudicialJurisdiction;
  coverage: CaseCoverage;
  valuationTemplate: ValuationTemplate;
  allowedValueKinds: ClaimValueKind[];
  supportedCourtLevels: CourtLevel[];
  requiredFacts: string[];
  sourceIds: string[];
  reviewNote?: string;
  finalSettlementPolicy: FinalSettlementPolicy;
}

export interface CaseTypeProfile {
  id: string;
  name: string;
  jurisdiction: JudicialJurisdiction;
  coverage: CaseCoverage;
  valuationTemplate: ValuationTemplate;
  allowedValueKinds: ClaimValueKind[];
  supportedCourtLevels: CourtLevel[];
  requiredFacts: string[];
  sourceIds: string[];
  reviewNote?: string;
  finalSettlementPolicy: FinalSettlementPolicy;
}

export interface LegalSource {
  id: string;
  title: string;
  kind: "law" | "regulation" | "circular" | "judgment" | "research" | "workbook" | "legacy-screen";
  status: "primary" | "supporting" | "incomplete" | "operational-only";
  effectiveDate?: string;
  localFile?: string;
  url?: string;
  notes: string;
}

export interface RuleRegisterItem {
  code: string;
  title: string;
  state: "published" | "draft" | "blocked";
  confidence: RuleConfidence;
  effectiveFrom?: string;
  formula: string;
  sourceIds: string[];
  reviewNote?: string;
}

export interface RuleChangeRequest {
  id: string;
  ruleCode: string;
  proposedFormula: string;
  proposedParameters: Record<string, number>;
  effectiveDate: string;
  reason: string;
  sourceIds: string[];
  scope: "court" | "global";
  courtId?: string;
  status: "in_review" | "approved" | "rejected";
  createdAt: string;
  proposerName: string;
  reviewedAt?: string;
  reviewerName?: string;
  reviewNote?: string;
  publishedAt?: string;
  publisherName?: string;
}
