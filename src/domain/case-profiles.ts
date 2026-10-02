import type { CaseTypeProfile, CaseTypeSeed } from "./types.js";

const JUDICIAL_FEES_SOURCE = ["law-90-1944-amended-126-2009"];

function profile(
  value: Omit<CaseTypeProfile, "sourceIds" | "supportedCourtLevels" | "finalSettlementPolicy"> & {
    sourceIds?: string[];
    supportedCourtLevels?: CaseTypeProfile["supportedCourtLevels"];
    finalSettlementPolicy?: CaseTypeProfile["finalSettlementPolicy"];
  }
): CaseTypeProfile {
  const finalSettlementPolicy: CaseTypeProfile["finalSettlementPolicy"] = value.finalSettlementPolicy
    ?? (value.coverage === "blocked"
      ? "legal-review-required"
      : value.valuationTemplate === "case-specific-review"
        ? "value-kind-dependent"
      : value.jurisdiction === "criminal"
        ? "criminal-on-conviction"
        : value.jurisdiction === "constitutional"
          ? "constitutional-guarantee"
          : value.valuationTemplate === "statutory-exemption"
            ? value.coverage === "calculable" ? "exempt-all-stages" : "eligibility-dependent"
            : value.jurisdiction === "enforcement" || value.jurisdiction === "arbitration"
              ? "operation-not-applicable"
              : value.valuationTemplate === "unknown-value"
                ? "fixed-paid-at-filing"
                : "relative-on-relief");
  return {
    ...value,
    finalSettlementPolicy,
    sourceIds: value.sourceIds ?? JUDICIAL_FEES_SOURCE,
    supportedCourtLevels: value.supportedCourtLevels ?? ["partial", "primary"]
  };
}

export const caseTypeProfiles = {
  "money-claim": profile({
    id: "money-claim", name: "مطالبة مالية معلومة", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"], requiredFacts: []
  }),
  compensation: profile({
    id: "compensation", name: "تعويض محدد المقدار", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "compensation-amount", allowedValueKinds: ["known"], requiredFacts: []
  }),
  "lease-termination": profile({
    id: "lease-termination", name: "إنهاء أو فسخ أو إخلاء علاقة إيجارية", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "lease-derived-value", allowedValueKinds: ["known"],
    requiredFacts: ["قيمة الأجرة", "مدة العقد أو المدة المتبقية", "سبب الإنهاء والطلبات المرتبطة"],
    reviewNote: "قيمة الدعوى الإيجارية لا تساوي مبلغًا يدخله المستخدم اعتباطًا؛ يلزم اشتقاقها من وقائع العقد والطلب."
  }),
  "signature-validity": profile({
    id: "signature-validity", name: "صحة توقيع", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: []
  }),
  "original-forgery": profile({
    id: "original-forgery", name: "دعوى تزوير أصلية", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: []
  }),
  "evidence-request": profile({
    id: "evidence-request", name: "إجراء إثبات مستقل", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: []
  }),
  "urgent-provisional": profile({
    id: "urgent-provisional", name: "طلب وقتي أو مستعجل", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: []
  }),
  "order-grievance": profile({
    id: "order-grievance", name: "تظلم أو طعن في أمر", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: []
  }),
  "article-76-unknown": profile({
    id: "article-76-unknown", name: "دعوى مجهولة القيمة بنص المادة 76", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: [],
    sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-principles"],
    reviewNote: "هذا الملف مقصور على الحالة المسماة صراحة في المادة 76. إذا انضم طلب مالي مستقل أو تحول النزاع إلى أصل الحق القابل للتقدير، يجب فصل الطلبات وإعادة تحديد الوعاء."
  }),
  "article-76-judgment-correction": profile({
    id: "article-76-judgment-correction", name: "طلب تفسير الحكم أو تصحيحه", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: [],
    sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-principles"],
    finalSettlementPolicy: "fixed-paid-at-filing",
    reviewNote: "يستحق الرسم الثابت عند القيد، وترد الرسوم إذا قضى بإجابة طلب التفسير أو التصحيح وفق المادة 22."
  }),
  "recusal-request": profile({
    id: "recusal-request", name: "طلب رد قاضٍ أو خبير أو محكم", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: [],
    supportedCourtLevels: ["partial", "primary", "appeal", "cassation"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-13-1968-civil-procedure"],
    reviewNote: "الرسم الثابت منفصل عن كفالة الرد؛ الكفالة أمانة تُرد أو تُصادر بحسب القرار ولا تُسجل إيراد رسوم عند الإيداع."
  }),
  "contract-value": profile({
    id: "contract-value", name: "صحة أو نفاذ أو بطلان أو فسخ تصرف", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "contract-value", allowedValueKinds: ["known"],
    requiredFacts: ["نوع التصرف", "محل التصرف", "قيمة محل التصرف وفق قاعدة التقدير القانونية"],
    reviewNote: "الثمن المكتوب ليس دائمًا وعاء الرسم؛ يختلف التقدير باختلاف محل التصرف وطلباته."
  }),
  "property-right": profile({
    id: "property-right", name: "ملكية أو حق عيني عقاري", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "property-derived-value", allowedValueKinds: ["known"],
    requiredFacts: ["نوع العقار", "المساحة", "الضريبة أو القيمة القانونية اللازمة للتقدير", "نطاق الحق المطلوب"]
  }),
  "possession-delivery": profile({
    id: "possession-delivery", name: "حيازة أو طرد أو تسليم", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["طبيعة المال", "سند الحيازة", "هل الطلب أصلي أم تابع", "وجود مقابل مالي"]
  }),
  partition: profile({
    id: "partition", name: "قسمة أو فرز وتجنيب", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "property-derived-value", allowedValueKinds: ["known"],
    requiredFacts: ["قيمة المال الشائع", "حصة طالب القسمة", "نوع المال"]
  }),
  "accounting-liquidation": profile({
    id: "accounting-liquidation", name: "حساب أو تصفية", jurisdiction: "ordinary-commercial",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["هل المبلغ محدد وقت الرفع", "الفترة محل الحساب", "الطلبات المالية التابعة"]
  }),
  "company-dispute": profile({
    id: "company-dispute", name: "شركة أو شريك أو إدارة شركة", jurisdiction: "economic",
    coverage: "conditional", valuationTemplate: "company-interest", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["شكل الشركة", "قيمة الحصة أو رأس المال محل النزاع", "الطلب القضائي", "الاختصاص النوعي"]
  }),
  "bankruptcy-declaration": profile({
    id: "bankruptcy-declaration", name: "إفلاس أو إعادة هيكلة", jurisdiction: "bankruptcy",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["صفة التاجر", "نوع الإجراء", "المحكمة الاقتصادية المختصة", "قيمة الديون إن كانت وعاءً"],
    reviewNote: "لا يجوز تمرير الإفلاس إلى معادلة الدعوى المدنية العامة قبل تحديد الإجراء المنطبق قانونًا."
  }),
  "bankruptcy-declaration-fixed": profile({
    id: "bankruptcy-declaration-fixed", name: "طلب إشهار الإفلاس أو الصلح الواقي", jurisdiction: "bankruptcy",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: [],
    sourceIds: ["law-90-1944-amended-126-2009"],
    reviewNote: "يغطي رسم الطلب فقط؛ النشر واللصق وإجراءات التفليسة بنود مستقلة."
  }),
  "labour-dispute": profile({
    id: "labour-dispute", name: "منازعة عمل", jurisdiction: "labour",
    coverage: "conditional", valuationTemplate: "statutory-exemption", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["صفة رافع الدعوى", "طبيعة علاقة العمل", "بنود المطالبة", "سند الإعفاء ومداه"],
    sourceIds: ["law-14-2025-labour"],
    reviewNote: "الإعفاء العمالي مرتبط بالصفة والطلب؛ لا يُفترض من اسم الدعوى وحده."
  }),
  "labour-employee-exempt": profile({
    id: "labour-employee-exempt", name: "دعوى ناشئة عن قانون العمل يرفعها عامل أو مستحق عنه", jurisdiction: "labour",
    coverage: "calculable", valuationTemplate: "statutory-exemption", allowedValueKinds: ["known", "unknown"],
    requiredFacts: [], supportedCourtLevels: ["partial", "primary", "appeal", "cassation"], sourceIds: ["law-14-2025-labour"],
    reviewNote: "الإعفاء مرتبط بصفة رافع الدعوى وتاريخ سريان القانون 14 لسنة 2025."
  }),
  "labour-employer-claim": profile({
    id: "labour-employer-claim", name: "مطالبة معلومة يرفعها صاحب العمل", jurisdiction: "labour",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"], requiredFacts: [],
    supportedCourtLevels: ["partial", "primary", "appeal", "cassation"], sourceIds: ["law-90-1944-amended-126-2009", "law-14-2025-labour"],
    reviewNote: "لا يمتد إعفاء العامل إلى صاحب العمل؛ يطبق وعاء المطالبة المالية ما لم يوجد إعفاء آخر موثق."
  }),
  "pension-insurance": profile({
    id: "pension-insurance", name: "معاش أو تأمين اجتماعي", jurisdiction: "labour",
    coverage: "conditional", valuationTemplate: "periodic-payment", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["صفة المستحق", "قيمة المتجمد", "قيمة الدفعة الدورية", "مدة الاستحقاق", "سند الإعفاء"]
  }),
  "family-maintenance": profile({
    id: "family-maintenance", name: "نفقة وأحوال شخصية", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "statutory-exemption", allowedValueKinds: ["known", "unknown"],
    requiredFacts: [], supportedCourtLevels: ["partial", "primary", "appeal", "cassation"],
    sourceIds: ["law-1-2000-family-procedure"],
    reviewNote: "الإعفاء الآلي مقصور على المسمى المعتمد «نفقة وما في حكمها من الأجور والمصروفات» ولا يمتد إلى طلب أسري آخر."
  }),
  "family-divorce-fixed": profile({
    id: "family-divorce-fixed", name: "تطليق أو خلع أو تفريق بين الزوجين", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-principles"],
    reviewNote: "المادة 49 تقرر رسمًا ثابتًا لدعاوى الحقوق الشخصية غير المالية بين الزوجين، ومنها التطليق؛ الطلب المالي المنضم يعامل مستقلاً."
  }),
  "family-parentage-fixed": profile({
    id: "family-parentage-fixed", name: "إثبات النسب أو إنكاره", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-principles"],
    reviewNote: "المادة 49 تقرر رسمًا ثابتًا لدعوى إثبات النسب أو إنكاره أو المنازعة في الإقرار به."
  }),
  "family-article49-five-action": profile({
    id: "family-article49-five-action", name: "دعوى أحوال شخصية برسم المادة 49/أولًا", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "fixed-paid-at-filing",
    reviewNote: "الرسم الأصلي خمسة جنيهات وفق البند أولًا من المادة 49؛ الطلب المالي المستقل لا يندمج في هذا الرسم."
  }),
  "family-article49-five-application": profile({
    id: "family-article49-five-application", name: "طلب أحوال شخصية برسم خمسة جنيهات", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "operation-not-applicable",
    reviewNote: "هذا طلب أو محضر مستقل برسم خمسة جنيهات؛ لا تنشأ له تسوية نهاية خصومة إلا إذا تحوّل إلى دعوى مستقلة."
  }),
  "family-article49-ten-application": profile({
    id: "family-article49-ten-application", name: "طلب تركة برسم عشرة جنيهات", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "operation-not-applicable"
  }),
  "family-article49-two-application": profile({
    id: "family-article49-two-application", name: "طلب أحوال شخصية برسم جنيهين", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "operation-not-applicable"
  }),
  "family-article49-one-application": profile({
    id: "family-article49-one-application", name: "طلب أحوال شخصية برسم جنيه واحد", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "operation-not-applicable"
  }),
  "family-article49-point-two-application": profile({
    id: "family-article49-point-two-application", name: "طلب أحوال شخصية برسم مائتي مليم", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "operation-not-applicable"
  }),
  "family-inheritance-share-known": profile({
    id: "family-inheritance-share-known", name: "دعوى ثبوت وفاة ووراثة معلومة الحصة", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: [], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009"], finalSettlementPolicy: "relative-on-relief",
    reviewNote: "المادة 49/رابعًا تجعل الرسم 2% من قيمة حصة الطالب، لا من كامل التركة."
  }),
  "family-will-deposit": profile({
    id: "family-will-deposit", name: "حفظ أصل وصية بسجل المحكمة", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: ["قيمة المال الموصى به الموجود في مصر", "الرسم السابق عن تعيين منفذ الوصية أو مدير التركة"],
    supportedCourtLevels: ["primary"], sourceIds: ["law-90-1944-amended-126-2009"],
    finalSettlementPolicy: "operation-not-applicable",
    reviewNote: "الرسم نصف في المائة من قيمة المال الموصى به الموجود في مصر، ويخصم منه ما سبق دفعه عن تعيين المنفذ أو مدير التركة."
  }),
  "family-money-nonexempt": profile({
    id: "family-money-nonexempt", name: "مطالبة مالية أسرية غير داخلة في إعفاء النفقة", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: [], supportedCourtLevels: ["primary", "appeal", "cassation"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-1-2000-family-procedure"],
    finalSettlementPolicy: "relative-on-relief",
    reviewNote: "الإعفاء في المادة 3 من القانون 1 لسنة 2000 مقصور على النفقات وما في حكمها من الأجور والمصروفات؛ لا ينسحب لمجرد أن النزاع أسري."
  }),
  "family-maintenance-recovery": profile({
    id: "family-maintenance-recovery", name: "رد نفقة غير مستحقة", jurisdiction: "family",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: [], supportedCourtLevels: ["primary", "appeal", "cassation"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-1-2000-family-procedure"],
    finalSettlementPolicy: "relative-on-relief",
    reviewNote: "دعوى الاسترداد ليست دعوى نفقة للمستحق، فلا يطبق عليها الإعفاء آليًا؛ وعاؤها المبلغ المطلوب رده."
  }),
  "family-other": profile({
    id: "family-other", name: "مسألة أسرة غير النفقة", jurisdiction: "family",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["نوع مسألة الأسرة", "الطلبات", "السند الخاص للرسم أو الإعفاء"],
    sourceIds: ["law-1-2000-family-procedure"],
    reviewNote: "لا يوجد إعفاء عام لمجرد نظر الطلب أمام محكمة الأسرة."
  }),
  "state-council-annulment": profile({
    id: "state-council-annulment", name: "إلغاء أو وقف تنفيذ قرار إداري", jurisdiction: "state-council",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: [],
    supportedCourtLevels: ["partial", "primary"],
    sourceIds: ["decision-549-1959-state-council", "law-126-2009-official"],
    reviewNote: "إذا اقترن الإلغاء بطلب مالي قابل للتقدير يجب اختيار المسار المالي وفصل الطلبين؛ لا يغطي هذا الملف الطلب المركب."
  }),
  "state-council-monetary": profile({
    id: "state-council-monetary", name: "طلب مالي أمام مجلس الدولة", jurisdiction: "state-council",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: [], supportedCourtLevels: ["partial", "primary"],
    sourceIds: ["decision-549-1959-state-council", "law-126-2009-official"],
    reviewNote: "يستخدم للمطالبة المالية المنفردة؛ الطلب المركب مع إلغاء يحتاج بطاقات طلبات مستقلة."
  }),
  "state-council-supreme-appeal": profile({
    id: "state-council-supreme-appeal", name: "طعن أمام الإدارية العليا", jurisdiction: "state-council",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["cassation"],
    sourceIds: ["decision-549-1959-state-council", "law-126-2009-official"]
  }),
  "economic-money-claim": profile({
    id: "economic-money-claim", name: "منازعة اقتصادية معلومة القيمة", jurisdiction: "economic",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"], requiredFacts: [],
    supportedCourtLevels: ["primary", "appeal"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-120-2008-economic-courts"],
    reviewNote: "المحكمة الاقتصادية جهة اختصاص؛ الرسم النسبي يتبع قانون الرسوم وقاعدة تقدير الطلب المالي."
  }),
  "economic-unknown": profile({
    id: "economic-unknown", name: "منازعة اقتصادية مجهولة القيمة", jurisdiction: "economic",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: [],
    supportedCourtLevels: ["primary", "appeal"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-120-2008-economic-courts"]
  }),
  "economic-dispute": profile({
    id: "economic-dispute", name: "منازعة من اختصاص المحكمة الاقتصادية", jurisdiction: "economic",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["القانون الموضوعي المنشئ للاختصاص", "الطلب", "قابلية التقدير", "الدائرة الابتدائية أو الاستئنافية"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-120-2008-economic-courts"],
    reviewNote: "المحكمة الاقتصادية جهة اختصاص وليست سعر رسم مستقلًا."
  }),
  "ordinary-appeal-known": profile({
    id: "ordinary-appeal-known", name: "استئناف مدني أو تجاري معلوم القيمة", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: ["قيمة الجزء المطعون فيه"], supportedCourtLevels: ["appeal"],
    sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-principles"],
    reviewNote: "وعاء الاستئناف هو قيمة الجزء المطعون فيه لا كامل قيمة الدعوى تلقائيًا، وتتم التسوية النهائية على ما انتهى إليه الحكم الاستئنافي."
  }),
  "ordinary-appeal-unknown": profile({
    id: "ordinary-appeal-unknown", name: "استئناف مدني أو تجاري مجهول القيمة", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["appeal"],
    sourceIds: ["law-90-1944-amended-126-2009"],
    reviewNote: "يطبق الرسم الثابت المقرر للاستئناف مجهول القيمة؛ الطلبات المالية المستقلة لا تدمج في هذا المسار."
  }),
  "ordinary-cassation": profile({
    id: "ordinary-cassation", name: "طعن مدني أو تجاري بالنقض", jurisdiction: "ordinary-civil",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["cassation"],
    sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-principles"],
    reviewNote: "هذا المسار يقدر رسم صحيفة الطعن بالنقض فقط؛ الكفالة وطلب وقف التنفيذ وأي طلب عارض لا تضاف دون سند وقاعدة مستقلة."
  }),
  "criminal-proceeding": profile({
    id: "criminal-proceeding", name: "دعوى أو طعن جنائي", jurisdiction: "criminal",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["partial", "primary", "appeal", "cassation"],
    sourceIds: ["law-126-2009-official"],
    reviewNote: "النتيجة تغطي رسم الدعوى الجنائية الأصلي فقط؛ الادعاء المدني والتنفيذ والكفالة والغرامة مسارات مستقلة."
  }),
  "constitutional-action": profile({
    id: "constitutional-action", name: "دعوى أو منازعة دستورية", jurisdiction: "constitutional",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: [], supportedCourtLevels: ["cassation"],
    sourceIds: ["law-48-1979-constitutional-court"],
    reviewNote: "يفصل المحرك رسم الدعوى عن الكفالة؛ الكفالة أمانة ولا تُعامل كإيراد محصل."
  }),
  "constitutional-other": profile({
    id: "constitutional-other", name: "طلب دستوري غير دعوى عدم الدستورية", jurisdiction: "constitutional",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["unknown"],
    requiredFacts: ["نوع الطلب الدستوري", "النص الخاص بالإعفاء أو الرسم", "مصير الكفالة إن وجدت"],
    supportedCourtLevels: ["cassation"], sourceIds: ["law-48-1979-constitutional-court"],
    reviewNote: "الرسم الثابت والكفالة في المادة 53 لا يعممان على كل طلب من اختصاص المحكمة."
  }),
  "bankruptcy-restructuring": profile({
    id: "bankruptcy-restructuring", name: "إعادة هيكلة أو وساطة أو صلح واقٍ", jurisdiction: "bankruptcy",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["نوع الإجراء وفق قانون 11 لسنة 2018", "الأمانات", "النشر واللصق", "قيمة الديون"],
    sourceIds: ["law-11-2018-bankruptcy-restructuring"],
    reviewNote: "هذه الإجراءات لا تختزل في رسم طلب إشهار الإفلاس القديم."
  }),
  "enforcement-dispute": profile({
    id: "enforcement-dispute", name: "إشكال أو منازعة تنفيذ", jurisdiction: "enforcement",
    coverage: "conditional", valuationTemplate: "enforcement-amount", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["نوع المنازعة: وقتية أم موضوعية", "السند التنفيذي", "مبلغ التنفيذ", "هل هو تنفيذ أول أم إعادة تنفيذ"]
  }),
  "enforcement-temporary": profile({
    id: "enforcement-temporary", name: "منازعة تنفيذ وقتية", jurisdiction: "enforcement",
    coverage: "calculable", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"], requiredFacts: []
  }),
  "execution-application": profile({
    id: "execution-application", name: "تنفيذ أو إعادة تنفيذ سند", jurisdiction: "enforcement",
    coverage: "conditional", valuationTemplate: "enforcement-amount", allowedValueKinds: ["known"],
    requiredFacts: ["مبلغ التنفيذ", "هل هو التنفيذ الأول أم إعادة تنفيذ"],
    sourceIds: ["law-90-1944-execution-official"]
  }),
  "foreign-judgment": profile({
    id: "foreign-judgment", name: "أمر تنفيذ حكم أجنبي", jurisdiction: "enforcement",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["دولة الحكم", "نوع الحكم", "المبلغ المحكوم به", "طلب الصيغة التنفيذية"]
  }),
  "judgment-related": profile({
    id: "judgment-related", name: "تفسير أو تصحيح أو حجية حكم", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: ["الحكم محل الطلب", "نوع الطلب الإجرائي", "هل توجد مطالبة مالية مستقلة"]
  }),
  "procedural-status": profile({
    id: "procedural-status", name: "طلب إجرائي أو دفع مستقل", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["الإجراء المطعون عليه", "الدعوى الأصلية", "هل الطلب مستقل أم عارض", "وجود وعاء مالي"]
  }),
  "record-correction": profile({
    id: "record-correction", name: "تصحيح أو تعديل بيان", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "unknown-value", allowedValueKinds: ["unknown"],
    requiredFacts: ["السجل أو الحكم المطلوب تصحيحه", "طبيعة الخطأ", "جهة الاختصاص"]
  }),
  "nonmonetary-obligation": profile({
    id: "nonmonetary-obligation", name: "إلزام بعمل أو امتناع", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["العمل أو الامتناع المطلوب", "قابلية تقديره ماليًا", "الطلبات التابعة"]
  }),
  "declaratory-entitlement": profile({
    id: "declaratory-entitlement", name: "استحقاق أو عدم أحقية أو عدم اعتداد", jurisdiction: "ordinary-civil",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["الحق محل التقرير", "قيمته إن كان ماليًا", "السند القانوني", "الطلبات التابعة"]
  }),
  "commercial-instrument": profile({
    id: "commercial-instrument", name: "ورقة تجارية أو بروتستو", jurisdiction: "ordinary-commercial",
    coverage: "conditional", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["نوع الورقة التجارية", "قيمتها", "الإجراء المطلوب"]
  }),
  "government-party-review": profile({
    id: "government-party-review", name: "دعوى مذكور بها طرف حكومي دون تكييف", jurisdiction: "ordinary-civil",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["الجهة الحكومية", "موضوع الدعوى", "جهة القضاء المختصة", "الطلبات"],
    reviewNote: "صفة الخصم وحدها لا تحدد نوع الدعوى أو قاعدة الرسم."
  }),
  arbitration: profile({
    id: "arbitration", name: "تحكيم أو حكم تحكيم", jurisdiction: "arbitration",
    coverage: "conditional", valuationTemplate: "arbitration-award", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["نوع الطلب", "قيمة التحكيم أو الحكم", "مرحلة الإيداع أو التنفيذ أو البطلان"]
  }),
  "arbitration-award-execution": profile({
    id: "arbitration-award-execution", name: "تنفيذ حكم تحكيم معلوم القيمة", jurisdiction: "arbitration",
    coverage: "conditional", valuationTemplate: "enforcement-amount", allowedValueKinds: ["known"],
    requiredFacts: ["مبلغ الحكم المراد تنفيذه"], sourceIds: ["law-90-1944-execution-official"]
  }),
  "arbitration-exequatur-order": profile({
    id: "arbitration-exequatur-order", name: "أمر وضع الصيغة التنفيذية على حكم محكمين", jurisdiction: "arbitration",
    coverage: "calculable", valuationTemplate: "arbitration-award", allowedValueKinds: ["known"],
    requiredFacts: ["قيمة حكم المحكمين"], supportedCourtLevels: ["primary"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-27-1994-arbitration"],
    reviewNote: "هذا هو رسم الأمر القضائي المخفض إلى الربع بالمادة 6، وليس رسم مباشرة التنفيذ لأول مرة بالمادة 46 مكررًا."
  }),
  "distribution-known": profile({
    id: "distribution-known", name: "توزيع معلوم الوعاء", jurisdiction: "enforcement",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: ["المبلغ محل التوزيع أو الاعتراض"],
    sourceIds: ["law-90-1944-amended-126-2009"]
  }),
  "bankruptcy-distribution-known": profile({
    id: "bankruptcy-distribution-known", name: "توزيع أموال التفليسة معلوم الوعاء", jurisdiction: "bankruptcy",
    coverage: "calculable", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: ["المبلغ محل التوزيع"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-11-2018-bankruptcy-restructuring"]
  }),
  "tax-profit-assessment": profile({
    id: "tax-profit-assessment", name: "الطعن القضائي في تقدير الأرباح الضريبية", jurisdiction: "state-council",
    coverage: "conditional", valuationTemplate: "money-claim", allowedValueKinds: ["known"],
    requiredFacts: ["نوع الضريبة", "المسار القضائي", "كل سنة أو فترة ضريبية ووعاء الأرباح المتنازع عليه"],
    supportedCourtLevels: ["primary", "appeal", "cassation"],
    sourceIds: ["law-90-1944-amended-126-2009", "law-206-2020-unified-tax-procedures", "scc-tax-state-council-jurisdiction"],
    reviewNote: "تخفيض النصف خاص بتقدير الأرباح التي تستحق عنها الضرائب؛ لا يمتد تلقائيًا إلى القيمة المضافة أو الدمغة أو العقارية أو الجمارك."
  }),
  "tax-dispute-review": profile({
    id: "tax-dispute-review", name: "منازعة ضريبية خارج تقدير الأرباح", jurisdiction: "state-council",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["نوع الضريبة", "القرار المطعون عليه", "طبيعة الوعاء", "المرحلة الإدارية أو القضائية"],
    supportedCourtLevels: ["primary", "appeal", "cassation"],
    sourceIds: ["law-206-2020-unified-tax-procedures", "scc-tax-state-council-jurisdiction"],
    reviewNote: "لا يوجد في المادة 6 إعفاء أو تخفيض عام لكل منازعة ضريبية؛ يمنع الحساب حتى ربط النوع والطلب بقاعدة قيمة صريحة."
  }),
  "waqf-dispute": profile({
    id: "waqf-dispute", name: "وقف أو استحقاق وقف", jurisdiction: "ordinary-civil",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"], requiredFacts: ["نوع الوقف", "طبيعة الاستحقاق", "قيمة المال"],
    reviewNote: "يلزم مصدر نوعي معتمد قبل الحساب الآلي."
  }),
  "generic-legal-review": profile({
    id: "generic-legal-review", name: "تصنيف قانوني غير مكتمل", jurisdiction: "ordinary-civil",
    coverage: "blocked", valuationTemplate: "case-specific-review", allowedValueKinds: ["known", "unknown"],
    requiredFacts: ["التكييف القانوني الدقيق", "الطلبات الأصلية والتابعة", "قاعدة تقدير القيمة", "الاختصاص"],
    reviewNote: "الاسم التشغيلي لم يطابق ملفًا قانونيًا معتمدًا؛ يمنع الحساب العام حتى التصنيف."
  })
} satisfies Record<string, CaseTypeProfile>;

function normalizeArabic(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(name: string, terms: string[]): boolean {
  return terms.some((term) => name.includes(normalizeArabic(term)));
}

export function classifyCaseType(seed: CaseTypeSeed): CaseTypeProfile {
  const name = normalizeArabic(seed.name);

  if (seed.id === "tax-profit-assessment-dispute") return caseTypeProfiles["tax-profit-assessment"];
  if (seed.id.startsWith("tax-")) return caseTypeProfiles["tax-dispute-review"];
  if (seed.id === "arbitration-exequatur-order-known") return caseTypeProfiles["arbitration-exequatur-order"];
  if (["creditor-distribution", "provisional-distribution-objection"].includes(seed.id)) return caseTypeProfiles["distribution-known"];
  if (seed.id === "bankruptcy-asset-distribution") return caseTypeProfiles["bankruptcy-distribution-known"];
  if (seed.id === "article76-judgment-interpretation-correction") return caseTypeProfiles["article-76-judgment-correction"];
  if (seed.id.startsWith("article76-") && seed.id !== "article76-recusal") return caseTypeProfiles["article-76-unknown"];
  if (seed.id === "article76-recusal") return caseTypeProfiles["recusal-request"];
  if (seed.id === "civil-appeal-known") return caseTypeProfiles["ordinary-appeal-known"];
  if (seed.id === "civil-appeal-unknown") return caseTypeProfiles["ordinary-appeal-unknown"];
  if (seed.id === "civil-cassation") return caseTypeProfiles["ordinary-cassation"];
  if (seed.id.startsWith("criminal-")) return caseTypeProfiles["criminal-proceeding"];
  if (seed.id === "constitutional-action") return caseTypeProfiles["constitutional-action"];
  if (seed.id.startsWith("constitutional-")) return caseTypeProfiles["constitutional-other"];
  if (seed.id === "state-council-monetary") return caseTypeProfiles["state-council-monetary"];
  if (seed.id === "state-council-supreme-appeal") return caseTypeProfiles["state-council-supreme-appeal"];
  if (seed.id.startsWith("state-council-")) return caseTypeProfiles["state-council-annulment"];
  if (seed.id === "economic-monetary") return caseTypeProfiles["economic-money-claim"];
  if (seed.id === "economic-unknown") return caseTypeProfiles["economic-unknown"];
  if (seed.id.startsWith("economic-")) return caseTypeProfiles["economic-dispute"];
  if (seed.id === "bankruptcy-restructuring") return caseTypeProfiles["bankruptcy-restructuring"];
  if (seed.id === "bankruptcy-declaration-request") return caseTypeProfiles["bankruptcy-declaration-fixed"];
  if (seed.id === "family-maintenance") return caseTypeProfiles["family-maintenance"];
  if (seed.id === "family-divorce") return caseTypeProfiles["family-divorce-fixed"];
  if (seed.id === "family-parentage") return caseTypeProfiles["family-parentage-fixed"];
  if (["family-marriage-objection", "family-obedience-rights", "family-nonfinancial-marital-rights", "family-adoption-annulment", "family-personal-guardianship", "family-death-inheritance-lawsuit-unknown"].includes(seed.id)) return caseTypeProfiles["family-article49-five-action"];
  if (["family-adoption-record", "family-estate-seal-inventory"].includes(seed.id)) return caseTypeProfiles["family-article49-five-application"];
  if (["family-estate-manager-executor", "family-estate-liquidator"].includes(seed.id)) return caseTypeProfiles["family-article49-ten-application"];
  if (["family-marriage-notary-grievance", "family-temporary-estate-manager", "family-inventory-seal-grievance"].includes(seed.id)) return caseTypeProfiles["family-article49-two-application"];
  if (["family-consensual-divorce-petition", "family-parentage-acknowledgment-record", "family-personal-guardian-objection", "family-death-inheritance-record", "family-inheritance-acceptance-renunciation", "family-estate-receipt-liquidation-order"].includes(seed.id)) return caseTypeProfiles["family-article49-one-application"];
  if (["family-married-woman-rights-permission", "family-parentage-acknowledgment-certification", "family-estate-movables-sale-permission", "family-executor-delivery-order", "family-liquidation-incidental-order", "family-sealed-papers-delivery"].includes(seed.id)) return caseTypeProfiles["family-article49-point-two-application"];
  if (seed.id === "family-death-inheritance-lawsuit-known") return caseTypeProfiles["family-inheritance-share-known"];
  if (seed.id === "family-will-deposit") return caseTypeProfiles["family-will-deposit"];
  if (["family-mutaa", "family-deferred-dowry", "family-marital-movables"].includes(seed.id)) return caseTypeProfiles["family-money-nonexempt"];
  if (seed.id === "family-maintenance-recovery") return caseTypeProfiles["family-maintenance-recovery"];
  if (seed.id.startsWith("family-")) return caseTypeProfiles["family-other"];
  if (["execution-first", "execution-repeat"].includes(seed.id)) return caseTypeProfiles["execution-application"];
  if (seed.id === "execution-temporary") return caseTypeProfiles["enforcement-temporary"];
  if (seed.id.startsWith("execution-")) return caseTypeProfiles["enforcement-dispute"];
  if (seed.id === "arbitration-award-execution") return caseTypeProfiles["arbitration-award-execution"];
  if (seed.id === "labour-employee") return caseTypeProfiles["labour-employee-exempt"];
  if (seed.id === "labour-employer") return caseTypeProfiles["labour-employer-claim"];
  if (seed.id.startsWith("labour-")) return caseTypeProfiles["labour-dispute"];

  if (containsAny(name, ["صحة توقيع"])) return caseTypeProfiles["signature-validity"];
  if (containsAny(name, ["تزوير اصلية"])) return caseTypeProfiles["original-forgery"];
  if (containsAny(name, ["افلاس", "اعادة هيكلة"])) return caseTypeProfiles["bankruptcy-declaration"];
  if (containsAny(name, ["عمالية", "علاقة عمل", "مكتب عمل", "فصل العامل", "فصل تعسفي", "رصيد اجازات", "مكافاه نهاية الخدمة", "ضم مدة خدمة", "ايقاف عن العمل", "ضم علاوات", "بدل انتقال", "مسمي وظيفة"])) return caseTypeProfiles["labour-dispute"];
  if (containsAny(name, ["معاش", "تامينات"])) return caseTypeProfiles["pension-insurance"];
  if (containsAny(name, ["رد نفقه غير مستحقه"])) return caseTypeProfiles["family-maintenance-recovery"];
  if (containsAny(name, ["نفقه", "اجور حضانه", "اجر مسكن", "مصروفات علاج", "مصروفات تعليم"])) return caseTypeProfiles["family-maintenance"];
  if (containsAny(name, ["احوال شخصية", "تعيين قيم", "وصية"])) return caseTypeProfiles["family-other"];
  if (containsAny(name, ["الغاء قرار", "وقف تنفيذ قرار", "الطعن علي قرار", "استخراج تراخيص", "وقف اجراءات حجز"])) return caseTypeProfiles["state-council-annulment"];
  if (containsAny(name, ["تذييل حكم اجنبي", "تزييل حكم بالصيغة", "موضوعية بتزييل الحكم"])) return caseTypeProfiles["foreign-judgment"];
  if (containsAny(name, ["تحكيم"])) return caseTypeProfiles.arbitration;
  if (containsAny(name, ["اشكال", "محضر الحجز", "اجراءات الحجز", "حجز تحفظي", "حجز ما لدي الغير", "وقف تنفيذ حكم", "صيغة تنفيذية", "محضر تسليم"])) return caseTypeProfiles["enforcement-dispute"];
  if (containsAny(name, ["ايجار", "ايجارية", "اخلاء", "طرد لعدم سداد"])) return caseTypeProfiles["lease-termination"];
  if (containsAny(name, ["ندب خبير", "سماع شاهد", "اثبات حالة", "اثبات ضرر", "يمين حاسمة"])) return caseTypeProfiles["evidence-request"];
  if (containsAny(name, ["مستعجل", "وقف اعمال", "حراسة", "حارس قضائي", "غل يد"])) return caseTypeProfiles["urgent-provisional"];
  if (containsAny(name, ["تظلم", "امر اداء مرفوض", "امر تقدير رسوم", "امري تقدير رسوم"])) return caseTypeProfiles["order-grievance"];
  if (containsAny(name, ["شركة", "شركات", "شريك", "مصفى", "مدير", "تجاري", "تصدير ارباح"])) return caseTypeProfiles["company-dispute"];
  if (containsAny(name, ["حساب", "تصفية", "اثراء بلا سبب", "ريع"])) return caseTypeProfiles["accounting-liquidation"];
  if (containsAny(name, ["قسمة", "فرز وتجنيب", "تخارج"])) return caseTypeProfiles.partition;
  if (containsAny(name, ["حق ارتفاق"])) return caseTypeProfiles["article-76-unknown"];
  if (containsAny(name, ["ملكية", "بيع عقار", "حق انتفاع", "فصل حدود", "تعيين حدود", "فتح مطل", "شطب سجل عيني", "ربط اطيان"])) return caseTypeProfiles["property-right"];
  if (containsAny(name, ["حيازة", "تسليم", "غصب", "تعديات", "استرداد", "رفع حظر بيع سيارة", "اعمال بناء", "وقف الاعمال", "وقف تعامل", "تحويل عقد انتفاع"])) return caseTypeProfiles["possession-delivery"];
  if (containsAny(name, ["الاوقاف", "استحقاق وقف"])) return caseTypeProfiles["waqf-dispute"];
  if (containsAny(name, ["تفسير حكم", "تصحيح اسم في الحكم", "تصحيح خطا مادي"])) return caseTypeProfiles["article-76-judgment-correction"];
  if (containsAny(name, ["عدم اعتداد بحكم", "الغاء حكم", "عدم نفاذ الحكم", "انعدام حكم", "تذييل الحكم", "وقف تنفيذ"])) return caseTypeProfiles["judgment-related"];
  if (containsAny(name, ["بطلان اجراءات", "وقف وبطلان اجراءات", "عدم قبول الدعوي", "تعديل الطلبات", "كف منازعه", "وقف اجراءات", "ايقاف"])) return caseTypeProfiles["procedural-status"];
  if (containsAny(name, ["تعويض", "قتل خطا", "تلفيات", "اتلاف", "نزع الملكية", "اصابات", "الخطا الطبي", "اتعاب محاماه"])) return caseTypeProfiles.compensation;
  if (containsAny(name, ["صحة ونفاذ", "صحة تعاقد", "نفاذ تصرف", "بطلان عقد", "فسخ", "سريان عقد", "عدم سريان عقد", "عدم نفاذ التصرف", "عدم نفاذ عقد", "صورية عقد", "رجوع في هبه", "هبه", "انهاء علاقة تعاقدية", "اثبات علاقة عقدية", "تنفيذ التزامات", "ابطال عقد", "انهاء عقد", "الغاء عقد", "عدم نفاذ", "بطلان", "صوريه", "ثبوت واقعه بيع", "انقاص ثمن", "ضمان", "اثبات تنازل", "عدول عن اتفاق", "سريان توكيل", "بطلان توكيل", "بيوع", "شرط قسمه"])) return caseTypeProfiles["contract-value"];
  if (containsAny(name, ["الزام باداء مبلغ", "الزام بأداء مبلغ", "الزام بسداد مبلغ", "الزام برد مبلغ", "براءة الذمة", "حبس الثمن", "حبس مبلغ", "مقاصة", "تسوية مالية"])) return caseTypeProfiles["money-claim"];
  if (containsAny(name, ["تعديل بيانات", "ادراج اسم", "ادارج اسم", "تصحيح اسم", "تصحيح تسكين بيانات", "الغاء بيانات حيازه"])) return caseTypeProfiles["record-correction"];
  if (containsAny(name, ["شطب بروتستو"])) return caseTypeProfiles["commercial-instrument"];
  if (containsAny(name, ["الزام بعمل", "الزام المدعي عليه", "الزام نشط", "الزام"])) return caseTypeProfiles["nonmonetary-obligation"];
  if (containsAny(name, ["استحقاق", "عدم احقيه", "عدم اعتداد"])) return caseTypeProfiles["declaratory-entitlement"];
  if (containsAny(name, ["حكومه"])) return caseTypeProfiles["government-party-review"];

  if (seed.id === "payment-order") return caseTypeProfiles["money-claim"];
  if (seed.id === "compensation") return caseTypeProfiles.compensation;
  if (["expert", "witness"].includes(seed.id)) return caseTypeProfiles["evidence-request"];
  if (seed.id === "appeal-order") return caseTypeProfiles["order-grievance"];
  if (["contract-validity", "contract-invalidity"].includes(seed.id)) return caseTypeProfiles["contract-value"];
  if (["eviction-rent"].includes(seed.id)) return caseTypeProfiles["lease-termination"];
  if (["eviction-usurpation", "handover"].includes(seed.id)) return caseTypeProfiles["possession-delivery"];
  if (["accounting", "commercial-account"].includes(seed.id)) return caseTypeProfiles["accounting-liquidation"];

  return caseTypeProfiles["generic-legal-review"];
}
