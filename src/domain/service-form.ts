import type { CourtLevel } from "./types.js";
import type {
  CourtServiceInput,
  ExecutionInstrumentKind,
  ExecutionRequestKind
} from "./service-fees.js";

export type CourtServiceKind = CourtServiceInput["kind"];

export interface CourtServiceFormState {
  kind: CourtServiceKind;
  courtLevel: CourtLevel;
  pageCount: string;
  copyCount: string;
  nameCount: string;
  yearCount: string;
  matterCount: string;
  documentCount: string;
  sourceKind: "registry" | "judicial-paper";
  caseReference: string;
  priorRegistryFeePounds: string;
  executionRequestKind: ExecutionRequestKind;
  executionInstrumentKind: ExecutionInstrumentKind;
  executableFormulaConfirmed: boolean;
  executionFeeBasis: "relative" | "fixed";
  executionAmountPounds: string;
  underlyingFixedFeePounds: string;
  underlyingAssessmentReference: string;
  sameTypePriorExecutionReference: string;
  issuerAuthority: string;
  requestedAuthority: string;
  caseFileHalfRate: boolean;
  markCount: string;
  authenticationCount: string;
  authenticationKind: "attestation" | "certification";
  chargeableUnitCount: string;
  travelExpensePounds: string;
  travelExpenseReference: string;
}

export function buildCourtServiceInput(form: CourtServiceFormState): CourtServiceInput {
  switch (form.kind) {
    case "registry-copy":
    case "certificate":
      return {
        kind: form.kind,
        caseReference: requiredCaseReference(form.caseReference),
        priorRegistryFeeMillieme: priorRegistryFee(form.priorRegistryFeePounds),
        pageCount: positiveInteger(form.pageCount),
        copyCount: positiveInteger(form.copyCount)
      };
    case "judicial-paper-copy":
      return {
        kind: form.kind,
        courtLevel: form.courtLevel,
        pageCount: positiveInteger(form.pageCount),
        copyCount: positiveInteger(form.copyCount)
      };
    case "named-search":
      return { kind: form.kind, nameCount: positiveInteger(form.nameCount), yearCount: positiveInteger(form.yearCount) };
    case "theoretical-search":
      return { kind: form.kind, matterCount: positiveInteger(form.matterCount) };
    case "translation":
      return form.sourceKind === "judicial-paper"
        ? {
            kind: form.kind,
            pageCount: positiveInteger(form.pageCount),
            copyCount: positiveInteger(form.copyCount),
            sourceKind: form.sourceKind,
            courtLevel: form.courtLevel
          }
        : {
            kind: form.kind,
            pageCount: positiveInteger(form.pageCount),
            copyCount: positiveInteger(form.copyCount),
            sourceKind: form.sourceKind,
            caseReference: requiredCaseReference(form.caseReference),
            priorRegistryFeeMillieme: priorRegistryFee(form.priorRegistryFeePounds)
          };
    case "order":
      return { kind: form.kind, courtLevel: form.courtLevel, documentCount: positiveInteger(form.documentCount) };
    case "cassation-memorandum":
      return { kind: form.kind, pageCount: positiveInteger(form.pageCount) };
    case "announcement":
      return { kind: form.kind, courtLevel: form.courtLevel, originalPageCount: positiveInteger(form.pageCount) };
    case "execution": {
      const common = {
        kind: form.kind,
        requestKind: form.executionRequestKind,
        instrumentKind: form.executionInstrumentKind,
        executableFormulaConfirmed: form.executableFormulaConfirmed,
        executionAmountMillieme: positiveMoney(form.executionAmountPounds),
        ...(form.executionRequestKind === "repeat"
          ? { sameTypePriorExecutionReference: requiredReference(form.sameTypePriorExecutionReference, "SAME_TYPE_PRIOR_EXECUTION_REFERENCE_REQUIRED") }
          : {})
      } as const;
      return form.executionFeeBasis === "relative"
        ? { ...common, feeBasis: "relative" }
        : {
            ...common,
            feeBasis: "fixed",
            underlyingFixedFeeMillieme: positiveMoney(form.underlyingFixedFeePounds),
            underlyingAssessmentReference: requiredReference(form.underlyingAssessmentReference, "UNDERLYING_ASSESSMENT_REFERENCE_REQUIRED")
          };
    }
    case "executive-formula-other-authority":
      return {
        kind: form.kind,
        issuerAuthority: requiredReference(form.issuerAuthority, "ISSUER_AUTHORITY_REQUIRED"),
        requestedAuthority: requiredReference(form.requestedAuthority, "REQUESTED_AUTHORITY_REQUIRED"),
        documentCount: positiveInteger(form.documentCount)
      };
    case "attestation":
      return { kind: form.kind, pageCount: positiveInteger(form.pageCount) };
    case "power-of-attorney-attestation":
      return { kind: form.kind, pageCount: positiveInteger(form.pageCount), caseFileHalfRate: form.caseFileHalfRate };
    case "signature-or-seal-certification":
      return { kind: form.kind, markCount: positiveInteger(form.markCount) };
    case "foreign-use-authentication":
      return { kind: form.kind, authenticationCount: positiveInteger(form.authenticationCount) };
    case "external-authentication": {
      const travelExpenseMillieme = nonNegativeMoney(form.travelExpensePounds);
      return {
        kind: form.kind,
        authenticationKind: form.authenticationKind,
        chargeableUnitCount: positiveInteger(form.chargeableUnitCount),
        travelExpenseMillieme,
        ...(travelExpenseMillieme > 0
          ? { travelExpenseReference: requiredReference(form.travelExpenseReference, "TRAVEL_EXPENSE_REFERENCE_REQUIRED") }
          : {})
      };
    }
  }
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("INVALID_UNIT_COUNT");
  return parsed;
}

function requiredCaseReference(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) throw new Error("CASE_REFERENCE_REQUIRED");
  return normalized;
}

function priorRegistryFee(value: string): number {
  const pounds = Number(value);
  const millieme = pounds * 1000;
  if (!Number.isFinite(pounds) || !Number.isSafeInteger(millieme) || millieme < 0 || millieme > 100_000) {
    throw new Error("INVALID_PRIOR_REGISTRY_FEE");
  }
  return millieme;
}

function positiveMoney(value: string): number {
  const millieme = nonNegativeMoney(value);
  if (millieme <= 0) throw new Error("INVALID_MONEY");
  return millieme;
}

function nonNegativeMoney(value: string): number {
  const pounds = Number(value);
  const millieme = pounds * 1000;
  if (!Number.isFinite(pounds) || !Number.isSafeInteger(millieme) || millieme < 0) throw new Error("INVALID_MONEY");
  return millieme;
}

function requiredReference(value: string, errorCode: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 200) throw new Error(errorCode);
  return normalized;
}
