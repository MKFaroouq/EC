import { RULE_SET, caseTypes } from "./catalog.js";
import { resolveFeeTreatment } from "./fee-treatment.js";
import { DEFAULT_JUDICIAL_FEE_RULES, type JudicialFeeRuleConfig } from "./rule-parameters.js";
import type { CalculationResult, CaseType, ClaimValueKind, CourtLevel, EstimateInput, FeeLine, FeeTreatment, FinalClaimItem, SourceRef } from "./types.js";

const POUND = 1000;
const caseTypeById = new Map(caseTypes.map((caseType) => [caseType.id, caseType]));
const PERSONAL_STATUS_FIXED_FEES: Record<string, number> = {
  "family-marriage-objection": 5 * POUND,
  "family-obedience-rights": 5 * POUND,
  "family-nonfinancial-marital-rights": 5 * POUND,
  "family-adoption-record": 5 * POUND,
  "family-adoption-annulment": 5 * POUND,
  "family-personal-guardianship": 5 * POUND,
  "family-estate-seal-inventory": 5 * POUND,
  "family-death-inheritance-lawsuit-unknown": 5 * POUND,
  "family-estate-manager-executor": 10 * POUND,
  "family-estate-liquidator": 10 * POUND,
  "family-marriage-notary-grievance": 2 * POUND,
  "family-temporary-estate-manager": 2 * POUND,
  "family-inventory-seal-grievance": 2 * POUND,
  "family-consensual-divorce-petition": 1 * POUND,
  "family-parentage-acknowledgment-record": 1 * POUND,
  "family-personal-guardian-objection": 1 * POUND,
  "family-death-inheritance-record": 1 * POUND,
  "family-inheritance-acceptance-renunciation": 1 * POUND,
  "family-estate-receipt-liquidation-order": 1 * POUND,
  "family-married-woman-rights-permission": 200,
  "family-parentage-acknowledgment-certification": 200,
  "family-estate-movables-sale-permission": 200,
  "family-executor-delivery-order": 200,
  "family-liquidation-incidental-order": 200,
  "family-sealed-papers-delivery": 200
};

const judicialSource: SourceRef = {
  id: "law-90-1944-amended-126-2009",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 المعدل بالقانون 126 لسنة 2009",
  article: "المواد 1 و3 و7 و9 و54 و55",
  url: "https://www.laweg.net/framePlain.aspx?ItemID=7017&NID=5493&Type=6&action=ViewActivePages"
};

const servicesSource: SourceRef = {
  id: "law-36-1975-services",
  title: "قانون صندوق الخدمات الصحية والاجتماعية رقم 36 لسنة 1975",
  article: "المادة 1 مكرر",
  url: "https://lawhub.info/eg/?p=12470"
};

const lawyersSource: SourceRef = {
  id: "law-147-2019-lawyers",
  title: "القانون رقم 147 لسنة 2019 بتعديل قانون المحاماة",
  article: "المادة 187",
  url: "https://manshurat.org/node/61244"
};

const courtBuildingsSource: SourceRef = {
  id: "law-96-1980-court-buildings",
  title: "القانون رقم 96 لسنة 1980 بفرض رسم إضافي لدور المحاكم",
  article: "المادتان 1 و2 والبند أولًا من الجدول المرفق",
  url: "https://manshurat.org/node/34239"
};

const criminalFeesSource: SourceRef = {
  id: "law-126-2009-official",
  title: "القانون رقم 126 لسنة 2009 بتعديل الرسوم القضائية في المواد المدنية والجنائية وأمام مجلس الدولة",
  article: "المواد الخاصة بالرسوم الجنائية الثابتة",
  url: "https://manshurat.org/node/27814"
};

const stateCouncilSource: SourceRef = {
  id: "decision-549-1959-state-council",
  title: "قرار رئيس الجمهورية رقم 549 لسنة 1959 بشأن الرسوم أمام مجلس الدولة وتعديلاته",
  article: "المادتان 1 و2 بعد التعديل بالقانون 126 لسنة 2009",
  url: "https://manshurat.org/node/60179"
};

const constitutionalSource: SourceRef = {
  id: "law-48-1979-constitutional-court",
  title: "قانون المحكمة الدستورية العليا رقم 48 لسنة 1979",
  article: "المادة 53",
  url: "https://www.manshurat.org/node/63719"
};

const familyProcedureSource: SourceRef = {
  id: "law-1-2000-family-procedure",
  title: "قانون تنظيم بعض أوضاع وإجراءات التقاضي في مسائل الأحوال الشخصية رقم 1 لسنة 2000",
  article: "المادة 3",
  url: "https://manshurat.org/node/27318"
};

const personalStatusFeesSource: SourceRef = {
  id: "law-90-1944-amended-126-2009",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته",
  article: "المادة 49: الرسوم الثابتة في مسائل الأحوال الشخصية",
  url: "https://register.cc.gov.eg/publications/144/download"
};

const civilProcedureSource: SourceRef = {
  id: "law-13-1968-civil-procedure",
  title: "قانون المرافعات المدنية والتجارية رقم 13 لسنة 1968 وتعديلاته",
  article: "المادة 153: كفالة طلب الرد",
  url: "https://manshurat.org/node/32203"
};

const executionSource: SourceRef = {
  id: "law-90-1944-execution-official",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته - رسوم التنفيذ",
  article: "المواد 44 إلى 55",
  url: "https://register.cc.gov.eg/publications/145/download"
};

const finalSettlementSource: SourceRef = {
  id: "cassation-fees-principles",
  title: "مبادئ محكمة النقض في الرسوم القضائية وقانون الرسوم القضائية رقم 90 لسنة 1944",
  article: "المواد 20 و20 مكررًا و21 و22 وقواعد التسوية على المقضي به ورد الرسوم",
  url: "https://register.cc.gov.eg/publications/145/download"
};

const article11AccrualSource: SourceRef = {
  id: "law-90-1944-amended-126-2009",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته",
  article: "المادة 11/خامسًا: تكملة رسوم الريع والإيجار والتعويض اليومي والفوائد حتى الحكم",
  url: "https://register.cc.gov.eg/publications/145/download"
};

const taxProfitFeeSource: SourceRef = {
  id: "law-90-1944-tax-profit-assessment",
  title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته",
  article: "المادة 6/أولًا (6) والمادة 75/سادس عشر: تقدير الأرباح التي تستحق عنها الضرائب",
  url: "https://register.cc.gov.eg/publications/144/download"
};

interface CaseResolution {
  input: EstimateInput;
  assumptions: string[];
  originalOverride?: FeeLine;
  additionalLines?: FeeLine[];
  includeStandardAddons?: boolean;
  automaticExemption?: string;
  warnings?: string[];
}

interface FinalSettlementResolution {
  lines: FeeLine[];
  includeServicesFund: boolean;
  warnings: string[];
  assumptions: string[];
}

export function poundsToMillieme(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_MONEY");
  return Math.round(value * POUND);
}

export function milliemesToPounds(value: number): number {
  return value / POUND;
}

export function calculateProgressiveRelative(amountMillieme: number, rules: JudicialFeeRuleConfig = DEFAULT_JUDICIAL_FEE_RULES): number {
  if (!Number.isInteger(amountMillieme) || amountMillieme < 0) throw new Error("INVALID_MONEY");
  const roundedPounds = Math.ceil(amountMillieme / POUND);
  if (roundedPounds === 0) return 0;
  if (roundedPounds <= rules.relative.smallClaimThresholdPounds) return rules.relative.smallClaimFeeMillieme;

  let remaining = roundedPounds;
  let feeMillieme = 0;
  const bands = [
    { width: rules.relative.firstBandLimitPounds, rateBasisPoints: rules.relative.firstBandRateBasisPoints },
    { width: rules.relative.secondBandLimitPounds - rules.relative.firstBandLimitPounds, rateBasisPoints: rules.relative.secondBandRateBasisPoints },
    { width: rules.relative.thirdBandLimitPounds - rules.relative.secondBandLimitPounds, rateBasisPoints: rules.relative.thirdBandRateBasisPoints }
  ];
  for (const band of bands) {
    const slice = Math.min(remaining, band.width);
    feeMillieme += Math.round((slice * POUND * band.rateBasisPoints) / 10_000);
    remaining -= slice;
    if (remaining <= 0) break;
  }
  if (remaining > 0) feeMillieme += Math.round((remaining * POUND * rules.relative.topRateBasisPoints) / 10_000);
  return Math.max(feeMillieme, rules.relative.minimumFeeMillieme);
}

export function filingCollectionCap(amountMillieme: number, rules: JudicialFeeRuleConfig = DEFAULT_JUDICIAL_FEE_RULES): number {
  const pounds = Math.ceil(amountMillieme / POUND);
  if (pounds <= rules.filingCap.firstThresholdPounds) return rules.filingCap.firstCapMillieme;
  if (pounds <= rules.filingCap.secondThresholdPounds) return rules.filingCap.secondCapMillieme;
  if (pounds <= rules.filingCap.thirdThresholdPounds) return rules.filingCap.thirdCapMillieme;
  return rules.filingCap.topCapMillieme;
}

export function unknownValueFee(level: CourtLevel, urgent: boolean, rules: JudicialFeeRuleConfig = DEFAULT_JUDICIAL_FEE_RULES): number {
  if (level === "cassation") return rules.unknownFixed.cassationFeeMillieme;
  if (level === "appeal") return urgent ? rules.unknownFixed.urgentAppealFeeMillieme : rules.unknownFixed.appealFeeMillieme;
  if (urgent) return rules.unknownFixed.urgentFeeMillieme;
  return level === "partial" ? rules.unknownFixed.partialFeeMillieme : rules.unknownFixed.primaryFeeMillieme;
}

export function lawyerFee(level: CourtLevel, urgent: boolean, rules: JudicialFeeRuleConfig = DEFAULT_JUDICIAL_FEE_RULES): number {
  if (level === "cassation") return rules.lawyer.cassationFeeMillieme;
  if (level === "appeal") return rules.lawyer.appealFeeMillieme;
  if (urgent) return rules.lawyer.urgentFeeMillieme;
  if (level === "primary") return rules.lawyer.primaryFeeMillieme;
  return rules.lawyer.partialFeeMillieme;
}

export function calculateCourtBuildingsFee(
  level: CourtLevel,
  valueKind: ClaimValueKind,
  claimAmountMillieme?: number,
  rules: JudicialFeeRuleConfig = DEFAULT_JUDICIAL_FEE_RULES
): number {
  if (level === "cassation") return rules.courtBuildings.cassationFeeMillieme;
  if (level === "appeal") return rules.courtBuildings.appealFeeMillieme;
  if (level === "primary") return rules.courtBuildings.primaryFeeMillieme;
  if (valueKind === "unknown") return rules.courtBuildings.unknownPartialFeeMillieme;
  if (!Number.isInteger(claimAmountMillieme) || (claimAmountMillieme ?? -1) < 0) throw new Error("CLAIM_AMOUNT_REQUIRED");
  if ((claimAmountMillieme ?? 0) <= rules.courtBuildings.partialExemptUpToPounds * POUND) return 0;
  return (claimAmountMillieme ?? 0) <= rules.courtBuildings.partialLowUpToPounds * POUND
    ? rules.courtBuildings.partialLowFeeMillieme
    : rules.courtBuildings.partialHighFeeMillieme;
}

function courtLevelLabel(level: CourtLevel): string {
  return ({ partial: "جزئي", primary: "ابتدائي", appeal: "استئناف", cassation: "نقض" } as const)[level];
}

function originalFee(input: EstimateInput, rules: JudicialFeeRuleConfig, ruleVersion: string): FeeLine {
  if (input.valueKind === "unknown") {
    const amount = unknownValueFee(input.courtLevel, input.urgent, rules);
    return {
      code: "ORIGINAL_FIXED",
      label: "الرسم القضائي الأصلي: مجهول القيمة",
      amountMillieme: amount,
      basis: `درجة المحكمة: ${courtLevelLabel(input.courtLevel)}${input.urgent ? "، طلب مستعجل" : ""}`,
      calculation: `${milliemesToPounds(amount).toFixed(2)} جنيه رسم ثابت`,
      ruleVersion,
      confidence: "verified",
      source: judicialSource
    };
  }

  const claimAmount = input.claimAmountMillieme ?? 0;
  if (input.stage === "filing") {
    const gross = calculateProgressiveRelative(claimAmount, rules);
    const cap = filingCollectionCap(claimAmount, rules);
    const amount = Math.min(gross, cap);
    return {
      code: "ORIGINAL_RELATIVE_FILING",
      label: "الرسم القضائي الأصلي: المحصل عند الرفع",
      amountMillieme: amount,
      basis: `قيمة الدعوى بعد جبر كسر الجنيه: ${Math.ceil(claimAmount / POUND).toLocaleString("ar-EG")} جنيه`,
      calculation: `رسم الشرائح ${formatMoney(gross)}؛ حد التحصيل ${formatMoney(cap)}؛ المستحق هو الأقل`,
      ruleVersion,
      confidence: "verified",
      source: judicialSource
    };
  }

  const awarded = input.finalOutcome === "judgment-full"
    ? claimAmount
    : input.finalOutcome === "judgment-partial"
      ? input.awardedAmountMillieme ?? 0
      : 0;
  const finalGross = calculateProgressiveRelative(awarded, rules);
  const prepaid = input.prepaidOriginalMillieme ?? Math.min(calculateProgressiveRelative(claimAmount, rules), filingCollectionCap(claimAmount, rules));
  const amount = Math.max(0, finalGross - prepaid);
  return {
    code: "ORIGINAL_RELATIVE_SETTLEMENT",
    label: "تسوية الرسم القضائي الأصلي: نهاية الدعوى",
    amountMillieme: amount,
    basis: `المقضي به: ${formatMoney(awarded)}؛ السابق سداده: ${formatMoney(prepaid)}`,
    calculation: `الرسم الكامل على المقضي به ${formatMoney(finalGross)} − السابق سداده ${formatMoney(prepaid)}`,
    ruleVersion,
    confidence: "verified",
    source: judicialSource
  };
}

function fixedFeeLine(code: string, label: string, amountMillieme: number, basis: string, source: SourceRef): FeeLine {
  return {
    code,
    label,
    amountMillieme,
    basis,
    calculation: `${formatMoney(amountMillieme)} قيمة ثابتة`,
    ruleVersion: RULE_SET.version,
    confidence: "verified",
    source
  };
}

function defaultPrepaidOriginal(input: EstimateInput, rules: JudicialFeeRuleConfig): number {
  if (Number.isInteger(input.prepaidOriginalMillieme) && (input.prepaidOriginalMillieme ?? -1) >= 0) {
    return input.prepaidOriginalMillieme ?? 0;
  }
  if (input.valueKind === "unknown") return unknownValueFee(input.courtLevel, input.urgent, rules);
  const claimAmount = input.claimAmountMillieme ?? 0;
  return Math.min(calculateProgressiveRelative(claimAmount, rules), filingCollectionCap(claimAmount, rules));
}

function applyTreatmentReduction(
  line: FeeLine,
  treatment: FeeTreatment,
  input: EstimateInput,
  rules: JudicialFeeRuleConfig
): FeeLine {
  if (treatment.kind !== "reduced" || line.amountMillieme <= 0) return line;
  const eligible = line.code.startsWith("ORIGINAL_")
    || line.code === "TAX_PROFIT_PERIODS_ORIGINAL"
    || line.code === "FINAL_MULTI_CLAIM_ADJUSTMENT"
    || line.code === "APPEAL_ARTICLE_21_SETTLEMENT"
    || line.code === "PERSONAL_STATUS_INHERITANCE_SETTLEMENT"
    || line.code === "ARTICLE_11_POST_FILING_ACCRUAL"
    || line.code === "COURT_BUILDINGS_FEE";
  if (!eligible) return line;

  const factor = treatment.factorBasisPoints;
  const isFinalAdjustment = input.stage === "final"
    && ["ORIGINAL_RELATIVE_SETTLEMENT", "FINAL_MULTI_CLAIM_ADJUSTMENT", "APPEAL_ARTICLE_21_SETTLEMENT", "PERSONAL_STATUS_INHERITANCE_SETTLEMENT"].includes(line.code);
  const prepaid = isFinalAdjustment ? defaultPrepaidOriginal(input, rules) : 0;
  const reducedAmount = isFinalAdjustment
    ? Math.max(0, Math.round(((line.amountMillieme + prepaid) * factor) / 10_000) - prepaid)
    : Math.round((line.amountMillieme * factor) / 10_000);
  return {
    ...line,
    amountMillieme: reducedAmount,
    basis: `${line.basis}؛ ${treatment.title}`,
    calculation: `${line.calculation}؛ ثم × ${(factor / 10_000).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} = ${formatMoney(reducedAmount)}`,
    source: treatment.source ?? line.source
  };
}

export function calculateFees(
  input: EstimateInput,
  now = new Date(),
  rules: JudicialFeeRuleConfig = DEFAULT_JUDICIAL_FEE_RULES,
  ruleVersion = RULE_SET.version
): CalculationResult {
  if (input.exempt) throw new Error("MANUAL_EXEMPTION_DISABLED");
  const caseResolution = resolveCaseTypeInput(input, rules, ruleVersion);
  input = caseResolution.input;
  const caseType = caseTypeById.get(input.caseTypeId);
  if (!caseType) throw new Error("UNKNOWN_CASE_TYPE");
  const statutoryTreatment = resolveFeeTreatment(input, caseType);
  const treatment: FeeTreatment = statutoryTreatment;
  const automaticExemption = Boolean(caseResolution.automaticExemption) || treatment.kind === "exempt";
  validateInput(automaticExemption ? { ...input, exempt: true } : input);
  if (automaticExemption) {
    const exemption = caseResolution.automaticExemption ?? treatment.reason;
    return {
      ruleSetId: RULE_SET.id,
      ruleSetVersion: ruleVersion,
      calculatedAt: now.toISOString(),
      totalMillieme: 0,
      refundableMillieme: 0,
      lines: [],
      warnings: ["إعفاء قانوني آلي مقصور على الصفة والطلب والمستندات المحددة؛ الطلبات الأخرى في الصحيفة يجب فصلها."],
      assumptions: [exemption ? `سبب الإعفاء: ${exemption}` : "لم يُسجل وصف لسند الإعفاء.", ...caseResolution.assumptions],
      treatment,
      input
    };
  }
  const finalResolution = input.stage === "final" ? resolveFinalSettlement(input, caseType, caseResolution, rules, ruleVersion) : undefined;
  const finalAccrualLines = input.stage === "final" ? resolveFinalAccrualLines(input, rules, ruleVersion) : [];
  const original = finalResolution ? finalResolution.lines[0] : caseResolution.originalOverride ?? originalFee(input, rules, ruleVersion);
  const lawyerAmount = lawyerFee(input.courtLevel, input.urgent, rules);
  const includeStandardAddons = finalResolution
    ? finalResolution.includeServicesFund || finalAccrualLines.length > 0
    : caseResolution.includeStandardAddons !== false;
  const lines: FeeLine[] = (finalResolution ? [...finalResolution.lines, ...finalAccrualLines] : [original])
    .map((line) => applyTreatmentReduction(line, treatment, input, rules));
  const servicesBasis = lines
    .filter((line) => line.amountMillieme > 0 && (line.financialClass ?? "fee") === "fee")
    .reduce((sum, line) => sum + line.amountMillieme, 0);
  if (includeStandardAddons && servicesBasis > 0) {
    const servicesAmount = Math.round((servicesBasis * rules.servicesFundRateBasisPoints) / 10_000);
    lines.push({
      code: "SERVICES_FUND",
      label: "رسم صندوق الخدمات الصحية والاجتماعية",
      amountMillieme: servicesAmount,
      basis: "مجموع الرسوم القضائية الأصلية الإيجابية المستحقة في هذه العملية",
      calculation: `${(rules.servicesFundRateBasisPoints / 100).toLocaleString("ar-EG")}% × ${formatMoney(servicesBasis)}`,
      ruleVersion,
      confidence: "verified",
      source: servicesSource
    });
  }
  if (!finalResolution && caseResolution.additionalLines?.length) lines.push(...caseResolution.additionalLines);

  if (includeStandardAddons && input.stage === "filing") {
    const courtBuildingsAmount = calculateCourtBuildingsFee(input.courtLevel, input.valueKind, input.claimAmountMillieme, rules);
    if (courtBuildingsAmount > 0) {
      lines.push(applyTreatmentReduction({
        code: "COURT_BUILDINGS_FEE",
        label: "الرسم الإضافي لصندوق أبنية دور المحاكم",
        amountMillieme: courtBuildingsAmount,
        basis: input.courtLevel === "partial" && input.valueKind === "known"
          ? `صحيفة افتتاح دعوى جزئية معلومة القيمة بمبلغ ${formatMoney(input.claimAmountMillieme ?? 0)}`
          : `صحيفة دعوى أمام محكمة بدرجة ${courtLevelLabel(input.courtLevel)}${input.valueKind === "unknown" ? "، مجهولة القيمة" : ""}`,
        calculation: input.courtLevel === "partial" && input.valueKind === "known"
          ? ((input.claimAmountMillieme ?? 0) <= 100 * POUND ? "50 قرشًا لأن المطلوب يزيد على 3 جنيهات ولا يجاوز 100 جنيه" : "1.50 جنيه لأن المطلوب يجاوز 100 جنيه")
          : `${formatMoney(courtBuildingsAmount)} طبقًا لفئة درجة المحكمة في الجدول المرفق`,
        ruleVersion,
        confidence: "verified",
        source: courtBuildingsSource
      }, treatment, input, rules));
    }

    lines.push({
      code: "LAWYER_FEE",
      label: "أتعاب المحاماة",
      amountMillieme: lawyerAmount,
      basis: `درجة المحكمة: ${courtLevelLabel(input.courtLevel)}${input.urgent ? "، مستعجل" : ""}`,
      calculation: `${formatMoney(lawyerAmount)} قيمة ثابتة`,
      ruleVersion,
      confidence: "verified",
      source: lawyersSource
    });
  }

  const warnings = [
    "هذا تقدير آلي وليس أمر تحصيل؛ يتحول إلى مطالبة بعد مراجعة الموظف المختص واعتمادها.",
    "طابع صندوق تكريم الشهداء مستبعد من قيد الدعوى حتى اعتماد خريطة تثبت خضوع هذا الإجراء كخدمة؛ لا يكفي تجاوز الرسم 15 جنيهًا.",
    "رسم تنمية الموارد وضريبة الدمغة والقيم التشغيلية غير المسندة مستبعدة حتى اعتماد خريطة الأوعية والسند القانوني التفصيلي.",
    ...(caseResolution.warnings ?? []),
    ...(finalResolution?.warnings ?? []),
    ...(finalAccrualLines.length
      ? ["تُستحق تكملة المادة 11/خامسًا عن الريع أو الإيجار أو التعويض اليومي أو الفوائد المستجدة من رفع الدعوى حتى الحكم، ولو انتهى الطلب بالرفض؛ يجب مطابقة المبلغ المستجد على منطوق الحكم وكشف المدة."]
      : []),
    ...(treatment.kind === "review"
      ? ["تصنيف هذا النوع يحتاج استكمال وقائع الوعاء قبل الاعتماد؛ النتيجة الحالية تقدير أولي وليست تسوية نهائية."]
      : [])
  ];
  if (input.stage === "final" && input.valueKind === "known" && (input.awardedAmountMillieme ?? 0) > (input.claimAmountMillieme ?? 0)) {
    warnings.push("المقضي به المدخل أكبر من قيمة الدعوى؛ يلزم التحقق قبل الاعتماد.");
  }

  const netMillieme = lines.reduce((sum, line) => sum + line.amountMillieme, 0);
  return {
    ruleSetId: RULE_SET.id,
    ruleSetVersion: ruleVersion,
    calculatedAt: now.toISOString(),
    totalMillieme: Math.max(0, netMillieme),
    refundableMillieme: Math.max(0, -netMillieme),
    lines,
    warnings,
    assumptions: [
      "العملة: الجنيه المصري، والدقة الداخلية جزء من ألف جنيه.",
      `معاملة الرسم: ${treatment.title} — ${treatment.reason}`,
      `تم اختيار إصدار القواعد الساري في ${input.calculationDate}.`,
      ...caseResolution.assumptions,
      ...(finalResolution?.assumptions ?? []),
      ...(input.finalAccruals?.length
        ? ["لم تشمل هذه العملية المستحقات اللاحقة للحكم أو رسم التنفيذ؛ تحسب عند طلب التنفيذ بعملية مستقلة."]
        : []),
      ...(input.claimStructure === "same-basis"
        ? ["الطلبات المتعددة ناشئة عن سند قانوني واحد، ولذلك حُسب الرسم على مجموعها المدخل."]
        : [])
    ],
    treatment,
    input
  };
}

export function formatMoney(milliemes: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: milliemes % 10 === 0 ? 2 : 3,
    maximumFractionDigits: 3
  }).format(milliemes / POUND);
}

function validateInput(input: EstimateInput): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.calculationDate)) throw new Error("INVALID_DATE");
  if (input.exempt) return;
  const hasFinalClaims = input.stage === "final" && (input.finalClaims?.length ?? 0) > 0;
  if (["different-bases", "rent-termination", "unsure"].includes(input.claimStructure) && !hasFinalClaims) {
    throw new Error("LEGAL_REVIEW_REQUIRED_MULTIPLE_CLAIMS");
  }
  if (input.claimStructure === "same-basis" && input.valueKind !== "known" && !hasFinalClaims) {
    throw new Error("LEGAL_REVIEW_REQUIRED_MULTIPLE_CLAIMS");
  }
  if (input.stage === "final") {
    if (!input.finalOutcome) throw new Error("FINAL_OUTCOME_REQUIRED");
    if (input.finalOutcome === "struck") throw new Error("FINAL_OUTCOME_NOT_TERMINAL");
    if (["settled", "abandoned"].includes(input.finalOutcome) && !input.finalTiming) {
      throw new Error("FINAL_TIMING_REQUIRED");
    }
    if (input.finalClaims?.length) validateFinalClaims(input.finalClaims);
    if (input.finalOutcome === "settled"
      && input.valueKind === "unknown"
      && input.settlementHasKnownExecutableTerms
      && (!Number.isInteger(input.settlementAmountMillieme) || (input.settlementAmountMillieme ?? 0) <= 0)) {
      throw new Error("SETTLEMENT_AMOUNT_REQUIRED");
    }
  }
  if (input.valueKind === "known" && !hasFinalClaims) {
    if (!Number.isInteger(input.claimAmountMillieme) || (input.claimAmountMillieme ?? 0) <= 0) throw new Error("CLAIM_AMOUNT_REQUIRED");
    if (input.stage === "final" && !hasFinalClaims && ["judgment-partial", "appeal-modified"].includes(input.finalOutcome ?? "") && (!Number.isInteger(input.awardedAmountMillieme) || (input.awardedAmountMillieme ?? -1) < 0)) {
      throw new Error("AWARDED_AMOUNT_REQUIRED");
    }
  }
  for (const accrual of input.finalAccruals ?? []) {
    if (!accrual.id.trim() || !accrual.label.trim()
      || !Number.isInteger(accrual.filingBasisMillieme) || accrual.filingBasisMillieme < 0
      || !Number.isInteger(accrual.accruedToJudgmentMillieme) || accrual.accruedToJudgmentMillieme <= 0) {
      throw new Error("FINAL_ACCRUAL_FACTS_REQUIRED");
    }
  }
}

function validateFinalClaims(claims: FinalClaimItem[]): void {
  if (claims.length > 100) throw new Error("FINAL_CLAIMS_LIMIT_EXCEEDED");
  const ids = new Set<string>();
  const aggregationByGroup = new Map<string, FinalClaimItem["aggregation"]>();
  for (const claim of claims) {
    if (!claim.id.trim() || !claim.label.trim() || !claim.groupKey.trim() || ids.has(claim.id)) {
      throw new Error("FINAL_CLAIM_FACTS_REQUIRED");
    }
    ids.add(claim.id);
    const priorAggregation = aggregationByGroup.get(claim.groupKey);
    if (priorAggregation && priorAggregation !== claim.aggregation) throw new Error("FINAL_CLAIM_GROUP_MISMATCH");
    aggregationByGroup.set(claim.groupKey, claim.aggregation);
    if (claim.valueKind === "known") {
      if (!Number.isInteger(claim.claimedAmountMillieme) || (claim.claimedAmountMillieme ?? 0) <= 0) throw new Error("FINAL_CLAIM_FACTS_REQUIRED");
      if (claim.disposition === "awarded-partial"
        && (!Number.isInteger(claim.awardedAmountMillieme) || (claim.awardedAmountMillieme ?? -1) < 0)) {
        throw new Error("FINAL_CLAIM_FACTS_REQUIRED");
      }
    } else if (claim.disposition === "awarded-partial") {
      throw new Error("LEGAL_REVIEW_REQUIRED_UNKNOWN_FINAL");
    }
  }
}

function finalClaimBasis(claim: FinalClaimItem): number {
  if (["rejected", "inadmissible", "ended-without-merits"].includes(claim.disposition)) return 0;
  if (claim.valueKind === "unknown") return 0;
  return claim.disposition === "awarded-partial"
    ? claim.awardedAmountMillieme ?? 0
    : claim.claimedAmountMillieme ?? 0;
}

function resolveMultiClaimSettlement(
  input: EstimateInput,
  caseResolution: CaseResolution,
  rules: JudicialFeeRuleConfig,
  ruleVersion: string
): FinalSettlementResolution {
  const claims = input.finalClaims ?? [];
  const prepaid = input.prepaidOriginalMillieme;
  if (!Number.isInteger(prepaid) || (prepaid ?? -1) < 0) throw new Error("PREPAID_ORIGINAL_REQUIRED");
  const fixedUnknown = caseResolution.originalOverride?.amountMillieme ?? unknownValueFee(input.courtLevel, input.urgent, rules);
  let gross = 0;
  const basisParts: string[] = [];
  const assumptions: string[] = [];

  const sumGroups = new Map<string, FinalClaimItem[]>();
  const higherGroups = new Map<string, FinalClaimItem[]>();
  const separateClaims: FinalClaimItem[] = [];
  for (const claim of claims) {
    if (claim.aggregation === "separate-basis") separateClaims.push(claim);
    else {
      const target = claim.aggregation === "sum-same-basis" ? sumGroups : higherGroups;
      target.set(claim.groupKey, [...(target.get(claim.groupKey) ?? []), claim]);
    }
  }

  for (const claim of separateClaims) {
    const amount = claim.valueKind === "known"
      ? calculateProgressiveRelative(finalClaimBasis(claim), rules)
      : ["awarded-full"].includes(claim.disposition) ? fixedUnknown : 0;
    gross += amount;
    basisParts.push(`${claim.label}: ${claim.valueKind === "known" ? formatMoney(finalClaimBasis(claim)) : amount > 0 ? "رسم ثابت مستقل" : "لا شيء مقضي به"}`);
  }
  if (separateClaims.length) assumptions.push("حُسبت الطلبات الناشئة عن سندات قانونية مختلفة، كل سند على حدة، طبقًا للمادة 7.");

  for (const [groupKey, groupClaims] of sumGroups) {
    const knownBasis = groupClaims.filter((claim) => claim.valueKind === "known").reduce((sum, claim) => sum + finalClaimBasis(claim), 0);
    const unknownAwarded = groupClaims.some((claim) => claim.valueKind === "unknown" && claim.disposition === "awarded-full");
    const groupFee = calculateProgressiveRelative(knownBasis, rules) + (unknownAwarded ? fixedUnknown : 0);
    gross += groupFee;
    basisParts.push(`${groupKey}: ${knownBasis > 0 ? `${formatMoney(knownBasis)} عن السند الواحد` : "لا مبلغ مقضي به"}${unknownAwarded ? " + رسم ثابت لطلب مجهول مرتبط" : ""}`);
  }
  if (sumGroups.size) assumptions.push("جُمعت الطلبات المعلومة الناشئة عن السند الواحد والطلبات الإضافية المتصلة به قبل تطبيق الشرائح.");

  for (const [groupKey, groupClaims] of higherGroups) {
    const candidates = groupClaims.map((claim) => claim.valueKind === "known"
      ? calculateProgressiveRelative(finalClaimBasis(claim), rules)
      : claim.disposition === "awarded-full" ? fixedUnknown : 0);
    const groupFee = Math.max(0, ...candidates);
    gross += groupFee;
    basisParts.push(`${groupKey}: أرجح الرسمين ${formatMoney(groupFee)}`);
  }
  if (higherGroups.size) assumptions.push("استُخدم أرجح الرسمين للطلبات التابعة أو المقدمة على سبيل الخبرة طبقًا للمادة 7.");

  const adjustment = Math.max(0, gross - (prepaid ?? 0));
  return {
    lines: adjustment === 0 ? [] : [{
      code: "FINAL_MULTI_CLAIM_ADJUSTMENT",
      label: "تسوية الرسم النهائي طلبًا بطلب",
      amountMillieme: adjustment,
      basis: `${basisParts.join("؛ ")}؛ إجمالي الرسم النهائي ${formatMoney(gross)}؛ السابق سداده ${formatMoney(prepaid ?? 0)}`,
      calculation: `${formatMoney(gross)} − ${formatMoney(prepaid ?? 0)} = ${formatMoney(adjustment)}`,
      ruleVersion,
      confidence: "verified",
      source: finalSettlementSource
    }],
    includeServicesFund: adjustment > 0,
    warnings: [
      "تمت التسوية على سجل الطلبات ومنطوق الحكم لكل طلب؛ أي طلب أغفل من السجل لا يدخل في التقدير.",
      "الطلبات المرفوضة أو غير المقبولة أو المنتهية دون فصل لم تُعامل كوعاء نسبي نهائي."
    ],
    assumptions
  };
}

function resolveFinalAccrualLines(input: EstimateInput, rules: JudicialFeeRuleConfig, ruleVersion: string): FeeLine[] {
  return (input.finalAccruals ?? []).map<FeeLine>((accrual) => {
    const before = calculateProgressiveRelative(accrual.filingBasisMillieme, rules);
    const throughJudgment = calculateProgressiveRelative(accrual.filingBasisMillieme + accrual.accruedToJudgmentMillieme, rules);
    const amount = Math.max(0, throughJudgment - before);
    return {
      code: "ARTICLE_11_POST_FILING_ACCRUAL",
      label: `تكملة رسم ${accrual.label}`,
      amountMillieme: amount,
      basis: `الوعاء عند الرفع ${formatMoney(accrual.filingBasisMillieme)}؛ المستجد حتى الحكم ${formatMoney(accrual.accruedToJudgmentMillieme)}`,
      calculation: `${formatMoney(throughJudgment)} − ${formatMoney(before)} = ${formatMoney(amount)}`,
      ruleVersion,
      confidence: "verified",
      source: article11AccrualSource
    };
  }).filter((line) => line.amountMillieme > 0);
}

function resolveFinalSettlement(
  input: EstimateInput,
  caseType: CaseType,
  caseResolution: CaseResolution,
  rules: JudicialFeeRuleConfig,
  ruleVersion: string
): FinalSettlementResolution {
  const outcome = input.finalOutcome;
  if (!outcome) throw new Error("FINAL_OUTCOME_REQUIRED");

  if (["execution-first", "execution-repeat", "arbitration-award-execution"].includes(input.caseTypeId)
    || caseType.finalSettlementPolicy === "operation-not-applicable") {
    throw new Error("FINAL_STAGE_NOT_APPLICABLE_TO_OPERATION");
  }

  if (input.caseTypeId === "constitutional-action") {
    if (outcome === "constitutional-accepted") {
      return {
        lines: [{
          code: "CONSTITUTIONAL_GUARANTEE_REFUND",
          label: "رد كفالة الدعوى الدستورية",
          amountMillieme: -25 * POUND,
          basis: "قبول الدعوى وعدم تحقق سبب المصادرة المنصوص عليه",
          calculation: "رد أمانة الكفالة المودعة عند رفع الدعوى",
          ruleVersion: RULE_SET.version,
          confidence: "verified",
          source: constitutionalSource
        }],
        includeServicesFund: false,
        warnings: ["المبلغ السالب يمثل رد أمانة، وليس تخفيضًا في إيراد رسوم جديد."],
        assumptions: ["يفترض أن الكفالة سبق إيداعها ولم يصدر أمر مستقل بحجزها أو مقاصتها."]
      };
    }
    if (["constitutional-rejected", "constitutional-inadmissible"].includes(outcome)) {
      return {
        lines: [],
        includeServicesFund: false,
        warnings: ["تُصادر الكفالة وفق نتيجة الدعوى؛ لا يظهر مبلغ نقدي جديد لأنها مودعة أصلًا، ويلزم قيد إعادة تصنيفها من أمانة إلى إيراد."],
        assumptions: []
      };
    }
    throw new Error("FINAL_OUTCOME_CASE_TYPE_MISMATCH");
  }

  if (input.caseTypeId === "article76-recusal") {
    if (outcome === "judgment-full") {
      const originalPaid = input.prepaidOriginalMillieme ?? unknownValueFee(input.courtLevel, input.urgent, rules);
      const servicesPaid = Math.round((originalPaid * rules.servicesFundRateBasisPoints) / 10_000);
      return {
        lines: [
          {
            ...fixedFeeLine("RECUSAL_ORIGINAL_FEE_REFUND", "رد الرسم القضائي لطلب الرد", -originalPaid, "قبول طلب الرد وفق الحالة الثانية من المادة 22", finalSettlementSource),
            financialClass: "refund"
          },
          ...(servicesPaid > 0 ? [{
            ...fixedFeeLine("RECUSAL_SERVICES_FEE_REFUND", "رد رسم صندوق الخدمات التابع", -servicesPaid, "رسم الخدمات له حكم الرسم القضائي الأصلي", servicesSource),
            financialClass: "refund" as const
          }] : []),
          {
            ...fixedFeeLine("RECUSAL_GUARANTEE_REFUND", "رد كفالة طلب الرد", -300 * POUND, "قبول طلب الرد بحكم نهائي وعدم وجود أمر حجز أو مقاصة", civilProcedureSource),
            financialClass: "refund"
          }
        ],
        includeServicesFund: false,
        warnings: ["يفصل النظام رد الرسم ورسم الخدمات عن رد الكفالة؛ لا تنفذ أي حركة قبل مطابقة الإيصالات وأمر الرد المالي."],
        assumptions: ["يفترض ثبوت سداد الرسم الأصلي ورسم الخدمات وإيداع كفالة الرد، وعدم سبق رد أي منها أو مقاصته."]
      };
    }
    if (["rejected", "inadmissible"].includes(outcome)) {
      return {
        lines: [],
        includeServicesFund: false,
        warnings: ["تُصادر كفالة الرد وفق الحكم، ولا يظهر تحصيل نقدي جديد لأنها مودعة أصلًا. الغرامة القضائية لا تُقدّر آليًا دون منطوقها."],
        assumptions: []
      };
    }
    throw new Error("FINAL_OUTCOME_CASE_TYPE_MISMATCH");
  }

  if (caseType.profileId === "article-76-judgment-correction") {
    if (outcome === "judgment-full") {
      const originalPaid = input.prepaidOriginalMillieme ?? unknownValueFee(input.courtLevel, input.urgent, rules);
      const servicesPaid = Math.round((originalPaid * rules.servicesFundRateBasisPoints) / 10_000);
      return {
        lines: [
          {
            ...fixedFeeLine("JUDGMENT_CORRECTION_FEE_REFUND", "رد رسم طلب تفسير الحكم أو تصحيحه", -originalPaid, "القضاء بإجابة الطلب وفق الحالة الأولى من المادة 22", finalSettlementSource),
            financialClass: "refund"
          },
          ...(servicesPaid > 0 ? [{
            ...fixedFeeLine("JUDGMENT_CORRECTION_SERVICES_REFUND", "رد رسم صندوق الخدمات التابع", -servicesPaid, "رسم الخدمات له حكم الرسم القضائي الأصلي", servicesSource),
            financialClass: "refund" as const
          }] : [])
        ],
        includeServicesFund: false,
        warnings: ["يرد الرسم عند إجابة طلب التفسير أو التصحيح؛ يلزم مطابقة إيصال السداد ومنع تكرار الرد."],
        assumptions: ["اعتُبر «إجابة الطلب» حكمًا بقبول التفسير أو التصحيح لا مجرد قبوله شكلًا."]
      };
    }
    if (["rejected", "inadmissible"].includes(outcome)) {
      return { lines: [], includeServicesFund: false, warnings: ["لا يرد الرسم لأن شرط المادة 22، وهو القضاء بإجابة طلب التفسير أو التصحيح، لم يتحقق."], assumptions: [] };
    }
    throw new Error("FINAL_OUTCOME_CASE_TYPE_MISMATCH");
  }

  if (caseType.jurisdiction === "criminal") {
    if (outcome === "criminal-acquittal") {
      return { lines: [], includeServicesFund: false, warnings: ["لا يفرض رسم القضية الجنائية على من قضي ببراءته في هذا المسار."], assumptions: [] };
    }
    if (outcome === "criminal-conviction" && caseResolution.originalOverride) {
      return {
        lines: [caseResolution.originalOverride],
        includeServicesFund: false,
        warnings: ["المبلغ يخص الرسم الجنائي الأصلي فقط؛ الغرامة والمصاريف والتنفيذ والادعاء المدني أو تعدد المحكوم عليهم تُسجل كبنود مستقلة."],
        assumptions: ["وصف الجريمة المستخدم هو الوصف الذي انتهى إليه الحكم."]
      };
    }
    throw new Error("FINAL_OUTCOME_CASE_TYPE_MISMATCH");
  }

  if (["civil-appeal-known", "civil-appeal-unknown"].includes(input.caseTypeId)
    && ["appeal-affirmed", "appeal-modified", "appeal-cancelled"].includes(outcome)) {
    if (input.caseTypeId === "civil-appeal-unknown") {
      return {
        lines: [],
        includeServicesFund: false,
        warnings: ["رسم الاستئناف مجهول القيمة استحق عند التقرير بالطعن ولا يتكرر لمجرد التأييد أو التعديل أو الإلغاء."],
        assumptions: []
      };
    }
    if (outcome === "appeal-affirmed") {
      return {
        lines: [],
        includeServicesFund: false,
        warnings: ["تأييد الحكم لا ينشئ فرق رسم جديدًا في هذه المرحلة؛ لا يُعاد تحميل كامل قيمة الدعوى الابتدائية على صحيفة الاستئناف."],
        assumptions: ["القيمة المدخلة عند القيد كانت قيمة الجزء المطعون فيه بالاستئناف."]
      };
    }
    const appealed = input.claimAmountMillieme ?? 0;
    const finallyAwarded = outcome === "appeal-modified" ? input.awardedAmountMillieme ?? 0 : 0;
    const article21Basis = appealed > 1_000 * POUND
      ? Math.min(appealed, Math.max(1_000 * POUND, finallyAwarded))
      : Math.min(appealed, finallyAwarded);
    const gross = calculateProgressiveRelative(article21Basis, rules);
    const prepaid = input.prepaidOriginalMillieme
      ?? Math.min(calculateProgressiveRelative(appealed, rules), filingCollectionCap(appealed, rules));
    const adjustment = Math.max(0, gross - prepaid);
    return {
      lines: adjustment === 0 ? [] : [{
        code: "APPEAL_ARTICLE_21_SETTLEMENT",
        label: "تسوية رسم الاستئناف بعد تعديل الحكم أو إلغائه",
        amountMillieme: adjustment,
        basis: `وعاء المادة 21 ${formatMoney(article21Basis)}؛ السابق سداده في الاستئناف ${formatMoney(prepaid)}`,
        calculation: `${formatMoney(gross)} − ${formatMoney(prepaid)} = ${formatMoney(adjustment)}`,
        ruleVersion,
        confidence: "verified",
        source: finalSettlementSource
      }],
      includeServicesFund: adjustment > 0,
      warnings: ["في الدعوى التي تزيد على ألف جنيه، يسوى الرسم عند إلغاء الحكم أو تعديله على أساس ألف جنيه، إلا إذا حكم بأكثر فيستخدم المقضي به؛ ولا يتجاوز الوعاء نطاق الجزء المطعون فيه."],
      assumptions: [outcome === "appeal-modified"
        ? "القيمة النهائية المدخلة هي ما أبقاه أو قضى به الحكم الاستئنافي داخل نطاق الاستئناف."
        : "أُلغي الحكم دون قضاء مالي بديل داخل نطاق الاستئناف، فطُبق حد الألف جنيه للدعوى التي تجاوزته."]
    };
  }

  if (input.finalClaims?.length) {
    return resolveMultiClaimSettlement(input, caseResolution, rules, ruleVersion);
  }

  if (input.caseTypeId === "family-death-inheritance-lawsuit-known"
    && ["judgment-full", "judgment-partial"].includes(outcome)) {
    const awarded = outcome === "judgment-full"
      ? input.claimAmountMillieme ?? 0
      : input.awardedAmountMillieme ?? 0;
    const gross = Math.round(awarded * 0.02);
    const filingGross = Math.round((input.claimAmountMillieme ?? 0) * 0.02);
    const prepaid = input.prepaidOriginalMillieme ?? filingGross;
    const adjustment = Math.max(0, gross - prepaid);
    return {
      lines: adjustment === 0 ? [] : [{
        code: "PERSONAL_STATUS_INHERITANCE_SETTLEMENT",
        label: "تسوية رسم دعوى ثبوت الوفاة والوراثة",
        amountMillieme: adjustment,
        basis: `قيمة حصة الطالب المقضي بها ${formatMoney(awarded)}؛ السابق سداده ${formatMoney(prepaid)}`,
        calculation: `2% × ${formatMoney(awarded)} − ${formatMoney(prepaid)} = ${formatMoney(adjustment)}`,
        ruleVersion,
        confidence: "verified",
        source: personalStatusFeesSource
      }],
      includeServicesFund: adjustment > 0,
      warnings: [],
      assumptions: ["حُسب الرسم على قيمة حصة الطالب وحدها طبقًا للمادة 49/رابعًا، لا على كامل التركة."]
    };
  }

  if (outcome === "cassation-referral") {
    return {
      lines: [],
      includeServicesFund: false,
      warnings: ["الإحالة بعد النقض لا تُعامل تلقائيًا كصحيفة دعوى جديدة؛ أي رسم لاحق يحتاج إجراءً مستقلاً وسنده."],
      assumptions: []
    };
  }

  if (["lapsed", "deemed-never-filed"].includes(outcome)) {
    return {
      lines: [],
      includeServicesFund: false,
      warnings: [
        "لا يستحق قلم الكتاب رسمًا أكثر مما حُصّل عند رفع الدعوى أو الطعن، لأن الانتهاء لم يتضمن فصلًا في الموضوع أو إلزامًا لأي طرف.",
        "الحكم بالمصروفات وتحديد شخص الملتزم بها يظل قيدًا محاسبيًا مستقلًا ولا يغير مقدار الرسم المستحق."
      ],
      assumptions: [outcome === "deemed-never-filed"
        ? "منطوق الحكم اعتبر الدعوى أو الطعن كأن لم يكن، ولم يتضمن قضاءً في الموضوع أو التزامًا ماليًا مستقلًا."
        : "منطوق الحكم أنهى أو أسقط الخصومة دون الفصل في موضوع النزاع ودون القضاء لأي طرف بشيء."]
    };
  }

  if (["settled", "abandoned"].includes(outcome)) {
    const paid = input.prepaidOriginalMillieme;
    if (!Number.isInteger(paid) || (paid ?? -1) < 0) throw new Error("PREPAID_ORIGINAL_REQUIRED");
    if (!input.finalTiming) throw new Error("FINAL_TIMING_REQUIRED");

    const early = input.finalTiming === "first-session-before-pleading";
    if (outcome === "abandoned" && !early) {
      return {
        lines: [],
        includeServicesFund: false,
        warnings: [
          "لا يستحق قلم الكتاب رسمًا أكثر مما حُصّل عند رفع الدعوى لأن ترك الخصومة أنهى السير فيها دون حكم في الموضوع أو إلزام جديد.",
          "يلتزم التارك بالمصروفات التي نشأت عن الخصومة، لكن تحديد الملتزم بالمصروفات لا يحول المبالغ غير المحكوم بها إلى وعاء رسم نهائي."
        ],
        assumptions: ["ثبت أن الترك وقع بعد الجلسة الأولى؛ لذلك لا يطبق رد الثلاثة أرباع المقرر بالمادة 20 مكررًا، ولا يطبق تخفيض النصف الخاص بالصلح."]
      };
    }
    const fixedUnknown = caseResolution.originalOverride?.amountMillieme ?? unknownValueFee(input.courtLevel, input.urgent, rules);
    let settlementBasis = input.claimAmountMillieme ?? 0;
    let fullOriginal = input.valueKind === "known"
      ? calculateProgressiveRelative(settlementBasis, rules)
      : fixedUnknown;
    let basisExplanation = input.valueKind === "known"
      ? `قيمة الطلب ${formatMoney(settlementBasis)}`
      : `الرسم الثابت للدعوى مجهولة القيمة ${formatMoney(fixedUnknown)}`;

    if (outcome === "settled" && !early) {
      const settledAmount = input.settlementAmountMillieme;
      if (input.valueKind === "known" && Number.isInteger(settledAmount)) {
        const claimAmount = input.claimAmountMillieme ?? 0;
        settlementBasis = claimAmount > 1_000 * POUND && (settledAmount ?? 0) < 1_000 * POUND
          ? 1_000 * POUND
          : Math.max(claimAmount, settledAmount ?? 0);
        fullOriginal = calculateProgressiveRelative(settlementBasis, rules);
        basisExplanation = settlementBasis === 1_000 * POUND && claimAmount > 1_000 * POUND
          ? `وعاء المادة 20 هو ${formatMoney(settlementBasis)} لأن قيمة الدعوى تجاوزت ألف جنيه والمصالح عليه أقل منها`
          : `وعاء المادة 20 ${formatMoney(settlementBasis)}: قيمة الطلب، أو المصالح عليه إن جاوزها`;
      } else if (input.valueKind === "unknown" && input.settlementHasKnownExecutableTerms) {
        const knownTerms = input.settlementAmountMillieme ?? 0;
        const relativeOnTerms = calculateProgressiveRelative(knownTerms, rules);
        fullOriginal = fixedUnknown + relativeOnTerms;
        basisExplanation = `الدعوى مجهولة القيمة، ومحضر الصلح تضمن التزامًا معلومًا قابلًا للتنفيذ ${formatMoney(knownTerms)}؛ الرسم الثابت ${formatMoney(fixedUnknown)} + النسبي ${formatMoney(relativeOnTerms)}`;
      }
    }

    const statutoryTarget = early
      ? Math.round((paid ?? 0) / 4)
      : outcome === "settled" && input.finalTiming === "before-dispositive-judgment"
        ? Math.round(fullOriginal / 2)
        : fullOriginal;
    const target = input.settlementReducedFeeCase && outcome === "settled" && !early
      ? Math.max(statutoryTarget, paid ?? 0)
      : statutoryTarget;
    const adjustment = target - (paid ?? 0);

    return {
      lines: adjustment === 0 ? [] : [{
        code: early ? "ORIGINAL_EARLY_ENDING_ADJUSTMENT" : "ORIGINAL_SETTLEMENT_ADJUSTMENT",
        label: adjustment < 0 ? "تسوية برد جزء من الرسم الأصلي" : "استكمال الرسم الأصلي عند انتهاء الخصومة",
        amountMillieme: adjustment,
        basis: early
          ? `السابق سداده ${formatMoney(paid ?? 0)}؛ المستبقى قانونًا ربع المسدد ${formatMoney(target)}`
          : `${basisExplanation}؛ الرسم الكامل ${formatMoney(fullOriginal)}؛ المستحق بحسب طريقة وتوقيت الانتهاء ${formatMoney(target)}؛ السابق ${formatMoney(paid ?? 0)}`,
        calculation: `${formatMoney(target)} − ${formatMoney(paid ?? 0)} = ${formatMoney(adjustment)}`,
        ruleVersion,
        confidence: "verified",
        source: finalSettlementSource
      }],
      includeServicesFund: false,
      warnings: [
        adjustment < 0
          ? "القيمة السالبة تقدير لرد محتمل؛ لا ينفذ الرد أو المقاصة دون أمر مالي ورقم إيصال ومراجعة ما سبق رده."
          : "هذا استكمال للرسم الأصلي فقط.",
        "صندوق الخدمات وأتعاب المحاماة والرسوم الإضافية لا تُرد أو تُستكمل في هذا المسار دون خريطة رد مستقلة معتمدة لكل بند.",
        ...(input.settlementReducedFeeCase && outcome === "settled" && !early
          ? ["لم يُقدّر رد للرسم لأن المستخدم قرر أن الدعوى من الدعاوى مخفضة القيمة التي تمنع المادة 20 رد شيء عند الصلح."]
          : [])
      ],
      assumptions: [input.finalTiming === "first-session-before-pleading"
        ? "ثبت أن الترك أو الصلح تم في أول جلسة انعقدت فيها الخصومة وقبل بدء المرافعة."
        : input.finalTiming === "before-dispositive-judgment"
          ? "ثبت الصلح قبل حكم قطعي في مسألة فرعية أو حكم تمهيدي في الموضوع."
          : "سبق الصلح حكم قطعي في مسألة فرعية أو حكم تمهيدي في الموضوع؛ استُخدم الرسم الكامل."]
    };
  }

  if (["rejected", "inadmissible"].includes(outcome)) {
    return {
      lines: [],
      includeServicesFund: false,
      warnings: ["لا توجد تسوية نسبية تكميلية على قيمة لم يُقض بها؛ الحكم بالمصروفات وتحديد الملتزم بها مسار محاسبي مستقل."],
      assumptions: []
    };
  }

  if (["judgment-full", "judgment-partial"].includes(outcome)) {
    if (input.valueKind === "unknown") {
      if (outcome === "judgment-partial") throw new Error("LEGAL_REVIEW_REQUIRED_UNKNOWN_FINAL");
      return {
        lines: [],
        includeServicesFund: false,
        warnings: ["الرسم الثابت الذي استحق عند القيد لا يُكرر لمجرد صدور الحكم؛ أي طلب مالي ظهر بالحكم يحتاج وعاءً نهائيًا مستقلاً."],
        assumptions: []
      };
    }
    const line = originalFee(input, rules, ruleVersion);
    return {
      lines: line.amountMillieme === 0 ? [] : [line],
      includeServicesFund: line.amountMillieme > 0,
      warnings: [],
      assumptions: [outcome === "judgment-full"
        ? "استُخدم كامل الوعاء القانوني المشتق لنوع الدعوى لأن الحكم أجاب الطلب كله."
        : "استُخدم الوعاء القانوني للجزء المقضي به فقط."]
    };
  }

  throw new Error("FINAL_OUTCOME_LEGAL_REVIEW_REQUIRED");
}

function resolveCaseTypeInput(input: EstimateInput, rules: JudicialFeeRuleConfig, ruleVersion: string): CaseResolution {
  const caseType = caseTypeById.get(input.caseTypeId);
  if (!caseType) throw new Error("UNKNOWN_CASE_TYPE");
  if (!caseType.allowedValueKinds.includes(input.valueKind)) throw new Error("CASE_TYPE_VALUE_KIND_MISMATCH");
  if (!caseType.supportedCourtLevels.includes(input.courtLevel)) throw new Error("CASE_TYPE_COURT_LEVEL_UNSUPPORTED");
  if (caseType.coverage === "blocked") throw new Error("CASE_TYPE_LEGAL_REVIEW_REQUIRED");

  if (input.caseTypeId === "civil-appeal-known") {
    return {
      input,
      assumptions: ["القيمة المدخلة هي قيمة الجزء المطعون فيه بالاستئناف، وليست كامل قيمة الدعوى الابتدائية إلا إذا شمل الطعن الحكم كله."]
    };
  }

  if (input.caseTypeId === "civil-appeal-unknown") {
    return {
      input,
      assumptions: ["صُنّف الجزء المطعون فيه باعتباره مجهول القيمة، فطُبق الرسم الثابت المقرر لدرجة الاستئناف."]
    };
  }

  if (input.caseTypeId === "civil-cassation") {
    return {
      input,
      assumptions: ["النتيجة تخص رسم صحيفة الطعن المدني أو التجاري بالنقض فقط، ولا تفترض وجود طلب وقف تنفيذ أو كفالة غير موثقة ضمن هذه القاعدة."]
    };
  }

  if (input.caseTypeId === "tax-profit-assessment-dispute") {
    const facts = input.caseFacts;
    if (facts?.taxKind !== "income-profit-assessment") throw new Error("TAX_PROFIT_KIND_REQUIRED");
    if (facts.taxRoute !== "court-action") throw new Error("TAX_ROUTE_NOT_JUDICIAL_FILING");
    const periods = facts.taxDisputedPeriods ?? [];
    if (periods.length === 0 || periods.length > 50) throw new Error("TAX_PERIODS_REQUIRED");
    const ids = new Set<string>();
    for (const period of periods) {
      if (!period.id.trim() || !period.label.trim() || ids.has(period.id)
        || !Number.isInteger(period.disputedProfitMillieme) || period.disputedProfitMillieme <= 0) {
        throw new Error("TAX_PERIOD_FACTS_REQUIRED");
      }
      ids.add(period.id);
    }
    const totalBasis = periods.reduce((sum, period) => sum + period.disputedProfitMillieme, 0);
    if (!Number.isSafeInteger(totalBasis)) throw new Error("INVALID_MONEY");
    const resolvedInput: EstimateInput = { ...input, claimAmountMillieme: totalBasis };
    if (input.stage === "final") {
      if (!(input.finalClaims?.length)) throw new Error("TAX_FINAL_PERIOD_CLAIMS_REQUIRED");
      return {
        input: resolvedInput,
        assumptions: ["فُصلت كل سنة أو فترة ضريبية في بطاقة طلب نهائية مستقلة؛ لا تُجمع الأوعية قبل تطبيق شرائح الرسم."],
        warnings: ["يجب أن تعكس كل بطاقة فترة ضريبية ومنطوق الحكم الخاص بها، لا إجمالي الضريبة أو المديونية."]
      };
    }
    const fullPeriodFees = periods.map((period) => {
      const gross = calculateProgressiveRelative(period.disputedProfitMillieme, rules);
      const cap = filingCollectionCap(period.disputedProfitMillieme, rules);
      return { ...period, gross, cap, due: Math.min(gross, cap) };
    });
    const fullFee = fullPeriodFees.reduce((sum, period) => sum + period.due, 0);
    return {
      input: resolvedInput,
      assumptions: [
        "حُسب كل وعاء أرباح ضريبي عن فترة مستقلة قبل تطبيق تخفيض المادة 6 إلى النصف.",
        "القيمة هي الأرباح المتنازع عليها التي يعتمد عليها في ربط الضريبة، وليست مبلغ الضريبة أو مقابل التأخير."
      ],
      originalOverride: {
        code: "TAX_PROFIT_PERIODS_ORIGINAL",
        label: "الرسم الأصلي لمنازعة تقدير الأرباح حسب الفترات",
        amountMillieme: fullFee,
        basis: fullPeriodFees.map((period) => `${period.label}: ${formatMoney(period.disputedProfitMillieme)}`).join("؛ "),
        calculation: `${fullPeriodFees.map((period) => `${period.label} = ${formatMoney(period.due)}`).join(" + ")}؛ ثم يطبق تخفيض النصف`,
        ruleVersion,
        confidence: "verified",
        source: taxProfitFeeSource
      },
      warnings: ["لا يمتد تخفيض تقدير الأرباح تلقائيًا إلى القيمة المضافة أو الدمغة أو الضريبة العقارية أو الجمارك."]
    };
  }

  if (["family-divorce", "family-parentage"].includes(input.caseTypeId)) {
    return {
      input,
      assumptions: [input.caseTypeId === "family-divorce"
        ? "طبق الرسم الثابت الخاص بطلب التطليق أو الخلع غير المالي؛ أي طلب مالي منضم يحتاج بطاقة طلب مستقلة."
        : "طبق الرسم الثابت الخاص بإثبات النسب أو إنكاره أو المنازعة في الإقرار به."],
      originalOverride: fixedFeeLine("PERSONAL_STATUS_FIXED", "الرسم الثابت لدعوى الأحوال الشخصية", 5 * POUND, caseType.name, personalStatusFeesSource)
    };
  }

  const personalStatusFixed = PERSONAL_STATUS_FIXED_FEES[input.caseTypeId];
  if (personalStatusFixed !== undefined) {
    const unitCount = input.caseTypeId === "family-consensual-divorce-petition"
      ? input.caseFacts?.personalStatusUnitCount
      : 1;
    if (!Number.isInteger(unitCount) || (unitCount ?? 0) <= 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const additionalSheets = input.caseTypeId === "family-parentage-acknowledgment-record"
      ? input.caseFacts?.personalStatusAdditionalSheets
      : 0;
    if (!Number.isInteger(additionalSheets) || (additionalSheets ?? -1) < 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const baseAmount = personalStatusFixed * (unitCount ?? 1);
    const sheetAmount = (additionalSheets ?? 0) * 200;
    const total = baseAmount + sheetAmount;
    return {
      input,
      assumptions: [
        input.caseTypeId === "family-consensual-divorce-petition"
          ? `احتُسب رسم مستقل لكل موضوع مجهول القيمة في الاتفاق: ${unitCount} موضوع/موضوعات.`
          : input.caseTypeId === "family-parentage-acknowledgment-record"
            ? `أضيف 200 مليم عن كل ورقة زائدة على الأولى: ${additionalSheets} ورقة/أوراق إضافية.`
            : "طُبق الرسم الخاص المنصوص عليه في المادة 49 بدل الرسم العام للدعوى مجهولة القيمة."
      ],
      originalOverride: fixedFeeLine(
        "PERSONAL_STATUS_ARTICLE_49_FIXED",
        "الرسم الخاص لمسألة الأحوال الشخصية",
        total,
        caseType.name,
        personalStatusFeesSource
      )
    };
  }

  if (input.caseTypeId === "family-death-inheritance-lawsuit-known") {
    const amount = input.claimAmountMillieme ?? 0;
    const fee = Math.round(amount * 0.02);
    return {
      input,
      assumptions: ["القيمة المدخلة هي قيمة حصة الطالب في التركة، وليست قيمة التركة كلها."],
      originalOverride: {
        ...fixedFeeLine(
          "PERSONAL_STATUS_INHERITANCE_RELATIVE",
          "الرسم النسبي لدعوى ثبوت الوفاة والوراثة",
          fee,
          `2% من قيمة حصة الطالب ${formatMoney(amount)}`,
          personalStatusFeesSource
        ),
        calculation: `2% × ${formatMoney(amount)} = ${formatMoney(fee)}`
      }
    };
  }

  if (input.caseTypeId === "family-will-deposit") {
    const amount = input.claimAmountMillieme ?? 0;
    const prior = input.caseFacts?.personalStatusPriorFeeMillieme;
    if (!Number.isInteger(prior) || (prior ?? -1) < 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const gross = Math.round(amount * 0.005);
    const due = Math.max(0, gross - (prior ?? 0));
    return {
      input,
      assumptions: ["القيمة المدخلة هي قيمة المال الموصى به الموجود في مصر فقط."],
      originalOverride: {
        ...fixedFeeLine(
          "PERSONAL_STATUS_WILL_DEPOSIT",
          "رسم حفظ أصل الوصية بسجل المحكمة",
          due,
          `نصف في المائة من ${formatMoney(amount)} بعد خصم ${formatMoney(prior ?? 0)}`,
          personalStatusFeesSource
        ),
        calculation: `0.5% × ${formatMoney(amount)} − ${formatMoney(prior ?? 0)} = ${formatMoney(due)}`
      }
    };
  }

  if (input.stage === "final"
    && input.finalOutcome !== "judgment-full"
    && ["relative-on-relief", "fixed-paid-at-filing", "value-kind-dependent"].includes(caseType.finalSettlementPolicy)) {
    return {
      input,
      assumptions: ["في التسوية النهائية استُخدم منطوق الحكم والوعاء النهائي المدخل، ولم يُفترض وعاء من الاسم التشغيلي للدعوى."]
    };
  }

  if (input.caseTypeId === "family-maintenance") {
    return {
      input,
      assumptions: ["المادة 3 من القانون 1 لسنة 2000 تعفي دعاوى النفقات وما في حكمها من الأجور والمصروفات من الرسوم القضائية في جميع مراحل التقاضي."],
      automaticExemption: "إعفاء دعاوى النفقات وما في حكمها - المادة 3 من القانون 1 لسنة 2000"
    };
  }

  if (input.caseTypeId === "labour-employee") {
    if (input.calculationDate < "2025-09-01") throw new Error("CASE_TYPE_EFFECTIVE_DATE_UNSUPPORTED");
    return {
      input,
      assumptions: ["القانون 14 لسنة 2025 نافذ من 1 سبتمبر 2025، والإعفاء هنا مرتبط صراحة بكون رافع الدعوى عاملًا أو متدربًا أو متلمذًا أو مستحقًا عنه."],
      automaticExemption: "إعفاء دعوى العامل أو المستحق عنه - المادة 7 من قانون العمل 14 لسنة 2025"
    };
  }

  if (caseType.profileId === "labour-dispute") {
    const claimantRole = input.caseFacts?.labourClaimantRole;
    const arisesUnderLaw14 = input.caseFacts?.labourArisesUnderLaw14;
    if (!claimantRole || typeof arisesUnderLaw14 !== "boolean") throw new Error("CASE_TYPE_FACTS_REQUIRED");
    if (claimantRole === "employee" && arisesUnderLaw14) {
      if (input.calculationDate < "2025-09-01") throw new Error("CASE_TYPE_EFFECTIVE_DATE_UNSUPPORTED");
      return {
        input,
        assumptions: ["ثبت من الوقائع المدخلة أن الدعوى ناشئة عن قانون العمل 14 لسنة 2025 ورفعها عامل أو مستحق عنه."],
        automaticExemption: "إعفاء مرتبط بالصفة والطلب - المادة 7 من قانون العمل 14 لسنة 2025"
      };
    }
    return {
      input,
      assumptions: [`لم يطبق إعفاء العامل لأن صفة رافع الدعوى «${claimantRole === "employer" ? "صاحب عمل" : claimantRole === "other" ? "صفة أخرى" : "عامل خارج نطاق الشرط المدخل"}».`]
    };
  }

  if (input.caseTypeId === "bankruptcy-declaration-request") {
    return {
      input,
      assumptions: ["الرسم يغطي طلب إشهار الإفلاس أو الصلح الواقي فقط ولا يشمل مصروفات النشر واللصق أو إجراء إعادة الهيكلة."],
      originalOverride: fixedFeeLine("BANKRUPTCY_DECLARATION_FIXED", "الرسم الثابت لطلب إشهار الإفلاس أو الصلح الواقي", 50 * POUND, "طلب الإشهار أو الصلح الواقي", judicialSource)
    };
  }

  const criminalAmounts: Partial<Record<string, number>> = {
    "criminal-violation": 1.5 * POUND,
    "criminal-misdemeanor": 5 * POUND,
    "criminal-felony": 30 * POUND,
    "criminal-appeal": 10 * POUND,
    "criminal-cassation": 20 * POUND
  };
  const criminalAmount = criminalAmounts[input.caseTypeId];
  if (criminalAmount !== undefined) {
    return {
      input,
      assumptions: ["اختير الرسم من الوصف الجنائي والمرحلة المحددين في نوع الدعوى، دون إضافة الغرامة أو التعويض المدني أو الكفالة."],
      originalOverride: fixedFeeLine("CRIMINAL_ORIGINAL_FIXED", "الرسم الأصلي للدعوى الجنائية", criminalAmount, caseType.name, criminalFeesSource),
      includeStandardAddons: false,
      warnings: ["النتيجة تخص رسم الدعوى الجنائية الأصلي فقط؛ التنفيذ والادعاء المدني وأتعاب المحامي المنتدب تحتاج وقائع مستقلة."]
    };
  }

  if (input.caseTypeId === "constitutional-action") {
    return {
      input,
      assumptions: ["تودع كفالة واحدة عند تعدد المدعين إذا رفعت الدعوى بصحيفة واحدة."],
      originalOverride: fixedFeeLine("CONSTITUTIONAL_ORIGINAL", "الرسم الثابت للدعوى الدستورية", 25 * POUND, "دعوى دستورية وفق المادة 53", constitutionalSource),
      additionalLines: [fixedFeeLine("CONSTITUTIONAL_GUARANTEE", "كفالة الدعوى الدستورية - أمانة", 25 * POUND, "تودع عند تقديم صحيفة الدعوى وترد أو تصادر وفق نتيجة الدعوى", constitutionalSource)],
      includeStandardAddons: false,
      warnings: ["الكفالة أمانة قابلة للرد أو المصادرة بسند قضائي؛ تظهر في الإجمالي النقدي المطلوب للإيداع ولا تسجل إيراد رسوم."]
    };
  }

  if (input.caseTypeId === "article76-recusal") {
    return {
      input,
      assumptions: ["فُصل الرسم الثابت عن كفالة الرد؛ الكفالة أمانة لا تُعد إيراد رسوم عند الإيداع."],
      additionalLines: input.stage === "filing" ? [{
        ...fixedFeeLine("RECUSAL_GUARANTEE", "كفالة طلب الرد - أمانة", 300 * POUND, "تودع عند التقرير بطلب الرد وترد أو تصادر بحسب الحكم", civilProcedureSource),
        financialClass: "deposit"
      }] : [],
      warnings: input.stage === "filing"
        ? ["يشمل إجمالي المبلغ المطلوب الآن كفالة مقدارها 300 جنيه، لكنها تُسجل محاسبيًا كأمانة مستقلة عن إيراد الرسوم."]
        : []
    };
  }

  if (input.caseTypeId === "state-council-annulment") {
    return {
      input,
      assumptions: ["المسار يخص طلب إلغاء غير مقترن بحق مالي محدد؛ الطلب المالي المنفصل يجب إدخاله كبطاقة طلب مستقلة."],
      originalOverride: fixedFeeLine("STATE_COUNCIL_ANNULMENT", "الرسم الثابت لدعوى الإلغاء أمام مجلس الدولة", 10 * POUND, "دعوى إلغاء غير معلومة القيمة", stateCouncilSource)
    };
  }

  if (input.caseTypeId === "state-council-supreme-appeal") {
    const additionalLines = input.caseFacts?.stateCouncilIncludesStay
      ? [fixedFeeLine("STATE_COUNCIL_STAY", "طلب وقف التنفيذ أمام الإدارية العليا", 40 * POUND, "طلب وقف تنفيذ مرتبط بالطعن", stateCouncilSource)]
      : [];
    return {
      input,
      assumptions: [input.caseFacts?.stateCouncilIncludesStay ? "أضيف طلب وقف التنفيذ كوعاء ثابت مستقل." : "لا يوجد طلب وقف تنفيذ مسجل."],
      originalOverride: fixedFeeLine("STATE_COUNCIL_SUPREME_APPEAL", "رسم الطعن أمام المحكمة الإدارية العليا", 75 * POUND, "طعن من ذوي الشأن أمام الإدارية العليا", stateCouncilSource),
      additionalLines
    };
  }

  if (["execution-first", "execution-repeat", "arbitration-award-execution"].includes(input.caseTypeId)) {
    const executionAmount = input.caseFacts?.executionAmountMillieme;
    if (!Number.isInteger(executionAmount) || (executionAmount ?? 0) <= 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const repeat = input.caseTypeId === "execution-repeat";
    const divisor = repeat ? 9 : 3;
    const fullOriginal = calculateProgressiveRelative(executionAmount ?? 0, rules);
    const principal = Math.max(500, Math.round(fullOriginal / divisor));
    const principalLine: FeeLine = {
      code: "EXECUTION_PRINCIPAL",
      label: repeat ? "رسم إعادة التنفيذ" : "رسم التنفيذ لأول مرة",
      amountMillieme: principal,
      basis: `المبلغ المطلوب تنفيذه ${formatMoney(executionAmount ?? 0)}؛ الرسم الأصلي الكامل ${formatMoney(fullOriginal)}`,
      calculation: `${repeat ? "تسع" : "ثلث"} الرسم الأصلي مع حد أدنى 0.500 جنيه = ${formatMoney(principal)}`,
      ruleVersion,
      confidence: "operational",
      source: executionSource
    };
    const additionalLines: FeeLine[] = [];
    if ((executionAmount ?? 0) >= 15 * POUND) {
      const initialFixed = input.courtLevel === "partial" ? 1 * POUND : 2.5 * POUND;
      const fixedAmount = repeat ? Math.max(500, Math.round(initialFixed / 3)) : initialFixed;
      additionalLines.push({
        code: "EXECUTION_FIXED_SURCHARGE",
        label: "الرسم الثابت المصاحب للتنفيذ",
        amountMillieme: fixedAmount,
        basis: `درجة السند ${courtLevelLabel(input.courtLevel)} ومبلغ التنفيذ لا يقل عن 15 جنيهًا`,
        calculation: repeat ? `ثلث ${formatMoney(initialFixed)} بحد أدنى 0.500 جنيه` : formatMoney(fixedAmount),
        ruleVersion,
        confidence: "verified",
        source: executionSource
      });
    }
    return {
      input: { ...input, claimAmountMillieme: executionAmount },
      assumptions: [input.caseTypeId === "arbitration-award-execution"
        ? "عومل مبلغ حكم التحكيم المعلوم كوعاء تنفيذ، لا كرسم دعوى موضوعية جديدة."
        : repeat ? "اختير مسار إعادة التنفيذ؛ يلزم الاحتفاظ بمرجع التنفيذ الأول." : "اختير مسار التنفيذ لأول مرة."],
      originalOverride: principalLine,
      additionalLines,
      includeStandardAddons: false,
      warnings: ["النتيجة لا تضيف مصروفات المحضر أو الانتقال أو الإعلان دون وحداتها ومستنداتها الفعلية."]
    };
  }

  if (caseType.profileId === "lease-termination") {
    const monthlyRent = input.caseFacts?.leaseMonthlyRentMillieme;
    const months = input.caseFacts?.leaseMonthsForValuation;
    const includesArrears = input.caseFacts?.leaseIncludesArrears === true;
    const arrears = input.caseFacts?.leaseArrearsMillieme;
    if (!Number.isInteger(monthlyRent) || (monthlyRent ?? 0) <= 0 || !Number.isInteger(months) || (months ?? 0) <= 0) {
      throw new Error("CASE_TYPE_FACTS_REQUIRED");
    }
    if (includesArrears && (!Number.isInteger(arrears) || (arrears ?? -1) < 0)) {
      throw new Error("CASE_TYPE_FACTS_REQUIRED");
    }
    const terminationValue = (monthlyRent ?? 0) * (months ?? 0);
    if (!Number.isSafeInteger(terminationValue)) throw new Error("INVALID_MONEY");
    const claimAmount = includesArrears ? Math.max(terminationValue, arrears ?? 0) : terminationValue;
    return {
      input: { ...input, claimAmountMillieme: claimAmount },
      assumptions: [includesArrears
        ? `قيمة طلب الإنهاء ${formatMoney(terminationValue)} وقيمة المتأخرات ${formatMoney(arrears ?? 0)}؛ استُخدم الأعلى بينهما دون جمع آلي.`
        : `قيمة طلب الإنهاء مشتقة من ${months} شهرًا × ${formatMoney(monthlyRent ?? 0)} أجرة شهرية.`]
    };
  }

  if (caseType.valuationTemplate === "contract-value") {
    const subjectValue = input.caseFacts?.contractSubjectValueMillieme;
    const counterValue = input.caseFacts?.contractCounterValueMillieme;
    if (!Number.isInteger(subjectValue) || (subjectValue ?? 0) <= 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    if (counterValue !== undefined && (!Number.isInteger(counterValue) || counterValue <= 0)) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const claimAmount = Math.max(subjectValue ?? 0, counterValue ?? 0);
    return {
      input: { ...input, claimAmountMillieme: claimAmount },
      assumptions: [counterValue === undefined
        ? `قيمة محل العقد المستخدمة وعاءً للرسم: ${formatMoney(subjectValue ?? 0)}.`
        : `قيمة طرفي البدل ${formatMoney(subjectValue ?? 0)} و${formatMoney(counterValue)}؛ استُخدمت القيمة الأعلى دون جمع.`]
    };
  }

  if (caseType.valuationTemplate === "property-derived-value") {
    const kind = input.caseFacts?.propertyKind;
    const numerator = input.caseFacts?.propertyShareNumerator ?? 1;
    const denominator = input.caseFacts?.propertyShareDenominator ?? 1;
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator <= 0 || denominator <= 0 || numerator > denominator) {
      throw new Error("CASE_TYPE_FACTS_REQUIRED");
    }
    const annualBase = kind === "agricultural"
      ? input.caseFacts?.propertyAnnualTaxMillieme
      : kind === "built"
        ? input.caseFacts?.propertyAnnualRentalValueMillieme
        : undefined;
    const factor = kind === "agricultural" ? 70 : kind === "built" ? 15 : 0;
    if (!Number.isInteger(annualBase) || (annualBase ?? 0) <= 0 || factor === 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const wholeValue = (annualBase ?? 0) * factor;
    if (!Number.isSafeInteger(wholeValue)) throw new Error("INVALID_MONEY");
    const claimAmount = Math.round((wholeValue * numerator) / denominator);
    if (!Number.isSafeInteger(claimAmount) || claimAmount <= 0) throw new Error("INVALID_MONEY");
    return {
      input: { ...input, claimAmountMillieme: claimAmount },
      assumptions: [`قيمة ${kind === "agricultural" ? "الأرض الزراعية" : "العقار المبني"} = ${formatMoney(annualBase ?? 0)} × ${factor} × الحصة ${numerator}/${denominator} = ${formatMoney(claimAmount)}.`]
    };
  }

  if (caseType.valuationTemplate === "periodic-payment") {
    const annualAmount = input.caseFacts?.periodicAnnualAmountMillieme;
    const term = input.caseFacts?.periodicTerm;
    const years = input.caseFacts?.periodicYears;
    if (!Number.isInteger(annualAmount) || (annualAmount ?? 0) <= 0 || !term) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const factor = term === "permanent" ? 20 : term === "life" ? 10 : Number.isInteger(years) && (years ?? 0) > 0 ? Math.min(years ?? 0, 10) : 0;
    if (factor <= 0) throw new Error("CASE_TYPE_FACTS_REQUIRED");
    const claimAmount = (annualAmount ?? 0) * factor;
    if (!Number.isSafeInteger(claimAmount)) throw new Error("INVALID_MONEY");
    return {
      input: { ...input, claimAmountMillieme: claimAmount },
      assumptions: [`قيمة الاستحقاق الدوري = ${formatMoney(annualAmount ?? 0)} سنويًا × ${factor} ${term === "temporary" ? "سنوات" : "وفق معامل المادة 75"} = ${formatMoney(claimAmount)}.`]
    };
  }

  if (caseType.valuationTemplate === "company-interest") {
    const interestValue = input.caseFacts?.companyInterestValueMillieme;
    if (input.valueKind !== "known" || !Number.isInteger(interestValue) || (interestValue ?? 0) <= 0) {
      throw new Error("CASE_TYPE_FACTS_REQUIRED");
    }
    return {
      input: { ...input, claimAmountMillieme: interestValue },
      assumptions: [`المصلحة المالية محل النزاع في الشركة أو الحصة: ${formatMoney(interestValue ?? 0)}؛ لم يستخدم رأس المال الكامل تلقائيًا.`]
    };
  }

  if (input.stage === "final" && caseType.finalSettlementPolicy === "value-kind-dependent") {
    return {
      input,
      assumptions: ["اعتمد مسار التسوية على كون الحق النهائي معلومًا أو مجهول القيمة بعد قراءة منطوق الحكم؛ لا يُستخدم هذا الإقرار لحساب رسم القيد."]
    };
  }
  if (caseType.coverage === "conditional") throw new Error("CASE_TYPE_FACTS_REQUIRED");
  return { input, assumptions: [] };
}
