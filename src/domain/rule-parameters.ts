export const EDITABLE_RULE_CODES = [
  "ORIGINAL_RELATIVE",
  "FILING_CAP",
  "UNKNOWN_FIXED",
  "SERVICES_FUND",
  "LAWYER_FEE",
  "ADDITIONAL_BUILDINGS"
] as const;

export type EditableRuleCode = typeof EDITABLE_RULE_CODES[number];
export type RuleParameterSet = Record<string, number>;
export type RuleParameterUnit = "money" | "percent" | "pounds";

export interface RuleParameterDefinition {
  key: string;
  label: string;
  unit: RuleParameterUnit;
  min: number;
  max: number;
  step: number;
}

export interface JudicialFeeRuleConfig {
  relative: {
    smallClaimThresholdPounds: number;
    smallClaimFeeMillieme: number;
    minimumFeeMillieme: number;
    firstBandLimitPounds: number;
    firstBandRateBasisPoints: number;
    secondBandLimitPounds: number;
    secondBandRateBasisPoints: number;
    thirdBandLimitPounds: number;
    thirdBandRateBasisPoints: number;
    topRateBasisPoints: number;
  };
  filingCap: {
    firstThresholdPounds: number;
    firstCapMillieme: number;
    secondThresholdPounds: number;
    secondCapMillieme: number;
    thirdThresholdPounds: number;
    thirdCapMillieme: number;
    topCapMillieme: number;
  };
  unknownFixed: {
    partialFeeMillieme: number;
    primaryFeeMillieme: number;
    urgentFeeMillieme: number;
    urgentAppealFeeMillieme: number;
    appealFeeMillieme: number;
    cassationFeeMillieme: number;
  };
  servicesFundRateBasisPoints: number;
  lawyer: {
    partialFeeMillieme: number;
    primaryFeeMillieme: number;
    urgentFeeMillieme: number;
    appealFeeMillieme: number;
    cassationFeeMillieme: number;
  };
  courtBuildings: {
    partialExemptUpToPounds: number;
    partialLowUpToPounds: number;
    partialLowFeeMillieme: number;
    partialHighFeeMillieme: number;
    unknownPartialFeeMillieme: number;
    primaryFeeMillieme: number;
    appealFeeMillieme: number;
    cassationFeeMillieme: number;
  };
}

export const DEFAULT_JUDICIAL_FEE_RULES: JudicialFeeRuleConfig = {
  relative: {
    smallClaimThresholdPounds: 5,
    smallClaimFeeMillieme: 500,
    minimumFeeMillieme: 1_000,
    firstBandLimitPounds: 250,
    firstBandRateBasisPoints: 200,
    secondBandLimitPounds: 2_000,
    secondBandRateBasisPoints: 300,
    thirdBandLimitPounds: 4_000,
    thirdBandRateBasisPoints: 400,
    topRateBasisPoints: 500
  },
  filingCap: {
    firstThresholdPounds: 40_000,
    firstCapMillieme: 1_000_000,
    secondThresholdPounds: 100_000,
    secondCapMillieme: 2_000_000,
    thirdThresholdPounds: 1_000_000,
    thirdCapMillieme: 5_000_000,
    topCapMillieme: 10_000_000
  },
  unknownFixed: {
    partialFeeMillieme: 5_000,
    primaryFeeMillieme: 15_000,
    urgentFeeMillieme: 10_000,
    urgentAppealFeeMillieme: 15_000,
    appealFeeMillieme: 30_000,
    cassationFeeMillieme: 75_000
  },
  servicesFundRateBasisPoints: 5_000,
  lawyer: {
    partialFeeMillieme: 50_000,
    primaryFeeMillieme: 75_000,
    urgentFeeMillieme: 75_000,
    appealFeeMillieme: 100_000,
    cassationFeeMillieme: 200_000
  },
  courtBuildings: {
    partialExemptUpToPounds: 3,
    partialLowUpToPounds: 100,
    partialLowFeeMillieme: 500,
    partialHighFeeMillieme: 1_500,
    unknownPartialFeeMillieme: 1_500,
    primaryFeeMillieme: 1_500,
    appealFeeMillieme: 3_000,
    cassationFeeMillieme: 6_000
  }
};

export const DEFAULT_RULE_PARAMETERS: Record<EditableRuleCode, RuleParameterSet> = {
  ORIGINAL_RELATIVE: { ...DEFAULT_JUDICIAL_FEE_RULES.relative },
  FILING_CAP: { ...DEFAULT_JUDICIAL_FEE_RULES.filingCap },
  UNKNOWN_FIXED: { ...DEFAULT_JUDICIAL_FEE_RULES.unknownFixed },
  SERVICES_FUND: { rateBasisPoints: DEFAULT_JUDICIAL_FEE_RULES.servicesFundRateBasisPoints },
  LAWYER_FEE: { ...DEFAULT_JUDICIAL_FEE_RULES.lawyer },
  ADDITIONAL_BUILDINGS: { ...DEFAULT_JUDICIAL_FEE_RULES.courtBuildings }
};

const money = (key: string, label: string, max = 10_000_000_000): RuleParameterDefinition => ({ key, label, unit: "money", min: 0, max, step: 1 });
const percent = (key: string, label: string): RuleParameterDefinition => ({ key, label, unit: "percent", min: 0, max: 100_000, step: 1 });
const pounds = (key: string, label: string, max = 10_000_000_000): RuleParameterDefinition => ({ key, label, unit: "pounds", min: 0, max, step: 1 });

export const RULE_PARAMETER_DEFINITIONS: Record<EditableRuleCode, RuleParameterDefinition[]> = {
  ORIGINAL_RELATIVE: [
    pounds("smallClaimThresholdPounds", "حد الدعوى الصغيرة"),
    money("smallClaimFeeMillieme", "رسم الدعوى الصغيرة"),
    money("minimumFeeMillieme", "الحد الأدنى العام"),
    pounds("firstBandLimitPounds", "نهاية الشريحة الأولى"),
    percent("firstBandRateBasisPoints", "نسبة الشريحة الأولى"),
    pounds("secondBandLimitPounds", "نهاية الشريحة الثانية"),
    percent("secondBandRateBasisPoints", "نسبة الشريحة الثانية"),
    pounds("thirdBandLimitPounds", "نهاية الشريحة الثالثة"),
    percent("thirdBandRateBasisPoints", "نسبة الشريحة الثالثة"),
    percent("topRateBasisPoints", "نسبة ما زاد")
  ],
  FILING_CAP: [
    pounds("firstThresholdPounds", "نهاية شريحة القيمة الأولى"), money("firstCapMillieme", "حد التحصيل الأول"),
    pounds("secondThresholdPounds", "نهاية شريحة القيمة الثانية"), money("secondCapMillieme", "حد التحصيل الثاني"),
    pounds("thirdThresholdPounds", "نهاية شريحة القيمة الثالثة"), money("thirdCapMillieme", "حد التحصيل الثالث"),
    money("topCapMillieme", "حد التحصيل الأعلى")
  ],
  UNKNOWN_FIXED: [
    money("partialFeeMillieme", "جزئي"), money("primaryFeeMillieme", "ابتدائي"), money("urgentFeeMillieme", "مستعجل"),
    money("urgentAppealFeeMillieme", "استئناف مستعجل"), money("appealFeeMillieme", "استئناف"), money("cassationFeeMillieme", "نقض")
  ],
  SERVICES_FUND: [percent("rateBasisPoints", "نسبة رسم الخدمات")],
  LAWYER_FEE: [
    money("partialFeeMillieme", "جزئي"), money("primaryFeeMillieme", "ابتدائي"), money("urgentFeeMillieme", "مستعجل"),
    money("appealFeeMillieme", "استئناف"), money("cassationFeeMillieme", "نقض")
  ],
  ADDITIONAL_BUILDINGS: [
    pounds("partialExemptUpToPounds", "إعفاء الجزئي حتى"), pounds("partialLowUpToPounds", "نهاية فئة الجزئي المنخفضة"),
    money("partialLowFeeMillieme", "رسم الجزئي المنخفض"), money("partialHighFeeMillieme", "رسم الجزئي الأعلى"),
    money("unknownPartialFeeMillieme", "جزئي مجهول القيمة"), money("primaryFeeMillieme", "ابتدائي"),
    money("appealFeeMillieme", "استئناف"), money("cassationFeeMillieme", "نقض")
  ]
};

export function isEditableRuleCode(code: string): code is EditableRuleCode {
  return (EDITABLE_RULE_CODES as readonly string[]).includes(code);
}

export function validateRuleParameters(code: string, value: unknown): RuleParameterSet {
  if (!isEditableRuleCode(code) || typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("RULE_PARAMETERS_INVALID");
  }
  const record = value as Record<string, unknown>;
  const definitions = RULE_PARAMETER_DEFINITIONS[code];
  const expected = definitions.map((item) => item.key).sort();
  const actual = Object.keys(record).sort();
  if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index])) throw new Error("RULE_PARAMETERS_INVALID");
  const normalized: RuleParameterSet = {};
  for (const definition of definitions) {
    const parameter = record[definition.key];
    if (typeof parameter !== "number" || !Number.isSafeInteger(parameter) || parameter < definition.min || parameter > definition.max) {
      throw new Error("RULE_PARAMETERS_INVALID");
    }
    normalized[definition.key] = parameter;
  }
  if (code === "ORIGINAL_RELATIVE") {
    if (!(normalized.smallClaimThresholdPounds <= normalized.firstBandLimitPounds
      && normalized.firstBandLimitPounds < normalized.secondBandLimitPounds
      && normalized.secondBandLimitPounds < normalized.thirdBandLimitPounds)) throw new Error("RULE_PARAMETERS_INVALID");
  }
  if (code === "FILING_CAP") {
    if (!(normalized.firstThresholdPounds < normalized.secondThresholdPounds
      && normalized.secondThresholdPounds < normalized.thirdThresholdPounds
      && normalized.firstCapMillieme <= normalized.secondCapMillieme
      && normalized.secondCapMillieme <= normalized.thirdCapMillieme
      && normalized.thirdCapMillieme <= normalized.topCapMillieme)) throw new Error("RULE_PARAMETERS_INVALID");
  }
  if (code === "ADDITIONAL_BUILDINGS" && normalized.partialExemptUpToPounds > normalized.partialLowUpToPounds) {
    throw new Error("RULE_PARAMETERS_INVALID");
  }
  return normalized;
}

export function applyRuleParameters(
  config: JudicialFeeRuleConfig,
  code: string,
  value: unknown
): JudicialFeeRuleConfig {
  const parameters = validateRuleParameters(code, value);
  const next = structuredClone(config);
  switch (code as EditableRuleCode) {
    case "ORIGINAL_RELATIVE": next.relative = parameters as unknown as JudicialFeeRuleConfig["relative"]; break;
    case "FILING_CAP": next.filingCap = parameters as unknown as JudicialFeeRuleConfig["filingCap"]; break;
    case "UNKNOWN_FIXED": next.unknownFixed = parameters as unknown as JudicialFeeRuleConfig["unknownFixed"]; break;
    case "SERVICES_FUND": next.servicesFundRateBasisPoints = parameters.rateBasisPoints; break;
    case "LAWYER_FEE": next.lawyer = parameters as unknown as JudicialFeeRuleConfig["lawyer"]; break;
    case "ADDITIONAL_BUILDINGS": next.courtBuildings = parameters as unknown as JudicialFeeRuleConfig["courtBuildings"]; break;
  }
  return next;
}

function formatMoney(millieme: number): string {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 3 }).format(millieme / 1_000);
}

function formatPercent(basisPoints: number): string {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(basisPoints / 100)}%`;
}

export function formatRuleFormula(code: string, value: unknown): string {
  const p = validateRuleParameters(code, value);
  switch (code as EditableRuleCode) {
    case "ORIGINAL_RELATIVE":
      return `${formatPercent(p.firstBandRateBasisPoints)} حتى ${p.firstBandLimitPounds}؛ ${formatPercent(p.secondBandRateBasisPoints)} حتى ${p.secondBandLimitPounds}؛ ${formatPercent(p.thirdBandRateBasisPoints)} حتى ${p.thirdBandLimitPounds}؛ ${formatPercent(p.topRateBasisPoints)} فيما زاد`;
    case "FILING_CAP":
      return `حدود ${formatMoney(p.firstCapMillieme)}/${formatMoney(p.secondCapMillieme)}/${formatMoney(p.thirdCapMillieme)}/${formatMoney(p.topCapMillieme)} جنيه عند قيم ${p.firstThresholdPounds}/${p.secondThresholdPounds}/${p.thirdThresholdPounds}`;
    case "UNKNOWN_FIXED":
      return `جزئي ${formatMoney(p.partialFeeMillieme)}؛ ابتدائي ${formatMoney(p.primaryFeeMillieme)}؛ مستعجل ${formatMoney(p.urgentFeeMillieme)}؛ استئناف ${formatMoney(p.appealFeeMillieme)}؛ نقض ${formatMoney(p.cassationFeeMillieme)} جنيه`;
    case "SERVICES_FUND": return `${formatPercent(p.rateBasisPoints)} من الرسم القضائي الأصلي المستحق`;
    case "LAWYER_FEE":
      return `جزئي ${formatMoney(p.partialFeeMillieme)}؛ ابتدائي ${formatMoney(p.primaryFeeMillieme)}؛ مستعجل ${formatMoney(p.urgentFeeMillieme)}؛ استئناف ${formatMoney(p.appealFeeMillieme)}؛ نقض ${formatMoney(p.cassationFeeMillieme)} جنيه`;
    case "ADDITIONAL_BUILDINGS":
      return `جزئي ${formatMoney(p.partialLowFeeMillieme)}/${formatMoney(p.partialHighFeeMillieme)}؛ ابتدائي ${formatMoney(p.primaryFeeMillieme)}؛ استئناف ${formatMoney(p.appealFeeMillieme)}؛ نقض ${formatMoney(p.cassationFeeMillieme)} جنيه`;
  }
}
