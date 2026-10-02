import type {
  CaseType,
  EstimateInput,
  FeeBaseNature,
  FeeReliefRule,
  FeeTreatment,
  SourceRef
} from "./types.js";

const courtOfCassationFeesUrl = "https://register.cc.gov.eg/publications/145/download";

const sources = {
  article6: {
    id: "law-90-1944-article-6",
    title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته",
    article: "المادة 6: حالات تخفيض الرسم إلى النصف أو الربع",
    url: courtOfCassationFeesUrl
  },
  legalAid: {
    id: "law-90-1944-articles-23-29",
    title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته",
    article: "المواد 23 إلى 29: الإعفاء القضائي بسبب العجز عن الدفع وآثاره",
    url: courtOfCassationFeesUrl
  },
  government: {
    id: "law-90-1944-article-50-cassation",
    title: "قانون الرسوم القضائية ومبادئ محكمة النقض في مدلول الحكومة",
    article: "المادة 50؛ والطعن 6931 لسنة 82 ق جلسة 2/4/2018",
    url: courtOfCassationFeesUrl
  },
  family: {
    id: "law-1-2000-family-article-3",
    title: "قانون تنظيم بعض أوضاع وإجراءات التقاضي في مسائل الأحوال الشخصية رقم 1 لسنة 2000",
    article: "المادة 3: النفقات وما في حكمها من الأجور والمصروفات",
    url: courtOfCassationFeesUrl
  },
  labour: {
    id: "law-14-2025-labour-article-7",
    title: "قانون العمل رقم 14 لسنة 2025",
    article: "المادة 7: دعاوى العامل والمتدرج والمتلمذ الصناعي والمستحق عنهم الناشئة عن القانون",
    url: "https://www.labour.gov.eg/media/0iedik3q/%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%B1%D9%82%D9%85-14-%D9%84%D8%B3%D9%86%D8%A9-2025-%D8%A8%D8%A5%D8%B5%D8%AF%D8%A7%D8%B1-%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A7%D9%84%D8%B9%D9%85%D9%84.pdf"
  },
  socialInsurance: {
    id: "law-148-2019-social-insurance-article-126",
    title: "قانون التأمينات الاجتماعية والمعاشات رقم 148 لسنة 2019",
    article: "المادة 126: دعاوى الهيئة والمؤمن عليهم وأصحاب المعاشات والمستحقين طبقًا للقانون",
    url: "https://www.nosi.gov.eg/ar/News/Pages/Pension-Law-1.aspx"
  },
  universalHealth: {
    id: "law-2-2018-universal-health-article-56",
    title: "قانون نظام التأمين الصحي الشامل رقم 2 لسنة 2018",
    article: "المادة 56: دعاوى الهيئة أو المؤمن عليهم المتعلقة بتنفيذ أحكام القانون",
    url: "https://sis.gov.eg/media/634029/%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A7%D9%84%D8%AA%D8%A3%D9%85%D9%8A%D9%86-%D8%A7%D9%84%D8%B5%D8%AD%D9%8A-%D8%A7%D9%84%D8%B4%D8%A7%D9%85%D9%84.pdf"
  },
  nasser: {
    id: "law-66-1971-nasser-bank-article-11",
    title: "قانون إنشاء بنك ناصر الاجتماعي رقم 66 لسنة 1971 المعدل بالقانون 60 لسنة 1975",
    article: "المادة 11؛ ومبادئ محكمة النقض بشأن شمول الإعفاء للرسوم القضائية",
    url: courtOfCassationFeesUrl
  },
  disability: {
    id: "law-10-2018-disability-article-31",
    title: "قانون حقوق الأشخاص ذوي الإعاقة رقم 10 لسنة 2018",
    article: "المادة 31/بند 5: الدعاوى المرتبطة بحماية الحقوق بسبب الإعاقة",
    url: "https://hrightsstudies.sis.gov.eg/%D9%82%D9%88%D8%A7%D9%86%D9%8A%D9%86/%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%B1%D9%82%D9%85-%D9%A1%D9%A0-%D9%84%D8%B3%D9%86%D8%A9-%D9%A2%D9%A0%D9%A1%D8-%D8%A8%D8%B4%D8%A3%D9%86-%D8%AD%D9%82%D9%88%D9%82-%D8%A7%D9%84%D8%A3%D8%B4%D8%AE%D8%A7%D8%B5-%D8%B0%D9%88%D9%8A-%D8%A7%D9%84%D8%A5%D8%B9%D8%A7%D9%82%D8%A9/"
  },
  disabilityCouncil: {
    id: "law-11-2019-disability-council-article-12",
    title: "قانون المجلس القومي للأشخاص ذوي الإعاقة رقم 11 لسنة 2019",
    article: "المادة 12: دعاوى المجلس المرتبطة بحماية الأشخاص ذوي الإعاقة",
    url: "https://sis.gov.eg/ar/%D8%A7%D9%84%D9%85%D8%B1%D9%83%D8%B2-%D8%A7%D9%84%D8%A5%D8%B9%D9%84%D8%A7%D9%85%D9%8A/%D8%A7%D9%84%D9%85%D9%84%D9%81%D8%A7%D8%AA/%D8%AB%D9%88%D8%B1%D8%A9-30-%D9%8A%D9%88%D9%86%D9%8A%D9%88/"
  },
  childhoodCouncil: {
    id: "law-182-2023-childhood-council-article-27",
    title: "قانون إعادة تنظيم المجلس القومي للطفولة والأمومة رقم 182 لسنة 2023",
    article: "المادة 27: دعاوى المجلس المرتبطة بحماية الطفولة والأمومة",
    url: "https://mediadr.sis.gov.eg/bitstream/handle/123456789/40585/ESR20231017_005.pdf?isAllowed=y&sequence=1"
  }
} satisfies Record<string, SourceRef>;

function rule(
  id: string,
  title: string,
  kind: FeeReliefRule["kind"],
  factorBasisPoints: number,
  source: SourceRef,
  evidenceRequired: string[],
  scopeNote: string,
  effectiveFrom?: string
): FeeReliefRule {
  return { id, title, kind, factorBasisPoints, source, evidenceRequired, scopeNote, effectiveFrom, status: "verified" };
}

export const feeReliefRules: FeeReliefRule[] = [
  rule("law90-articles23-29-legal-aid", "إعفاء شخصي بقرار المساعدة القضائية", "exemption", 0, sources.legalAid,
    ["قرار لجنة الإعفاء", "بيان ما إذا كان الإعفاء كليًا أو جزئيًا"],
    "شخصي لا يمتد للورثة؛ وقد يرجع بالرسوم عند زوال العجز وفق الأحكام المنظمة."),
  rule("law90-article50-government", "الدعوى التي ترفعها الحكومة بمعناها الضيق", "exemption", 0, sources.government,
    ["إثبات أن رافع الدعوى وزارة أو مصلحة من الحكومة لا هيئة مستقلة"],
    "لا يمتد لمجرد كون الجهة شخصًا عامًا ذا شخصية وميزانية مستقلتين."),
  rule("law1-2000-family-maintenance", "النفقة وما في حكمها من الأجور والمصروفات", "exemption", 0, sources.family,
    ["تصنيف الطلب نفقة أو أجرًا/مصروفًا في حكمها"],
    "لا يمتد إلى المتعة أو رد نفقة غير مستحقة أو أي طلب أسري مالي آخر.", "2000-03-01"),
  rule("law14-2025-labour-worker", "دعوى العامل الناشئة عن قانون العمل", "exemption", 0, sources.labour,
    ["صفة العامل/المتدرج/المتلمذ أو المستحق عنه", "نشوء الطلب عن قانون العمل"],
    "لا يمتد إلى صاحب العمل أو منازعة تنفيذ مستقلة أو مطالبة ناشئة عن قانون آخر.", "2025-09-01"),
  rule("law148-2019-social-insurance", "منازعة تأمينات اجتماعية داخلة في القانون", "exemption", 0, sources.socialInsurance,
    ["صفة الهيئة أو المؤمن عليه أو صاحب المعاش أو المستحق", "اتصال الدعوى بتطبيق القانون 148 لسنة 2019"],
    "قاصر على الرسوم المستحقة للدولة ولا يمتد تلقائيًا لمصاريف الخصم وفق المادة 184 مرافعات.", "2020-01-01"),
  rule("law2-2018-universal-health", "منازعة تنفيذ قانون التأمين الصحي الشامل", "exemption", 0, sources.universalHealth,
    ["صفة الهيئة أو المؤمن عليه", "اتصال موضوع الدعوى بتنفيذ أحكام القانون"],
    "لا يفترض لمجرد أن النزاع صحي أو أن إحدى هيئات التأمين طرف فيه."),
  rule("law66-1971-nasser-bank", "الإعفاء الخاص لبنك ناصر الاجتماعي", "exemption", 0, sources.nasser,
    ["ثبوت صفة بنك ناصر الاجتماعي في الخصومة"],
    "الإعفاء خاص بالبنك ولا يمتد لبنوك أو هيئات أخرى بالقياس."),
  rule("law10-2018-disability-rights", "دعوى لحماية حق مرتبط بالإعاقة", "exemption", 0, sources.disability,
    ["بطاقة إثبات الإعاقة والخدمات المتكاملة", "اتصال الدعوى بتطبيق قانون الإعاقة أو حماية حق بسبب الإعاقة"],
    "يستفيد الشخص ذو الإعاقة مدعيًا أو مدعى عليه؛ ولا يشمل أتعاب المحاماة لمجرد الإعفاء من الرسوم.", "2018-02-20"),
  rule("law11-2019-disability-council", "دعاوى المجلس القومي للأشخاص ذوي الإعاقة", "exemption", 0, sources.disabilityCouncil,
    ["صفة المجلس", "اتصال النزاع بحماية الأشخاص ذوي الإعاقة"],
    "إعفاء موضوعي خاص بدعاوى المجلس في نطاق قانون الحماية.", "2019-02-20"),
  rule("law182-2023-childhood-council", "دعاوى المجلس القومي للطفولة والأمومة", "exemption", 0, sources.childhoodCouncil,
    ["صفة المجلس", "اتصال النزاع بقانون الطفل أو حماية الطفولة والأمومة"],
    "إعفاء خاص بالمجلس في نطاق موضوعي محدد.", "2023-11-17"),
  rule("law90-article6-half", "تخفيض الرسم إلى النصف", "reduction", 5_000, sources.article6,
    ["تحقق إحدى حالات النصف الواردة حصرًا في المادة 6"],
    "لا يوسع نطاق التخفيض بالقياس، ولا يجمع حسابيًا مع تخفيض آخر عن الواقعة ذاتها."),
  rule("law90-article6-quarter", "تخفيض الرسم إلى الربع", "reduction", 2_500, sources.article6,
    ["تحقق إحدى حالات الربع الواردة حصرًا في المادة 6"],
    "يشمل أوامر تنفيذ أحكام المحكمين والاعتراض في القوائم المؤقتة والعودة بعد الشطب بشروطها.")
];

const ruleById = new Map(feeReliefRules.map((item) => [item.id, item]));

function getRule(id: string): FeeReliefRule {
  const item = ruleById.get(id);
  if (!item) throw new Error(`UNKNOWN_FEE_RELIEF_RULE:${id}`);
  return item;
}

function baseNature(caseType: CaseType): FeeBaseNature {
  if (caseType.classification === "relative") return "relative";
  if (caseType.classification === "fixed") return "fixed";
  if (caseType.valuationTemplate === "statutory-exemption") return "regulated";
  return "review";
}

function resolved(ruleId: string, base: FeeBaseNature, reason: string): FeeTreatment {
  const item = getRule(ruleId);
  return {
    baseNature: base,
    kind: item.kind === "exemption" ? "exempt" : "reduced",
    factorBasisPoints: item.factorBasisPoints,
    ruleId: item.id,
    title: item.title,
    reason,
    source: item.source,
    evidenceRequired: item.evidenceRequired,
    scopeNote: item.scopeNote
  };
}

function standard(base: FeeBaseNature, reason = "لا يوجد في البيانات المدخلة سند إعفاء أو تخفيض منطبق حصرًا."): FeeTreatment {
  return {
    baseNature: base,
    kind: base === "review" ? "review" : "standard",
    factorBasisPoints: 10_000,
    title: base === "relative" ? "رسم نسبي" : base === "fixed" ? "رسم ثابت" : base === "regulated" ? "معاملة بنص خاص" : "يلزم تحديد الوعاء",
    reason,
    evidenceRequired: []
  };
}

function isOnOrAfter(date: string, effectiveFrom: string): boolean {
  return date >= effectiveFrom;
}

function article6Reduction(input: EstimateInput, caseType: CaseType): "law90-article6-half" | "law90-article6-quarter" | undefined {
  if (["settled", "abandoned"].includes(input.finalOutcome ?? "")) return undefined;
  const context = input.feeRelief?.reductionContext ?? "none";
  const sameIdentity = input.feeRelief?.sameSubjectAndParties === true;
  const halfByCase = caseType.profileId === "partition"
    || [
      "article76-petition-order-grievance",
      "appeal-order",
      "creditor-distribution",
      "bankruptcy-asset-distribution",
      "tax-profit-assessment-dispute"
    ].includes(input.caseTypeId);
  const quarterByCase = [
    "article76-arbitration-execution-order-unknown",
    "arbitration-exequatur-order-known",
    "provisional-distribution-objection"
  ].includes(input.caseTypeId);
  const halfByContext = ["default-judgment-opposition", "fee-list-opposition"].includes(context)
    || (["return-invalid-proceedings", "return-invalid-summons", "appeal-deemed-never-filed"].includes(context) && sameIdentity);
  const quarterByContext = context === "provisional-distribution-objection"
    || (context === "return-after-strike" && sameIdentity);
  if (quarterByCase || quarterByContext) return "law90-article6-quarter";
  if (halfByCase || halfByContext) return "law90-article6-half";
  return undefined;
}

export function resolveFeeTreatment(input: EstimateInput, caseType: CaseType): FeeTreatment {
  const base = baseNature(caseType);
  const relief = input.feeRelief;

  if (input.caseTypeId === "family-maintenance") {
    return resolved("law1-2000-family-maintenance", base, "نوع الدعوى المختار هو نفقة أو طلب في حكمها بنص المادة 3.");
  }
  const labourEligible = input.caseTypeId === "labour-employee"
    || (caseType.profileId === "labour-dispute"
      && input.caseFacts?.labourClaimantRole === "employee"
      && input.caseFacts?.labourArisesUnderLaw14 === true);
  if (labourEligible && isOnOrAfter(input.calculationDate, "2025-09-01")) {
    return resolved("law14-2025-labour-worker", base, "ثبتت صفة العامل واتصال الطلب بقانون العمل في تاريخ لاحق لسريانه.");
  }

  if (relief?.legalAidDecision === "full") {
    return resolved("law90-articles23-29-legal-aid", base, "أُدخل قرار مساعدة قضائية نافذ بالإعفاء الكلي.");
  }
  if (relief?.legalAidDecision === "partial") {
    return {
      ...standard(base, "قرار المساعدة القضائية جزئي؛ يجب نقل منطوقه وحدود البنود المعفاة قبل الحساب."),
      kind: "review",
      title: "إعفاء جزئي يحتاج تفريغ القرار",
      evidenceRequired: ["صورة قرار لجنة الإعفاء", "البنود أو النسبة التي شملها القرار"],
      source: sources.legalAid
    };
  }
  if (relief?.applicant === "government" && relief.governmentActionFiledByGovernment) {
    return resolved("law90-article50-government", base, "الدعوى مرفوعة من الحكومة بمعناها الضيق وفق البيانات المدخلة.");
  }
  if (relief?.applicant === "disabled-person" && relief.disabilityCardVerified && relief.disabilityRightsDispute) {
    return resolved("law10-2018-disability-rights", base, "تحققت البطاقة واتصال النزاع بحماية حق بسبب الإعاقة.");
  }
  if (["social-insurance-authority", "social-insured-or-beneficiary"].includes(relief?.applicant ?? "") && relief?.socialInsuranceLawDispute) {
    return resolved("law148-2019-social-insurance", base, "صفة الطرف وموضوع النزاع كلاهما داخل نطاق القانون 148 لسنة 2019.");
  }
  if (["universal-health-authority", "universal-health-insured"].includes(relief?.applicant ?? "") && relief?.universalHealthLawDispute) {
    return resolved("law2-2018-universal-health", base, "صفة الطرف وموضوع النزاع كلاهما داخل نطاق تنفيذ قانون التأمين الصحي الشامل.");
  }
  if (relief?.applicant === "nasser-social-bank") {
    return resolved("law66-1971-nasser-bank", base, "الطرف المستفيد هو بنك ناصر الاجتماعي ذاته بنصه الخاص.");
  }
  if (relief?.applicant === "national-disability-council" && relief.protectedEntityLawDispute) {
    return resolved("law11-2019-disability-council", base, "الدعوى مرفوعة من المجلس وفي نطاق حماية حقوق الأشخاص ذوي الإعاقة.");
  }
  if (relief?.applicant === "childhood-motherhood-council" && relief.protectedEntityLawDispute) {
    return resolved("law182-2023-childhood-council", base, "الدعوى مرفوعة من المجلس وفي نطاق حماية الطفولة أو الأمومة.");
  }

  const reductionRule = article6Reduction(input, caseType);
  if (reductionRule) {
    return resolved(reductionRule, base, reductionRule.endsWith("quarter")
      ? "نوع الدعوى أو الواقعة الإجرائية من حالات الربع الواردة حصرًا بالمادة 6."
      : "نوع الدعوى أو الواقعة الإجرائية من حالات النصف الواردة حصرًا بالمادة 6.");
  }

  if (relief?.applicant === "independent-public-body") {
    return standard(base, "الشخص العام المستقل لا يدخل في مدلول الحكومة بالمادة 50 ما لم يوجد نص صريح خاص بإعفائه.");
  }
  if (relief?.applicant === "disabled-person") {
    return standard(base, "لم يجتمع إثبات الإعاقة مع اتصال موضوع الدعوى بحماية حق بسببها؛ فلا يطبق الإعفاء بالصفة وحدها.");
  }
  if (["social-insurance-authority", "social-insured-or-beneficiary"].includes(relief?.applicant ?? "")) {
    return standard(base, "لا يكفي اختصام هيئة التأمينات أو صفة المستفيد؛ يجب أن تنشأ الدعوى عن تطبيق قانون التأمينات نفسه.");
  }
  if (["universal-health-authority", "universal-health-insured"].includes(relief?.applicant ?? "")) {
    return standard(base, "لا يكفي الطابع الصحي للنزاع؛ يجب أن يتعلق بتنفيذ قانون التأمين الصحي الشامل.");
  }
  return standard(base);
}
