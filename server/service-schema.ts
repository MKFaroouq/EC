import { z } from "zod";

const courtLevelSchema = z.enum(["partial", "primary", "appeal", "cassation"]);
const unitCountSchema = z.number().int().min(1).max(1_000_000);
const moneySchema = z.number().int().min(0).max(10_000_000_000_000);
const positiveMoneySchema = moneySchema.min(1);
const caseReferenceSchema = z.string().trim().min(1).max(120);
const referenceSchema = z.string().trim().min(1).max(200);
const priorRegistryFeeSchema = z.number().int().min(0).max(100_000);
const executionRequestSchema = z.enum(["initial", "repeat"]);
const executionInstrumentSchema = z.enum([
  "partial-judgment-or-payment-order",
  "primary-appeal-judgment-or-payment-order",
  "cassation-judgment",
  "official-contract-or-attestation",
  "arbitral-award",
  "enforceable-administrative-order"
]);

const relativeExecutionSchema = z.object({
  kind: z.literal("execution"),
  requestKind: executionRequestSchema,
  instrumentKind: executionInstrumentSchema,
  executableFormulaConfirmed: z.boolean(),
  sameTypePriorExecutionReference: referenceSchema.optional(),
  feeBasis: z.literal("relative"),
  executionAmountMillieme: positiveMoneySchema
}).strict().superRefine(validateExecutionPreconditions);

const fixedExecutionSchema = z.object({
  kind: z.literal("execution"),
  requestKind: executionRequestSchema,
  instrumentKind: executionInstrumentSchema,
  executableFormulaConfirmed: z.boolean(),
  sameTypePriorExecutionReference: referenceSchema.optional(),
  feeBasis: z.literal("fixed"),
  executionAmountMillieme: positiveMoneySchema.optional(),
  underlyingFixedFeeMillieme: positiveMoneySchema,
  underlyingAssessmentReference: referenceSchema
}).strict().superRefine(validateExecutionPreconditions);

const executiveFormulaSchema = z.object({
  kind: z.literal("executive-formula-other-authority"),
  issuerAuthority: referenceSchema,
  requestedAuthority: referenceSchema,
  documentCount: unitCountSchema
}).strict().superRefine((value, context) => {
  if (normalizeReference(value.issuerAuthority) === normalizeReference(value.requestedAuthority)) {
    context.addIssue({ code: "custom", path: ["requestedAuthority"], message: "DIFFERENT_AUTHORITY_REQUIRED" });
  }
});

const externalAuthenticationSchema = z.object({
  kind: z.literal("external-authentication"),
  authenticationKind: z.enum(["attestation", "certification"]),
  chargeableUnitCount: unitCountSchema,
  travelExpenseMillieme: moneySchema,
  travelExpenseReference: referenceSchema.optional()
}).strict().superRefine((value, context) => {
  if (value.travelExpenseMillieme > 0 && !value.travelExpenseReference) {
    context.addIssue({ code: "custom", path: ["travelExpenseReference"], message: "TRAVEL_EXPENSE_REFERENCE_REQUIRED" });
  }
});

export const serviceInputSchema = z.union([
  z.object({ kind: z.literal("registry-copy"), caseReference: caseReferenceSchema, priorRegistryFeeMillieme: priorRegistryFeeSchema, pageCount: unitCountSchema, copyCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("certificate"), caseReference: caseReferenceSchema, priorRegistryFeeMillieme: priorRegistryFeeSchema, pageCount: unitCountSchema, copyCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("judicial-paper-copy"), courtLevel: courtLevelSchema, pageCount: unitCountSchema, copyCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("named-search"), nameCount: unitCountSchema, yearCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("theoretical-search"), matterCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("translation"), caseReference: caseReferenceSchema, priorRegistryFeeMillieme: priorRegistryFeeSchema, pageCount: unitCountSchema, copyCount: unitCountSchema, sourceKind: z.literal("registry") }).strict(),
  z.object({ kind: z.literal("translation"), pageCount: unitCountSchema, copyCount: unitCountSchema, sourceKind: z.literal("judicial-paper"), courtLevel: courtLevelSchema }).strict(),
  z.object({ kind: z.literal("order"), courtLevel: courtLevelSchema, documentCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("cassation-memorandum"), pageCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("announcement"), courtLevel: courtLevelSchema, originalPageCount: unitCountSchema }).strict(),
  relativeExecutionSchema,
  fixedExecutionSchema,
  executiveFormulaSchema,
  z.object({ kind: z.literal("attestation"), pageCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("power-of-attorney-attestation"), pageCount: unitCountSchema, caseFileHalfRate: z.boolean() }).strict(),
  z.object({ kind: z.literal("signature-or-seal-certification"), markCount: unitCountSchema }).strict(),
  z.object({ kind: z.literal("foreign-use-authentication"), authenticationCount: unitCountSchema }).strict(),
  externalAuthenticationSchema
]);

function validateExecutionPreconditions(
  value: {
    executableFormulaConfirmed: boolean;
    requestKind: "initial" | "repeat";
    sameTypePriorExecutionReference?: string;
  },
  context: z.RefinementCtx
): void {
  if (!value.executableFormulaConfirmed) {
    context.addIssue({ code: "custom", path: ["executableFormulaConfirmed"], message: "EXECUTABLE_FORMULA_REQUIRED" });
  }
  if (value.requestKind === "repeat" && !value.sameTypePriorExecutionReference) {
    context.addIssue({ code: "custom", path: ["sameTypePriorExecutionReference"], message: "SAME_TYPE_PRIOR_EXECUTION_REFERENCE_REQUIRED" });
  }
}

function normalizeReference(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar-EG");
}
