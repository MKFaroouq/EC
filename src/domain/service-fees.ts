import { RULE_SET } from "./catalog.js";
import { calculateProgressiveRelative, formatMoney } from "./calculate.js";
import type { CourtLevel, FeeLine, SourceRef } from "./types.js";

const POUND = 1000;
const MARTYRS_STAMP_THRESHOLD = 15 * POUND;

const law126Source: SourceRef = {
  id: "law-126-2009-official",
  title: "القانون رقم 126 لسنة 2009 بتعديل بعض أحكام قوانين الرسوم القضائية",
  article: "المواد 30 إلى 35 و42",
  url: "https://manshurat.org/node/27814"
};

const courtBuildingsSource: SourceRef = {
  id: "law-96-1980-court-buildings",
  title: "القانون رقم 96 لسنة 1980 بفرض رسم إضافي لدور المحاكم",
  article: "المادة 1 والجدول المرفق",
  url: "https://manshurat.org/node/34239"
};

const martyrsSource: SourceRef = {
  id: "law-4-2021-martyrs",
  title: "القانون رقم 4 لسنة 2021 بتعديل قانون صندوق تكريم الشهداء",
  article: "المادة 7",
  url: "https://manshurat.org/node/71357"
};

const executionSource: SourceRef = {
  id: "law-90-1944-execution-official",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته - نشر محكمة النقض",
  article: "المواد 43 و46 مكررًا و54 و55",
  url: "https://register.cc.gov.eg/publications/145/download"
};

const attestationSource: SourceRef = {
  id: "law-90-1944-attestations-official",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته - نشر محكمة النقض",
  article: "المواد 57 و60 و68 و72 إلى 74",
  url: "https://register.cc.gov.eg/publications/144/download"
};

export type ExecutionRequestKind = "initial" | "repeat";
export type ExecutionInstrumentKind =
  | "partial-judgment-or-payment-order"
  | "primary-appeal-judgment-or-payment-order"
  | "cassation-judgment"
  | "official-contract-or-attestation"
  | "arbitral-award"
  | "enforceable-administrative-order";

type ExecutionInputBase = {
  kind: "execution";
  requestKind: ExecutionRequestKind;
  instrumentKind: ExecutionInstrumentKind;
  executableFormulaConfirmed: boolean;
  sameTypePriorExecutionReference?: string;
};

export type ExecutionServiceInput = ExecutionInputBase & (
  | {
      feeBasis: "relative";
      executionAmountMillieme: number;
    }
  | {
      feeBasis: "fixed";
      underlyingFixedFeeMillieme: number;
      underlyingAssessmentReference: string;
      executionAmountMillieme?: number;
    }
);

export type CourtServiceInput =
  | { kind: "registry-copy"; caseReference: string; priorRegistryFeeMillieme: number; pageCount: number; copyCount: number }
  | { kind: "certificate"; caseReference: string; priorRegistryFeeMillieme: number; pageCount: number; copyCount: number }
  | { kind: "judicial-paper-copy"; courtLevel: CourtLevel; pageCount: number; copyCount: number }
  | { kind: "named-search"; nameCount: number; yearCount: number }
  | { kind: "theoretical-search"; matterCount: number }
  | {
      kind: "translation";
      pageCount: number;
      copyCount: number;
      sourceKind: "registry";
      caseReference: string;
      priorRegistryFeeMillieme: number;
    }
  | {
      kind: "translation";
      pageCount: number;
      copyCount: number;
      sourceKind: "judicial-paper";
      courtLevel: CourtLevel;
    }
  | { kind: "order"; courtLevel: CourtLevel; documentCount: number }
  | { kind: "cassation-memorandum"; pageCount: number }
  | { kind: "announcement"; courtLevel: CourtLevel; originalPageCount: number }
  | ExecutionServiceInput
  | { kind: "executive-formula-other-authority"; issuerAuthority: string; requestedAuthority: string; documentCount: number }
  | { kind: "attestation"; pageCount: number }
  | { kind: "power-of-attorney-attestation"; pageCount: number; caseFileHalfRate: boolean }
  | { kind: "signature-or-seal-certification"; markCount: number }
  | { kind: "foreign-use-authentication"; authenticationCount: number }
  | {
      kind: "external-authentication";
      authenticationKind: "attestation" | "certification";
      chargeableUnitCount: number;
      travelExpenseMillieme: number;
      travelExpenseReference?: string;
    };

export interface CourtServiceCalculationResult {
  ruleSetId: string;
  ruleSetVersion: string;
  calculatedAt: string;
  totalMillieme: number;
  lines: FeeLine[];
  warnings: string[];
  input: CourtServiceInput;
}

export function calculateRegistryCopyFee(pageCount: number, copyCount: number, priorRegistryFeeMillieme = 0): number {
  validatePriorRegistryFee(priorRegistryFeeMillieme);
  const fee = multiplyUnitFee(500, pageCount, copyCount);
  const remainingCaseCap = (100 * POUND) - priorRegistryFeeMillieme;
  return Math.min(fee, remainingCaseCap);
}

export function calculateJudicialPaperCopyFee(
  level: CourtLevel,
  pageCount: number,
  copyCount: number
): number {
  return multiplyUnitFee(courtDocumentRate(level), pageCount, copyCount);
}

export function calculateNamedSearchFee(nameCount: number, yearCount: number): number {
  return multiplyUnitFee(150, nameCount, yearCount);
}

export function calculateTheoreticalSearchFee(matterCount: number): number {
  return multiplyUnitFee(500, matterCount);
}

export function calculateTranslationFee(pageCount: number): number {
  return multiplyUnitFee(500, pageCount);
}

export function calculateOrderFee(level: CourtLevel, documentCount: number): number {
  return multiplyUnitFee(courtDocumentRate(level), documentCount);
}

export function calculateCassationMemorandumFee(pageCount: number): number {
  return multiplyUnitFee(500, pageCount);
}

export function calculateAnnouncementFee(level: CourtLevel, originalPageCount: number): number {
  return multiplyUnitFee(courtDocumentRate(level), originalPageCount);
}

export function calculateExecutionPrincipalFee(
  underlyingFeeMillieme: number,
  requestKind: ExecutionRequestKind
): number {
  validatePositiveMoney(underlyingFeeMillieme);
  const divisor = requestKind === "initial" ? 3 : requestKind === "repeat" ? 9 : 0;
  if (!divisor) throw new Error("INVALID_EXECUTION_REQUEST_KIND");
  return Math.max(500, Math.round(underlyingFeeMillieme / divisor));
}

export function calculateExecutionFixedSurcharge(
  instrumentKind: ExecutionInstrumentKind,
  requestKind: ExecutionRequestKind,
  executionAmountMillieme?: number
): number {
  if (executionAmountMillieme !== undefined) {
    validateNonNegativeMoney(executionAmountMillieme);
    if (executionAmountMillieme < 15 * POUND) return 0;
  }
  const initialFee = executionFixedSurchargeRate(instrumentKind);
  if (requestKind === "initial") return initialFee;
  if (requestKind === "repeat") return Math.max(500, Math.round(initialFee / 3));
  throw new Error("INVALID_EXECUTION_REQUEST_KIND");
}

export function calculateAttestationFee(pageCount: number): number {
  validateUnitCount(pageCount);
  return (5 * POUND) + ((pageCount - 1) * POUND);
}

export function calculatePowerOfAttorneyFee(pageCount: number, caseFileHalfRate: boolean): number {
  validateUnitCount(pageCount);
  const fullFee = (2 * POUND) + ((pageCount - 1) * 500);
  return caseFileHalfRate ? Math.round(fullFee / 2) : fullFee;
}

export function calculateSignatureCertificationFee(markCount: number): number {
  return multiplyUnitFee(POUND, markCount);
}

export function calculateCourtServiceFees(
  input: CourtServiceInput,
  now = new Date()
): CourtServiceCalculationResult {
  const baseLines: FeeLine[] = [];
  const ancillaryLines: FeeLine[] = [];
  const additionalWarnings: string[] = [];

  switch (input.kind) {
    case "registry-copy":
    case "certificate": {
      const caseReference = requireCaseReference(input.caseReference);
      const rawAmount = multiplyUnitFee(500, input.pageCount, input.copyCount);
      const amount = calculateRegistryCopyFee(input.pageCount, input.copyCount, input.priorRegistryFeeMillieme);
      baseLines.push(serviceLine(
        "REGISTRY_COPY_OR_CERTIFICATE",
        input.kind === "certificate" ? "رسم الشهادة أو الملخص من السجل" : "رسم الصورة المستخرجة من السجل",
        amount,
        `${input.pageCount} صفحة × ${input.copyCount} نسخة في الدعوى ${caseReference}`,
        `الرسم الخام ${formatMoney(rawAmount)}؛ سبق احتساب ${formatMoney(input.priorRegistryFeeMillieme)}؛ المستحق هو الأقل من الرسم الخام والمتبقي من حد 100 جنيه للدعوى`,
        "المادة 30"
      ));
      ancillaryLines.push(buildingsLine(
        input.kind === "certificate" ? "COURT_BUILDINGS_CERTIFICATE" : "COURT_BUILDINGS_COPY",
        input.kind === "certificate" ? "الرسم الإضافي للشهادة" : "الرسم الإضافي للصورة",
        input.kind === "certificate" ? 600 : 800,
        input.kind === "certificate" ? "بند الشهادات" : "بند الصور والأوراق القضائية"
      ));
      break;
    }
    case "judicial-paper-copy": {
      const amount = calculateJudicialPaperCopyFee(input.courtLevel, input.pageCount, input.copyCount);
      baseLines.push(serviceLine(
        "JUDICIAL_PAPER_COPY",
        "رسم صورة من الأوراق القضائية",
        amount,
        `${input.pageCount} صفحة × ${input.copyCount} نسخة أمام ${courtLevelLabel(input.courtLevel)}`,
        `${formatMoney(courtDocumentRate(input.courtLevel))} لكل صفحة`,
        "المادة 30"
      ));
      ancillaryLines.push(buildingsLine("COURT_BUILDINGS_COPY", "الرسم الإضافي للصورة", 800, "بند الصور والأوراق القضائية"));
      break;
    }
    case "named-search": {
      const amount = calculateNamedSearchFee(input.nameCount, input.yearCount);
      baseLines.push(serviceLine(
        "NAMED_SEARCH",
        "رسم الكشف بالاسم",
        amount,
        `${input.nameCount} اسم × ${input.yearCount} سنة`,
        "0.15 جنيه عن كل اسم في كل سنة، مستقل عن رسم الصورة أو الشهادة",
        "المادة 31"
      ));
      break;
    }
    case "theoretical-search": {
      const amount = calculateTheoreticalSearchFee(input.matterCount);
      baseLines.push(serviceLine(
        "THEORETICAL_SEARCH",
        "رسم الكشف النظري",
        amount,
        `${input.matterCount} مادة بحث`,
        "0.50 جنيه عن كل مادة",
        "المادة 31"
      ));
      break;
    }
    case "translation": {
      const translationAmount = calculateTranslationFee(input.pageCount);
      baseLines.push(serviceLine(
        "TRANSLATION",
        "رسم ترجمة الأوراق",
        translationAmount,
        `${input.pageCount} صفحة من الأصل المطلوب ترجمته`,
        "0.50 جنيه لكل صفحة، بالإضافة إلى رسم الصورة المقرر بالمادة 30",
        "المادة 32"
      ));

      const copyAmount = input.sourceKind === "registry"
        ? calculateRegistryCopyFee(input.pageCount, input.copyCount, input.priorRegistryFeeMillieme)
        : calculateJudicialPaperCopyFee(requireCourtLevel(input.courtLevel), input.pageCount, input.copyCount);
      baseLines.push(serviceLine(
        input.sourceKind === "registry" ? "REGISTRY_COPY_OR_CERTIFICATE" : "JUDICIAL_PAPER_COPY",
        input.sourceKind === "registry" ? "رسم الصورة المصاحبة للترجمة من السجل" : "رسم الصورة القضائية المصاحبة للترجمة",
        copyAmount,
        input.sourceKind === "registry"
          ? `${input.pageCount} صفحة × ${input.copyCount} نسخة في الدعوى ${requireCaseReference(input.caseReference)}`
          : `${input.pageCount} صفحة × ${input.copyCount} نسخة`,
        input.sourceKind === "registry"
          ? `0.50 جنيه لكل صفحة؛ سبق احتساب ${formatMoney(input.priorRegistryFeeMillieme)} ويطبق المتبقي من حد 100 جنيه للدعوى`
          : `${formatMoney(courtDocumentRate(requireCourtLevel(input.courtLevel)))} لكل صفحة`,
        "المادتان 30 و32"
      ));
      ancillaryLines.push(buildingsLine("COURT_BUILDINGS_COPY", "الرسم الإضافي للصورة المصاحبة للترجمة", 800, "بند الصور والأوراق القضائية"));
      break;
    }
    case "order": {
      const amount = calculateOrderFee(input.courtLevel, input.documentCount);
      baseLines.push(serviceLine(
        "ORDER_FEE",
        "رسم الأمر القضائي",
        amount,
        `${input.documentCount} أمر أمام ${courtLevelLabel(input.courtLevel)}`,
        `${formatMoney(courtDocumentRate(input.courtLevel))} لكل أمر من الأوامر الخاضعة للمادة 34`,
        "المادة 34"
      ));
      break;
    }
    case "cassation-memorandum": {
      const amount = calculateCassationMemorandumFee(input.pageCount);
      baseLines.push(serviceLine(
        "CASSATION_MEMORANDUM",
        "رسم مذكرة مقدمة لقلم كتاب محكمة النقض",
        amount,
        `${input.pageCount} صفحة`,
        "0.50 جنيه عن كل صفحة من أصل المذكرة",
        "المادة 35"
      ));
      break;
    }
    case "announcement": {
      const amount = calculateAnnouncementFee(input.courtLevel, input.originalPageCount);
      baseLines.push(serviceLine(
        "ANNOUNCEMENT_FEE",
        "رسم الإعلان القضائي الخاضع للمادة 42",
        amount,
        `${input.originalPageCount} صفحة من أصل الإعلان أمام ${courtLevelLabel(input.courtLevel)}`,
        `${formatMoney(courtDocumentRate(input.courtLevel))} لكل صفحة من الأصل`,
        "المادة 42"
      ));
      ancillaryLines.push(buildingsLine("COURT_BUILDINGS_ANNOUNCEMENT", "الرسم الإضافي للإعلان أو العرض", POUND, "بند الإعلانات والعروض"));
      break;
    }
    case "execution": {
      if (!input.executableFormulaConfirmed) throw new Error("EXECUTABLE_FORMULA_REQUIRED");
      const repeatReference = input.requestKind === "repeat"
        ? requireReference(input.sameTypePriorExecutionReference, "SAME_TYPE_PRIOR_EXECUTION_REFERENCE_REQUIRED")
        : undefined;
      const executionAmount = input.executionAmountMillieme;
      if (executionAmount !== undefined) validatePositiveMoney(executionAmount);

      let underlyingFee: number;
      let underlyingBasis: string;
      if (input.feeBasis === "relative") {
        underlyingFee = calculateProgressiveRelative(input.executionAmountMillieme);
        underlyingBasis = `قيمة التنفيذ ${formatMoney(input.executionAmountMillieme)}؛ الرسم النسبي المقابل ${formatMoney(underlyingFee)}`;
      } else {
        validatePositiveMoney(input.underlyingFixedFeeMillieme);
        const assessmentReference = requireReference(input.underlyingAssessmentReference, "UNDERLYING_ASSESSMENT_REFERENCE_REQUIRED");
        underlyingFee = input.underlyingFixedFeeMillieme;
        underlyingBasis = `الرسم الثابت السابق تقديره ${formatMoney(underlyingFee)} بموجب ${assessmentReference}`;
      }

      const principal = calculateExecutionPrincipalFee(underlyingFee, input.requestKind);
      const divisor = input.requestKind === "initial" ? 3 : 9;
      baseLines.push(serviceLine(
        "EXECUTION_PRINCIPAL",
        input.requestKind === "initial" ? "رسم التنفيذ الأصلي" : "رسم إعادة التنفيذ على النوع الواحد",
        principal,
        repeatReference ? `${underlyingBasis}؛ مرجع التنفيذ السابق: ${repeatReference}` : underlyingBasis,
        `${auditMoney(underlyingFee)} جنيه ÷ ${divisor} = ${auditMoney(principal)} جنيه بعد التقريب إلى أقرب مليم، مع حد أدنى 0.500 جنيه`,
        "المواد 43 و54 و55",
        executionSource,
        "operational"
      ));

      const fixedSurcharge = calculateExecutionFixedSurcharge(input.instrumentKind, input.requestKind, executionAmount);
      if (fixedSurcharge > 0) {
        const initialSurcharge = executionFixedSurchargeRate(input.instrumentKind);
        baseLines.push(serviceLine(
          "EXECUTION_FIXED_SURCHARGE",
          "الرسم الثابت الإضافي على التنفيذ",
          fixedSurcharge,
          executionInstrumentLabel(input.instrumentKind),
          input.requestKind === "initial"
            ? `${auditMoney(initialSurcharge)} جنيه قيمة ثابتة`
            : `${auditMoney(initialSurcharge)} جنيه ÷ 3 = ${auditMoney(fixedSurcharge)} جنيه بعد التقريب إلى أقرب مليم، وبحد أدنى 0.500 جنيه`,
          "المادة 46 مكررًا",
          executionSource,
          input.requestKind === "repeat" ? "operational" : "verified"
        ));
      } else {
        additionalWarnings.push("أُعفي الرسم الثابت الإضافي للتنفيذ لأن المبلغ المطلوب تنفيذه أقل من 15 جنيهًا.");
      }
      break;
    }
    case "executive-formula-other-authority": {
      const issuer = requireReference(input.issuerAuthority, "ISSUER_AUTHORITY_REQUIRED");
      const requested = requireReference(input.requestedAuthority, "REQUESTED_AUTHORITY_REQUIRED");
      if (normalizedReference(issuer) === normalizedReference(requested)) throw new Error("DIFFERENT_AUTHORITY_REQUIRED");
      const amount = multiplyUnitFee(POUND, input.documentCount);
      baseLines.push(serviceLine(
        "EXECUTIVE_FORMULA_OTHER_AUTHORITY",
        "رسم وضع الصيغة التنفيذية من جهة غير الجهة المصدرة",
        amount,
        `${input.documentCount} حكم أو إشهاد؛ الجهة المصدرة: ${issuer}؛ الجهة الطالبة: ${requested}`,
        `1.000 جنيه × ${input.documentCount}`,
        "المادة 57",
        attestationSource
      ));
      break;
    }
    case "attestation": {
      const amount = calculateAttestationFee(input.pageCount);
      baseLines.push(serviceLine(
        "ATTESTATION",
        "رسم الإشهاد",
        amount,
        `${input.pageCount} ورقة`,
        `5.000 جنيه للورقة الأولى + 1.000 جنيه × ${input.pageCount - 1} ورقة زائدة`,
        "المادة 68",
        attestationSource
      ));
      break;
    }
    case "power-of-attorney-attestation": {
      const amount = calculatePowerOfAttorneyFee(input.pageCount, input.caseFileHalfRate);
      const fullFee = calculatePowerOfAttorneyFee(input.pageCount, false);
      baseLines.push(serviceLine(
        "POWER_OF_ATTORNEY_ATTESTATION",
        "رسم الإشهاد بالتوكيل أو عزل الوكيل",
        amount,
        `${input.pageCount} ورقة${input.caseFileHalfRate ? "؛ توكيل أو عزل ثابت بغير إشهاد أو تصديق ومقدم أو مبدى في قضية" : ""}`,
        input.caseFileHalfRate
          ? `${auditMoney(fullFee)} جنيه ÷ 2 = ${auditMoney(amount)} جنيه`
          : `2.000 جنيه للورقة الأولى + 0.500 جنيه × ${input.pageCount - 1} ورقة زائدة`,
        "المادة 72",
        attestationSource
      ));
      break;
    }
    case "signature-or-seal-certification": {
      const amount = calculateSignatureCertificationFee(input.markCount);
      baseLines.push(serviceLine(
        "SIGNATURE_OR_SEAL_CERTIFICATION",
        "رسم التصديق على إمضاء أو ختم",
        amount,
        `${input.markCount} إمضاء أو ختم`,
        `1.000 جنيه × ${input.markCount}`,
        "المادة 73",
        attestationSource
      ));
      break;
    }
    case "foreign-use-authentication": {
      const amount = multiplyUnitFee(POUND, input.authenticationCount);
      baseLines.push(serviceLine(
        "FOREIGN_USE_AUTHENTICATION",
        "رسم اعتماد ختم المحكمة للاستعمال خارج القطر",
        amount,
        `${input.authenticationCount} تأشيرة اعتماد`,
        `1.000 جنيه × ${input.authenticationCount}`,
        "المادة 60",
        attestationSource
      ));
      break;
    }
    case "external-authentication": {
      const baseRate = input.authenticationKind === "attestation" ? 5 * POUND : 1_500;
      const amount = multiplyUnitFee(baseRate, input.chargeableUnitCount);
      baseLines.push(serviceLine(
        input.authenticationKind === "attestation" ? "EXTERNAL_ATTESTATION" : "EXTERNAL_CERTIFICATION",
        input.authenticationKind === "attestation" ? "رسم الانتقال خارج المحكمة للإشهاد" : "رسم الانتقال خارج المحكمة للتصديق",
        amount,
        `${input.chargeableUnitCount} وحدة استحقاق وفق تعدد الإشهادات أو الطالبين مع اختلاف المواد`,
        `${auditMoney(baseRate)} جنيه × ${input.chargeableUnitCount}`,
        "المادة 74",
        attestationSource
      ));
      validateNonNegativeMoney(input.travelExpenseMillieme);
      if (input.travelExpenseMillieme > 0) {
        const travelReference = requireReference(input.travelExpenseReference, "TRAVEL_EXPENSE_REFERENCE_REQUIRED");
        ancillaryLines.push(serviceLine(
          "EXTERNAL_TRAVEL_EXPENSE",
          "مصاريف الانتقال المثبتة",
          input.travelExpenseMillieme,
          travelReference,
          `${auditMoney(input.travelExpenseMillieme)} جنيه وفق مستند المأمورية، دون اشتقاق آلي`,
          "المادة 74",
          attestationSource
        ));
      }
      break;
    }
    default:
      throw new Error("UNSUPPORTED_SERVICE_KIND");
  }

  const judicialServiceTotal = baseLines.reduce((sum, line) => sum + line.amountMillieme, 0);
  const lines = [...baseLines, ...ancillaryLines];
  if (judicialServiceTotal > MARTYRS_STAMP_THRESHOLD) {
    lines.push({
      code: "MARTYRS_STAMP",
      label: "طابع صندوق تكريم الشهداء",
      amountMillieme: 5 * POUND,
      basis: `الرسم القضائي للخدمة ${formatMoney(judicialServiceTotal)} ويجاوز 15 جنيهًا`,
      calculation: "5.00 جنيه مرة واحدة للخدمة، دون تعدد بتعدد المستندات اللازمة لها",
      ruleVersion: RULE_SET.version,
      confidence: "verified",
      source: martyrsSource
    });
  }

  return {
    ruleSetId: RULE_SET.id,
    ruleSetVersion: RULE_SET.version,
    calculatedAt: now.toISOString(),
    totalMillieme: lines.reduce((sum, line) => sum + line.amountMillieme, 0),
    lines,
    warnings: [
      "هذا تقدير آلي لخدمة قضائية وليس أمر تحصيل؛ يلزم اعتماد الموظف المختص قبل الإصدار.",
      "لم تُضف ضريبة الدمغة أو رسم تنمية موارد الدولة قبل اعتماد وعاء كل منهما لهذه الخدمة.",
      ...additionalWarnings
    ],
    input
  };
}

function serviceLine(
  code: string,
  label: string,
  amountMillieme: number,
  basis: string,
  calculation: string,
  article: string,
  source: SourceRef = law126Source,
  confidence: FeeLine["confidence"] = "verified"
): FeeLine {
  return {
    code,
    label,
    amountMillieme,
    basis,
    calculation,
    ruleVersion: RULE_SET.version,
    confidence,
    source: { ...source, article }
  };
}

function buildingsLine(code: string, label: string, amountMillieme: number, tableItem: string): FeeLine {
  return {
    code,
    label,
    amountMillieme,
    basis: tableItem,
    calculation: `${formatMoney(amountMillieme)} قيمة ثابتة للخدمة`,
    ruleVersion: RULE_SET.version,
    confidence: "verified",
    source: { ...courtBuildingsSource, article: `المادة 1 والجدول المرفق - ${tableItem}` }
  };
}

function courtDocumentRate(level: CourtLevel): number {
  if (level === "partial") return 250;
  if (level === "primary") return 750;
  if (level === "appeal" || level === "cassation") return 1_500;
  throw new Error("INVALID_COURT_LEVEL");
}

function courtLevelLabel(level: CourtLevel): string {
  return ({ partial: "محكمة جزئية", primary: "محكمة ابتدائية", appeal: "محكمة استئناف", cassation: "محكمة النقض" } as const)[level];
}

function requireCourtLevel(level: CourtLevel | undefined): CourtLevel {
  if (!level) throw new Error("COURT_LEVEL_REQUIRED");
  return level;
}

function requireCaseReference(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) throw new Error("CASE_REFERENCE_REQUIRED");
  return normalized;
}

function requireReference(value: string | undefined, errorCode: string): string {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized || normalized.length > 200) throw new Error(errorCode);
  return normalized;
}

function normalizedReference(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar-EG");
}

function validatePositiveMoney(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("INVALID_MONEY");
}

function validateNonNegativeMoney(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_MONEY");
}

function validateUnitCount(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("INVALID_UNIT_COUNT");
}

function auditMoney(value: number): string {
  validateNonNegativeMoney(value);
  return (value / POUND).toFixed(3);
}

function executionFixedSurchargeRate(instrumentKind: ExecutionInstrumentKind): number {
  if (instrumentKind === "partial-judgment-or-payment-order") return POUND;
  if (
    instrumentKind === "primary-appeal-judgment-or-payment-order"
    || instrumentKind === "cassation-judgment"
    || instrumentKind === "official-contract-or-attestation"
    || instrumentKind === "arbitral-award"
    || instrumentKind === "enforceable-administrative-order"
  ) return 2_500;
  throw new Error("INVALID_EXECUTION_INSTRUMENT_KIND");
}

function executionInstrumentLabel(instrumentKind: ExecutionInstrumentKind): string {
  const labels: Record<ExecutionInstrumentKind, string> = {
    "partial-judgment-or-payment-order": "حكم أو أمر أداء صادر من محكمة جزئية، أو إجراء تنفيذ أمامها",
    "primary-appeal-judgment-or-payment-order": "حكم أو أمر أداء صادر من محكمة ابتدائية أو استئناف، أو إجراء تنفيذ أمامها",
    "cassation-judgment": "حكم محكمة النقض",
    "official-contract-or-attestation": "عقد رسمي أو إشهاد",
    "arbitral-award": "حكم محكمين",
    "enforceable-administrative-order": "أمر إداري يجيز القانون تنفيذه"
  };
  return labels[instrumentKind];
}

function validatePriorRegistryFee(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100 * POUND) {
    throw new Error("INVALID_PRIOR_REGISTRY_FEE");
  }
}

function multiplyUnitFee(unitMillieme: number, ...counts: number[]): number {
  let units = 1;
  for (const count of counts) {
    validateUnitCount(count);
    units *= count;
    if (!Number.isSafeInteger(units)) throw new Error("INVALID_UNIT_COUNT");
  }
  const amount = unitMillieme * units;
  if (!Number.isSafeInteger(amount)) throw new Error("INVALID_MONEY");
  return amount;
}
