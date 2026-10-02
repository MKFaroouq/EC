import type { CaseType, CaseTypeSeed, Court, LegalSource, RuleRegisterItem } from "./types.js";
import { generatedCaseTypes } from "./generated-case-types.js";
import { classifyCaseType } from "./case-profiles.js";

export const RULE_SET = {
  id: "civil-fees-eg-2026-02",
  version: "2026.2",
  title: "القواعد المدنية والتجارية: إصدار التنفيذ والإشهادات",
  effectiveFrom: "2021-03-04",
  publishedAt: "2026-08-06T09:00:00.000Z"
};

export const courts: Court[] = [
  { id: "cairo-north", code: "CAI-N", name: "محكمة شمال القاهرة الابتدائية", governorate: "القاهرة", level: "primary", active: true },
  { id: "cairo-new", code: "CAI-NEW", name: "محكمة القاهرة الجديدة الابتدائية", governorate: "القاهرة", level: "primary", active: true },
  { id: "giza-primary", code: "GIZ-P", name: "محكمة الجيزة الابتدائية", governorate: "الجيزة", level: "primary", active: true },
  { id: "alex-primary", code: "ALX-P", name: "محكمة الإسكندرية الابتدائية", governorate: "الإسكندرية", level: "primary", active: true },
  { id: "mansoura-primary", code: "MAN-P", name: "محكمة المنصورة الابتدائية", governorate: "الدقهلية", level: "primary", active: true },
  { id: "tanta-primary", code: "TAN-P", name: "محكمة طنطا الابتدائية", governorate: "الغربية", level: "primary", active: true },
  { id: "beni-suef-primary", code: "BSF-P", name: "محكمة بني سويف الابتدائية", governorate: "بني سويف", level: "primary", active: true },
  { id: "assiut-primary", code: "AST-P", name: "محكمة أسيوط الابتدائية", governorate: "أسيوط", level: "primary", active: true }
];

const curatedCaseTypes: CaseTypeSeed[] = [
  { id: "payment-order", name: "إلزام بأداء مبلغ", defaultValueKind: "known", classification: "relative", source: "workbook" },
  { id: "compensation", name: "تعويض عن الضرر المادي والأدبي", defaultValueKind: "known", classification: "relative", source: "workbook" },
  { id: "eviction-rent", name: "إخلاء لعدم سداد القيمة الإيجارية", defaultValueKind: "known", classification: "relative", source: "workbook" },
  { id: "eviction-usurpation", name: "إخلاء للغصب", defaultValueKind: "unknown", classification: "fixed", source: "workbook" },
  { id: "expert", name: "ندب خبير", defaultValueKind: "unknown", classification: "fixed", source: "workbook" },
  { id: "witness", name: "سماع شاهد", defaultValueKind: "unknown", classification: "fixed", source: "workbook" },
  { id: "handover", name: "تسليم", defaultValueKind: "unknown", classification: "review", source: "workbook" },
  { id: "contract-validity", name: "صحة ونفاذ تصرف", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "contract-invalidity", name: "بطلان عقد أو تصرف", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "appeal-order", name: "تظلم من قرار في أمر", defaultValueKind: "unknown", classification: "fixed", source: "workbook" },
  { id: "article76-voluntary-sale", name: "دعوى البيع الاختياري", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-sale-conditions-objection", name: "معارضة في شروط البيع متعلقة بإجراءات التنفيذ", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-cancel-security", name: "إلغاء أو شطب رهن أو اختصاص", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-bankruptcy-third-party-opposition", name: "معارضة غير المفلس في حكم إشهار الإفلاس", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-arbitration-execution-order-unknown", name: "أمر تنفيذ حكم تحكيم مجهول القيمة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-arbitration-execution-grievance", name: "تظلم من أمر تنفيذ حكم تحكيم", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-expropriation-procedure-objection", name: "معارضة في نزع الملكية متعلقة بإجراءات التنفيذ", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-final-distribution-objection", name: "معارضة في قائمة التوزيع النهائية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-customs-administrative-opposition", name: "معارضة في حكم أو أمر لجنة الجمارك أو جهة إدارية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-recusal", name: "طلب رد قاضٍ أو خبير أو محكم", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-unknown-instrument-enforcement", name: "طلب تنفيذ حكم أو عقد مجهول القيمة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-petition-order-grievance", name: "تظلم من أمر على عريضة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-consensual-division-confirmation", name: "طلب التصديق على قسمة بالتراضي", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-easement", name: "دعوى حق ارتفاق", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "article76-judgment-interpretation-correction", name: "دعوى تفسير حكم أو تصحيحه", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "accounting", name: "حساب", defaultValueKind: "unknown", classification: "review", source: "workbook" },
  { id: "commercial-account", name: "حساب تجاري", defaultValueKind: "known", classification: "review", source: "workbook" },
  { id: "civil-appeal-known", name: "استئناف مدني أو تجاري معلوم القيمة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "civil-appeal-unknown", name: "استئناف مدني أو تجاري مجهول القيمة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "civil-cassation", name: "طعن مدني أو تجاري بالنقض", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "criminal-violation", name: "دعوى جنائية: مخالفة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "criminal-misdemeanor", name: "دعوى جنائية: جنحة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "criminal-felony", name: "دعوى جنائية: جناية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "criminal-appeal", name: "استئناف جنائي", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "criminal-cassation", name: "طعن جنائي بالنقض", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "constitutional-action", name: "دعوى دستورية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "constitutional-execution", name: "منازعة تنفيذ دستورية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "state-council-annulment", name: "دعوى إلغاء قرار إداري", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "state-council-monetary", name: "دعوى مالية أمام مجلس الدولة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "state-council-supreme-appeal", name: "طعن أمام المحكمة الإدارية العليا", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-maintenance", name: "دعوى نفقة وما في حكمها", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "family-divorce", name: "دعوى تطليق أو خلع", defaultValueKind: "unknown", classification: "review", source: "curated" },
  { id: "family-parentage", name: "دعوى نسب", defaultValueKind: "unknown", classification: "review", source: "curated" },
  { id: "family-marriage-objection", name: "دعوى الاعتراض على الزواج", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-obedience-rights", name: "دعوى الطاعة أو حق زوجي غير مالي", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-nonfinancial-marital-rights", name: "دعوى حضانة أو ضم أو حفظ أو تربية صغير", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-adoption-record", name: "محضر إثبات تبني والتصديق عليه", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-adoption-annulment", name: "دعوى بطلان تبني أو الرجوع فيه", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-personal-guardianship", name: "طلب سلب الولاية على النفس أو وقفها أو استردادها", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-estate-seal-inventory", name: "طلب وضع الأختام على أموال التركة وجردها", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-estate-manager-executor", name: "طلب تعيين مدير تركة أو تثبيت منفذ وصية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-estate-liquidator", name: "طلب تعيين مصفٍ للتركة أو عزله أو استبداله", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-marriage-notary-grievance", name: "تظلم من امتناع الموثق عن توثيق الزواج أو وقف التوثيق", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-temporary-estate-manager", name: "طلب وصي أو مدير مؤقت للتركة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-inventory-seal-grievance", name: "منازعة صحة جرد التركة أو تظلم من وضع أو رفع الأختام", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-consensual-divorce-petition", name: "طلب التفريق أو التطليق بالتراضي", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-parentage-acknowledgment-record", name: "إشهاد بالإقرار بالنسب", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-personal-guardian-objection", name: "اعتراض على شخص الولي على النفس أو قرار التسليم", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-death-inheritance-record", name: "تحقيق وفاة ووراثة بإشهاد", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-inheritance-acceptance-renunciation", name: "تقرير قبول الإرث أو التنازل عنه", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-estate-receipt-liquidation-order", name: "أمر بتسلم التركة وتصفيتها", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-death-inheritance-lawsuit-known", name: "دعوى ثبوت وفاة ووراثة معلومة قيمة حصة الطالب", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "family-death-inheritance-lawsuit-unknown", name: "دعوى ثبوت وفاة ووراثة مجهولة قيمة الحصة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-married-woman-rights-permission", name: "طلب إذن للمرأة المتزوجة بمباشرة حقوقها", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-parentage-acknowledgment-certification", name: "طلب التصديق على إشهاد الإقرار بالنسب", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-estate-movables-sale-permission", name: "طلب الإذن ببيع منقولات التركة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-executor-delivery-order", name: "طلب منفذ الوصية تسليم أموال التركة", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-liquidation-incidental-order", name: "طلب عارض أثناء تصفية التركة وفق المادة 49 سادسًا", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-sealed-papers-delivery", name: "طلب تسليم أوراق أو أشياء مختومة بغير جرد", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "family-will-deposit", name: "طلب حفظ أصل وصية بسجلات المحكمة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "family-mutaa", name: "دعوى متعة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "family-deferred-dowry", name: "دعوى مؤخر صداق أو مهر", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "family-marital-movables", name: "دعوى رد منقولات زوجية أو قيمتها", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "family-maintenance-recovery", name: "دعوى رد نفقة غير مستحقة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "labour-employee", name: "دعوى عامل أو مستحق عنه", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "labour-employer", name: "دعوى مرفوعة من صاحب العمل", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "economic-monetary", name: "دعوى اقتصادية معلومة القيمة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "economic-unknown", name: "دعوى اقتصادية مجهولة القيمة", defaultValueKind: "unknown", classification: "review", source: "curated" },
  { id: "bankruptcy-restructuring", name: "طلب إعادة هيكلة", defaultValueKind: "unknown", classification: "review", source: "curated" },
  { id: "bankruptcy-declaration-request", name: "طلب إشهار الإفلاس أو الصلح الواقي", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "execution-substantive", name: "منازعة تنفيذ موضوعية", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "execution-temporary", name: "منازعة تنفيذ وقتية", defaultValueKind: "unknown", classification: "fixed", source: "curated" },
  { id: "execution-first", name: "تنفيذ سند لأول مرة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "execution-repeat", name: "إعادة تنفيذ السند", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "arbitration-award-execution", name: "تنفيذ حكم تحكيم معلوم القيمة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "arbitration-exequatur-order-known", name: "أمر تنفيذ حكم محكمين معلوم القيمة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "creditor-distribution", name: "توزيع بين الدائنين", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "bankruptcy-asset-distribution", name: "توزيع أموال التفليسة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "provisional-distribution-objection", name: "معارضة في قائمة توزيع مؤقتة", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "tax-profit-assessment-dispute", name: "منازعة قضائية في تقدير أرباح ضريبية", defaultValueKind: "known", classification: "relative", source: "curated" },
  { id: "tax-vat-dispute-review", name: "منازعة ضريبة قيمة مضافة تحتاج تكييفًا", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "tax-stamp-dispute-review", name: "منازعة ضريبة دمغة تحتاج تكييفًا", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "tax-real-estate-dispute-review", name: "منازعة ضريبة عقارية تحتاج تكييفًا", defaultValueKind: "known", classification: "review", source: "curated" },
  { id: "tax-customs-dispute-review", name: "منازعة جمركية تحتاج تكييفًا", defaultValueKind: "known", classification: "review", source: "curated" }
];

const curatedNames = new Set(curatedCaseTypes.map((item) => item.name.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar-EG")));
export const caseTypes: CaseType[] = [
  ...curatedCaseTypes,
  ...generatedCaseTypes.filter((item) => !curatedNames.has(item.name.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar-EG")))
].map((seed) => {
  const legalProfile = classifyCaseType(seed);
  const defaultValueKind = legalProfile.allowedValueKinds.includes(seed.defaultValueKind)
    ? seed.defaultValueKind
    : legalProfile.allowedValueKinds[0];
  return {
    ...seed,
    defaultValueKind,
    profileId: legalProfile.id,
    profileName: legalProfile.name,
    jurisdiction: legalProfile.jurisdiction,
    coverage: legalProfile.coverage,
    valuationTemplate: legalProfile.valuationTemplate,
    allowedValueKinds: [...legalProfile.allowedValueKinds],
    supportedCourtLevels: [...legalProfile.supportedCourtLevels],
    requiredFacts: [...legalProfile.requiredFacts],
    sourceIds: [...legalProfile.sourceIds],
    reviewNote: legalProfile.reviewNote,
    finalSettlementPolicy: legalProfile.finalSettlementPolicy
  };
});

export const legalSources: LegalSource[] = [
  {
    id: "law-90-1944-amended-126-2009",
    title: "قانون الرسوم القضائية رقم 90 لسنة 1944 المعدل بالقانون 126 لسنة 2009",
    kind: "law",
    status: "primary",
    effectiveDate: "2009-06-01",
    url: "https://www.laweg.net/framePlain.aspx?ItemID=7017&NID=5493&Type=6&action=ViewActivePages",
    notes: "مصدر النسب، حدود التحصيل عند الرفع، الرسوم مجهولة القيمة، والتسوية على المقضي به."
  },
  {
    id: "law-13-1968-civil-procedure",
    title: "قانون المرافعات المدنية والتجارية رقم 13 لسنة 1968 وتعديلاته",
    kind: "law",
    status: "primary",
    effectiveDate: "1968-11-09",
    url: "https://manshurat.org/node/32203",
    notes: "المادة 153 وإجراءات طلب الرد وكفالته؛ يلزم تطبيق النص المعدل الساري في تاريخ الطلب."
  },
  {
    id: "law-126-2009-official",
    title: "القانون رقم 126 لسنة 2009 بتعديل بعض أحكام قوانين الرسوم القضائية",
    kind: "law",
    status: "primary",
    effectiveDate: "2009-06-01",
    url: "https://manshurat.org/node/27814",
    notes: "نسخة الجريدة الرسمية المفحوصة بصريًا؛ تثبت رسوم الصور والشهادات والبحث والترجمة والأوامر والمذكرات والإعلانات والتنفيذ في المواد 30 إلى 74 المعدلة."
  },
  {
    id: "law-90-1944-execution-official",
    title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته: مواد التنفيذ",
    kind: "law",
    status: "primary",
    url: "https://register.cc.gov.eg/publications/145/download",
    notes: "نشر رسمي لمحكمة النقض يثبت ثلث الرسم عند التنفيذ، تخفيض إعادة التنفيذ، الرسم الثابت الإضافي، إعفاء ما دون 15 جنيهًا، وحد التنفيذ الأدنى."
  },
  {
    id: "law-90-1944-attestations-official",
    title: "قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته: الصيغة التنفيذية والإشهادات",
    kind: "law",
    status: "primary",
    url: "https://register.cc.gov.eg/publications/144/download",
    notes: "نشر رسمي لمحكمة النقض يثبت المواد 57 و60 و68 و72 و73 و74، ويعرض النص الحالي للمادة 55 دون جبر كسر الرسم إلى قرش."
  },
  {
    id: "law-36-1975-services",
    title: "قانون إنشاء صندوق الخدمات الصحية والاجتماعية رقم 36 لسنة 1975: المادة 1 مكرر",
    kind: "law",
    status: "primary",
    url: "https://lawhub.info/eg/?p=12470",
    notes: "رسم خاص يعادل نصف الرسوم القضائية الأصلية ويأخذ حكمها."
  },
  {
    id: "law-147-2019-lawyers",
    title: "القانون رقم 147 لسنة 2019 بتعديل قانون المحاماة: المادة 187",
    kind: "law",
    status: "primary",
    effectiveDate: "2019-08-08",
    url: "https://manshurat.org/node/61244",
    notes: "أتعاب المحاماة بحسب درجة المحكمة."
  },
  {
    id: "law-4-2021-martyrs",
    title: "القانون رقم 4 لسنة 2021 بتعديل قانون صندوق تكريم الشهداء",
    kind: "law",
    status: "primary",
    effectiveDate: "2021-03-04",
    localFile: "_تكريم الشهداء.pdf",
    url: "https://manshurat.org/node/71357",
    notes: "ضريبة 5 جنيهات على الخدمة أو المستند إذا جاوز رسم الخدمة 15 جنيهًا؛ لا تتعدد بتعدد المستندات اللازمة للخدمة."
  },
  {
    id: "law-96-1980-court-buildings",
    title: "القانون رقم 96 لسنة 1980 بفرض رسم إضافي لدور المحاكم",
    kind: "law",
    status: "primary",
    effectiveDate: "1980-06-16",
    url: "https://manshurat.org/node/34239",
    notes: "المادتان 1 و2 والجدول المرفق: يحدد الرسم بحسب نوع الصحيفة ودرجة المحكمة، مع إعفاء الدعوى التي لا يزيد المطلوب فيها على ثلاثة جنيهات."
  },
  {
    id: "circular-119-2021-martyrs",
    title: "كتاب دوري رقم 119 لسنة 2021: صندوق الشهداء والمصابين",
    kind: "circular",
    status: "supporting",
    localFile: "كتاب دورى 119 - 2021 صندوق الشهداء والمصابين.pdf",
    notes: "ضوابط التحصيل والتوريد والحسابات المخصصة."
  },
  {
    id: "law-83-2020-development",
    title: "القانون رقم 83 لسنة 2020 بتعديل رسم تنمية موارد الدولة",
    kind: "law",
    status: "primary",
    effectiveDate: "2020-06-22",
    localFile: "رسم تنمية موارد الدولة.pdf",
    url: "https://manshurat.org/node/67489",
    notes: "2 جنيه على الوعاء الخاضع لدمغة نوعية فئة 5 قروش فأكثر؛ يحتاج ربطًا مع وعاء الدمغة قبل النشر في كل خدمة."
  },
  {
    id: "law-111-1980-stamp",
    title: "قانون ضريبة الدمغة رقم 111 لسنة 1980 ولائحته التنفيذية",
    kind: "regulation",
    status: "supporting",
    localFile: "لائحة دمغة 1.pdf / لائحة دمغة 2.pdf",
    url: "https://www.manshurat.org/node/11789",
    notes: "مصدر تحديد أوعية الدمغة؛ الربط التفصيلي بالخدمات القضائية قيد المراجعة القانونية."
  },
  {
    id: "decision-549-1959-state-council",
    title: "قرار رئيس الجمهورية رقم 549 لسنة 1959 بشأن الرسوم أمام مجلس الدولة وتعديلاته",
    kind: "regulation",
    status: "primary",
    effectiveDate: "1959-04-04",
    url: "https://manshurat.org/node/60179",
    notes: "مصدر القواعد الخاصة بدعاوى الإلغاء ومجلس الدولة، مع تطبيق تعديلات القانون 126 لسنة 2009."
  },
  {
    id: "law-1-2000-family-procedure",
    title: "القانون رقم 1 لسنة 2000 بتنظيم بعض أوضاع وإجراءات التقاضي في مسائل الأحوال الشخصية",
    kind: "law",
    status: "primary",
    effectiveDate: "2000-03-01",
    url: "https://manshurat.org/node/27318",
    notes: "مصدر الإعفاء الموضوعي لدعاوى النفقات وما في حكمها؛ لا يقرر إعفاء عامًا لكل دعاوى الأسرة."
  },
  {
    id: "law-14-2025-labour",
    title: "قانون العمل رقم 14 لسنة 2025",
    kind: "law",
    status: "primary",
    effectiveDate: "2025-09-01",
    url: "https://www.alamiria.com/Sec/TashTxt?id=vPdoWGGYwoE%3D",
    notes: "المادة 7 تقرر إعفاءً مرتبطًا بصفة رافع الدعوى ونشوء الدعوى عن تطبيق القانون وتاريخ سريانه."
  },
  {
    id: "law-120-2008-economic-courts",
    title: "قانون إنشاء المحاكم الاقتصادية رقم 120 لسنة 2008 وتعديلاته",
    kind: "law",
    status: "primary",
    effectiveDate: "2008-10-01",
    url: "https://manshurat.org/node/20618",
    notes: "يحدد الاختصاص ولا ينشئ سعر رسم عام مستقلًا؛ يربط كل منازعة بالقانون الموضوعي وقاعدة تقديرها."
  },
  {
    id: "law-11-2018-bankruptcy-restructuring",
    title: "قانون تنظيم إعادة الهيكلة والصلح الواقي والإفلاس رقم 11 لسنة 2018",
    kind: "law",
    status: "primary",
    effectiveDate: "2018-03-22",
    url: "https://manshurat.org/node/25896",
    notes: "مصدر فصل إعادة الهيكلة والوساطة والصلح الواقي والإفلاس إلى إجراءات مستقلة."
  },
  {
    id: "law-48-1979-constitutional-court",
    title: "قانون المحكمة الدستورية العليا رقم 48 لسنة 1979",
    kind: "law",
    status: "primary",
    effectiveDate: "1979-09-06",
    url: "https://www.manshurat.org/node/63719",
    notes: "مصدر رسم الدعوى الدستورية والكفالة والإعفاءات ومصير الكفالة."
  },
  {
    id: "case-types-workbook",
    title: "شيت الرسوم القضائية بعد التعديل",
    kind: "workbook",
    status: "incomplete",
    localFile: "شيت_الرسوم_القضائية_بعد_التعديل.xlsx",
    notes: "مرجع تصنيف 450 صفًا، وليس محرك معادلات. يحتوي على صيغة تالفة في S29 نتيجتها #VALUE!."
  },
  {
    id: "legacy-config-screens",
    title: "شاشات محددات احتساب الرسوم بالنظام السابق",
    kind: "legacy-screen",
    status: "operational-only",
    localFile: "شاشات الرسوم/*.jpeg",
    notes: "مرجع تشغيلي للمقارنة فقط؛ لا يعتمد قانونيًا منفردًا."
  },
  {
    id: "missing-pdf-2",
    title: "2.pdf",
    kind: "law",
    status: "incomplete",
    localFile: "2.pdf",
    notes: "الملف المقدم حجمه صفر بايت ولا يمكن مراجعته."
  },
  {
    id: "cassation-fees-compilation",
    title: "النقض في الرسوم القضائية: مجموعة مبادئ وأحكام المكتب الفني",
    kind: "judgment",
    status: "supporting",
    localFile: "النقض-في-الرسوم-القضائية.pdf",
    url: "https://www.cc.gov.eg/judgments_search/",
    notes: "مرجع قضائي لتفسير وعاء الرسم، تعدد الطلبات، التسوية على المقضي به، وحالات عدم استحقاق رسوم تكميلية. تُراجع بيانات كل طعن بصريًا قبل اعتمادها."
  },
  {
    id: "cassation-multiple-claims-official",
    title: "محكمة النقض: تعدد الرسوم بتعدد الطلبات الناشئة عن أسباب قانونية مختلفة",
    kind: "judgment",
    status: "primary",
    url: "https://register.cc.gov.eg/publications/183/download",
    notes: "نشر رسمي لمحكمة النقض يقرر أن الطلبات المعلومة الناشئة عن سند واحد تجمع، أما الناشئة عن سندات مختلفة فيقدر كل سند على حدة، وفق المادة 7."
  },
  {
    id: "jslem-fees-disputes-study",
    title: "إشكاليات المنازعة في الرسوم القضائية والطعن في أحكامها: دراسة تحليلية تطبيقية",
    kind: "research",
    status: "supporting",
    localFile: "JSLEM_Volume 59_Issue 3_Pages 61-128.pdf",
    notes: "بحث أكاديمي مساند لمسارات التقدير والمعارضة والطعن؛ لا ينشئ قيمة تشغيلية منفردًا دون القانون أو حكم قضائي مباشر."
  },
  {
    id: "judicial-fees-fiqh-book",
    title: "فقه الرسوم القضائية في ضوء الفقه والقانون",
    kind: "research",
    status: "supporting",
    localFile: "فقه_الرسوم_القضائية_في_ضوء_الفقه_و_القانون.pdf",
    notes: "مرجع فقهي ممسوح ضوئيًا استُخدم لتوسيع قائمة الحالات واكتشاف التعارضات؛ جميع النتائج الرقمية تحتاج إسنادًا أعلى قبل النشر."
  },
  {
    id: "fee-law-observations-2025",
    title: "نظرات في قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته",
    kind: "research",
    status: "supporting",
    localFile: "نظرات_في_قانون_الرسوم_القضائية_عبدالرحمن_فؤاد.pdf",
    notes: "دراسة تطبيقية لعام 2025 تلخص مراحل التحصيل والرسوم الأصلية والمكملة؛ تُستخدم كدليل بحث لا كمصدر تشريعي مستقل."
  },
  {
    id: "law-93-1944-criminal-fees",
    title: "قانون الرسوم في المواد الجنائية رقم 93 لسنة 1944 وتعديلاته",
    kind: "law",
    status: "primary",
    effectiveDate: "1944-10-24",
    url: "https://register.cc.gov.eg/publications/144/download",
    notes: "الأصل التشريعي للرسوم الجنائية، مع وجوب اختيار النص المعدل الساري بحسب الوصف والمرحلة وتاريخ الواقعة."
  },
  {
    id: "law-27-1994-arbitration",
    title: "قانون التحكيم في المواد المدنية والتجارية رقم 27 لسنة 1994 وتعديلاته",
    kind: "law",
    status: "supporting",
    effectiveDate: "1994-05-22",
    url: "https://www.wipo.int/wipolex/fr/legislation/details/8334",
    notes: "مصدر تكييف إيداع الحكم وطلب أمر التنفيذ ودعوى البطلان؛ سعر الرسم ذاته يرجع إلى قانون 90."
  },
  {
    id: "law-206-2020-unified-tax-procedures",
    title: "قانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020 وتعديلاته الحالية",
    kind: "law",
    status: "primary",
    effectiveDate: "2020-10-20",
    url: "https://www.eta.gov.eg/ar/content/qwanyn-aldrybt-ly-aldkhl",
    notes: "مصدر مراحل الفحص والاعتراض ولجان الطعن والمسار السابق على القضاء. تشمل خريطة الإصدار تعديل 211/2020 و7/2025 و150/2026؛ لا تتضمن هذه التعديلات إعفاءً عامًا من الرسوم القضائية."
  },
  {
    id: "law-91-2005-income-tax",
    title: "قانون الضريبة على الدخل رقم 91 لسنة 2005 وتعديلاته",
    kind: "law",
    status: "primary",
    effectiveDate: "2005-06-10",
    url: "https://www.eta.gov.eg/ar/content/qwanyn-aldrybt-ly-aldkhl",
    notes: "يعرف ضريبة الدخل ووعاء الأرباح والقرارات محل الطعن؛ لا يحل محل المادتين 6 و75 من قانون الرسوم في تحديد التخفيض ووعاء الرسم القضائي."
  },
  {
    id: "tax-laws-other-current",
    title: "قوانين القيمة المضافة والضريبة العقارية والجمارك والدمغة",
    kind: "law",
    status: "primary",
    url: "https://www.eta.gov.eg/ar/content/qwanyn-aldrybt-ly-alqymt-almdaft",
    notes: "قوانين 67/2016 و196/2008 و207/2020 و111/1980 لتكييف نوع المنازعة؛ لا يمتد إليها تخفيض تقدير الأرباح بالمادة 6 تلقائيًا."
  },
  {
    id: "law-79-2016-tax-dispute-termination",
    title: "القانون رقم 79 لسنة 2016 في شأن إنهاء المنازعات الضريبية وتجديد العمل به بالقانون 152 لسنة 2026",
    kind: "law",
    status: "primary",
    effectiveDate: "2026-06-24",
    url: "https://eta.gov.eg/sites/default/files/2026-08/law.no_.152.of_.2026.pdf",
    notes: "مسار إنهاء اختياري أمام لجان خاصة ممتد حتى 31 ديسمبر 2026، لا يُعامل كصحيفة دعوى قضائية ولا كإعفاء عام من رسوم دعوى قائمة."
  },
  {
    id: "scc-tax-state-council-jurisdiction",
    title: "قضاء المحكمة الدستورية العليا في اختصاص مجلس الدولة بمنازعات الضرائب والرسوم",
    kind: "judgment",
    status: "primary",
    url: "https://register.cc.gov.eg/storage/publications/pdfs/TBfPKrn8FxSzxYJ9pBb9O3mfawZeK9CAqSwzplW9.pdf",
    notes: "لجان الطعن هيئات إدارية، والطعون في قراراتها النهائية منازعات إدارية يختص بها مجلس الدولة؛ يفصل ذلك المسار الإداري عن القيد القضائي."
  },
  {
    id: "law-646-1953-fee-debt-limitation",
    title: "القانون رقم 646 لسنة 1953 بشأن تقادم الضرائب والرسوم",
    kind: "law",
    status: "primary",
    effectiveDate: "1953-12-26",
    url: "https://register.cc.gov.eg/publications/145/download",
    notes: "مصدر مدة تقادم المطالبة بالرسوم القضائية وفق تطبيقات محكمة النقض؛ قاعدة للتحصيل والاعتراض وليست سعرًا للرسم."
  },
  {
    id: "decision-507-2024-state-council-collection",
    title: "قرار رئيس مجلس الدولة رقم 507 لسنة 2024 بشأن الحجز الإداري لتحصيل رسوم أحكام مجلس الدولة",
    kind: "regulation",
    status: "primary",
    effectiveDate: "2024-11-19",
    url: "https://alamiria.com/Sec/TashTxt?id=ASanAAG6i0o%3D",
    notes: "مصدر تشغيلي لمسار تحصيل رسوم أحكام مجلس الدولة؛ لا يغير معادلة تقدير الرسم القضائي."
  }
];

export const ruleRegister: RuleRegisterItem[] = [
  { code: "ORIGINAL_RELATIVE", title: "الرسم القضائي النسبي", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "2% حتى 250؛ 3% حتى 2,000؛ 4% حتى 4,000؛ 5% فيما زاد", sourceIds: ["law-90-1944-amended-126-2009"] },
  { code: "FILING_CAP", title: "حد التحصيل النسبي عند رفع الدعوى", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "الأقل من الرسم المحسوب وحد 1,000/2,000/5,000/10,000 بحسب شريحة قيمة الدعوى", sourceIds: ["law-90-1944-amended-126-2009"] },
  { code: "UNKNOWN_FIXED", title: "رسم مجهول القيمة", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "5 جزئي، 15 ابتدائي، 30 استئناف، مع أحكام خاصة للمستعجل والنقض", sourceIds: ["law-90-1944-amended-126-2009"] },
  { code: "ARTICLE_6_HALF", title: "حالات نصف الرسم بالمادة 6", state: "published", confidence: "verified", formula: "50% من الرسم الأصلي في الحالات الحصرية، ومنها القسمة والتوزيع والتظلمات المحددة ومنازعة تقدير الأرباح الضريبية", sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-compilation"] },
  { code: "ARTICLE_6_QUARTER", title: "حالات ربع الرسم بالمادة 6", state: "published", confidence: "verified", formula: "25% من الرسم الأصلي لأمر تنفيذ حكم المحكمين والمعارضة في قائمة التوزيع المؤقتة والعودة بعد الشطب بشروطها", sourceIds: ["law-90-1944-amended-126-2009"] },
  { code: "TAX_PROFIT_PERIODS", title: "منازعة تقدير الأرباح عن فترات متعددة", state: "published", confidence: "verified", formula: "يحسب الرسم النسبي لكل فترة/سنة على وعاء الأرباح المتنازع عليه مستقلة، ثم يطبق عامل النصف", sourceIds: ["law-90-1944-amended-126-2009", "cassation-multiple-claims-official", "law-91-2005-income-tax"], reviewNote: "في التسوية النهائية يلزم منطوق مستقل لكل فترة أو بطاقة طلب مفصلة؛ لا يستخدم إجمالي الضريبة أو مقابل التأخير كوعاء أرباح." },
  { code: "TAX_NON_JUDICIAL_ROUTE", title: "لجان الطعن وإنهاء المنازعات الضريبية", state: "published", confidence: "verified", effectiveFrom: "2026-06-24", formula: "لا ينشأ رسم قيد دعوى قضائية عن الطلب الإداري بذاته؛ عند وجود دعوى قائمة تُعامل مرحلتها وآثار إنهائها منفصلة", sourceIds: ["law-206-2020-unified-tax-procedures", "law-79-2016-tax-dispute-termination", "scc-tax-state-council-jurisdiction"] },
  { code: "FEE_DEBT_LIMITATION", title: "تقادم المطالبة بالرسوم القضائية", state: "published", confidence: "verified", formula: "خمس سنوات وفق تاريخ بدء السريان وأسباب الوقف والانقطاع؛ تعرض كتنبيه تحصيل ولا تخصم آليًا دون فحص الملف", sourceIds: ["law-646-1953-fee-debt-limitation", "cassation-fees-compilation"] },
  { code: "STATE_COUNCIL_FEE_COLLECTION", title: "تحصيل رسوم أحكام مجلس الدولة", state: "published", confidence: "verified", effectiveFrom: "2024-11-19", formula: "مسار تحصيل تنفيذي مستقل بعد التقدير وفق قرار 507 لسنة 2024؛ لا يضاف كبند مالي", sourceIds: ["decision-507-2024-state-council-collection"] },
  { code: "SERVICES_FUND", title: "رسم صندوق الخدمات", state: "published", confidence: "verified", formula: "50% من الرسم القضائي الأصلي المستحق", sourceIds: ["law-36-1975-services"] },
  { code: "LAWYER_FEE", title: "أتعاب المحاماة", state: "published", confidence: "verified", effectiveFrom: "2019-08-08", formula: "50 جزئي، 75 ابتدائي/مستعجل، 100 استئناف، 200 نقض", sourceIds: ["law-147-2019-lawyers"] },
  { code: "MARTYRS_STAMP", title: "طابع صندوق الشهداء", state: "blocked", confidence: "candidate", formula: "5 جنيهات مرة واحدة للخدمة الخاضعة إذا جاوز رسمها 15 جنيهًا", sourceIds: ["law-4-2021-martyrs", "circular-119-2021-martyrs"], reviewNote: "لا يعمم على قيد كل دعوى قبل اعتماد خريطة إجراءات تثبت وصف الخدمة الخاضعة." },
  { code: "MULTIPLE_CLAIMS_SAME_BASIS", title: "طلبات متعددة ناشئة عن سند واحد", state: "published", confidence: "verified", formula: "يقدر الرسم باعتبار مجموع الطلبات المعلومة القيمة", sourceIds: ["law-90-1944-amended-126-2009", "cassation-multiple-claims-official"] },
  { code: "MULTIPLE_CLAIMS_DIFFERENT_BASES", title: "طلبات متعددة ناشئة عن سندات مختلفة", state: "blocked", confidence: "verified", formula: "يقدر الرسم باعتبار كل سند على حدة", sourceIds: ["law-90-1944-amended-126-2009", "cassation-multiple-claims-official"], reviewNote: "القاعدة ثابتة، لكن التفعيل ينتظر نموذج إدخال منفصل لكل طلب وسنده والخصوم الموجه إليهم." },
  { code: "FINAL_ZERO_AWARD", title: "عدم استحقاق رسوم تكميلية عند عدم القضاء بشيء", state: "published", confidence: "verified", formula: "إذا كان المقضي به صفراً فلا ينشأ رسم نسبي تكميلي أو ملحقاته في مرحلة التسوية", sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-compilation"] },
  { code: "UNKNOWN_VALUE_FINAL", title: "التسوية النهائية لدعوى بدأت مجهولة القيمة", state: "blocked", confidence: "candidate", formula: "تتوقف حتى تحديد أثر منطوق الحكم ونوع الطلب على وعاء التسوية", sourceIds: ["law-90-1944-amended-126-2009", "cassation-fees-compilation"], reviewNote: "لا يجوز تكرار الرسم الثابت تلقائيًا في نهاية الدعوى." },
  { code: "DEVELOPMENT_DUTY", title: "رسم تنمية موارد الدولة", state: "draft", confidence: "candidate", effectiveFrom: "2020-06-22", formula: "2 جنيه لكل وعاء دمغة نوعية مؤهل", sourceIds: ["law-83-2020-development", "law-111-1980-stamp"], reviewNote: "لا ينشر قبل اعتماد خريطة أوعية الدمغة لكل خدمة قضائية." },
  { code: "BAR_TAX_VAT", title: "ضريبة المهن/القيمة المضافة الظاهرة بالنظام السابق", state: "blocked", confidence: "operational", formula: "قيم ثابتة تشغيلية تختلف بحسب الدرجة", sourceIds: ["legacy-config-screens"], reviewNote: "موقوفة لعدم اكتمال السند القانوني المباشر ضمن المصادر الحالية." },
  { code: "ADDITIONAL_BUILDINGS", title: "الرسم الإضافي لصندوق أبنية دور المحاكم", state: "published", confidence: "verified", effectiveFrom: "1980-06-16", formula: "جزئي: صفر حتى 3 جنيهات، 0.50 حتى 100، ثم 1.50؛ ابتدائي 1.50؛ استئناف عال 3؛ نقض 6 عند قيد الصحيفة", sourceIds: ["law-96-1980-court-buildings", "judicial-fees-fiqh-book", "fee-law-observations-2025"] }
  ,{ code: "REGISTRY_COPY_CERTIFICATE", title: "صور السجلات والشهادات", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "0.50 جنيه لكل صفحة × عدد النسخ، بحد أقصى 100 جنيه عن الدعوى الواحدة", sourceIds: ["law-126-2009-official"] }
  ,{ code: "JUDICIAL_PAPER_COPY", title: "صور الأوراق القضائية", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "لكل صفحة: 0.25 جزئي، 0.75 ابتدائي، 1.50 استئناف أو نقض؛ مضروبًا في عدد النسخ", sourceIds: ["law-126-2009-official"] }
  ,{ code: "SEARCH_FEES", title: "رسوم الكشف والبحث", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "0.15 جنيه لكل اسم في كل سنة؛ والكشف النظري 0.50 جنيه لكل مادة", sourceIds: ["law-126-2009-official"] }
  ,{ code: "TRANSLATION_FEE", title: "رسم ترجمة الأوراق", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "0.50 جنيه لكل صفحة من الأصل، بالإضافة إلى رسم الصورة المقرر بالمادة 30", sourceIds: ["law-126-2009-official"] }
  ,{ code: "ORDER_FEE", title: "رسم الأوامر القضائية", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "0.25 جزئي، 0.75 ابتدائي، 1.50 استئناف أو نقض لكل أمر خاضع للمادة 34", sourceIds: ["law-126-2009-official"] }
  ,{ code: "CASSATION_MEMORANDUM", title: "مذكرات محكمة النقض", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "0.50 جنيه عن كل صفحة من أصل المذكرة المقدمة لقلم كتاب محكمة النقض", sourceIds: ["law-126-2009-official"] }
  ,{ code: "ANNOUNCEMENT_FEE", title: "الإعلانات القضائية الخاضعة للمادة 42", state: "published", confidence: "verified", effectiveFrom: "2009-06-01", formula: "لكل صفحة من الأصل: 0.25 جزئي، 0.75 ابتدائي، 1.50 استئناف أو نقض", sourceIds: ["law-126-2009-official"] }
  ,{ code: "COURT_BUILDINGS_SERVICES", title: "الرسم الإضافي لخدمات الصور والشهادات والإعلانات", state: "published", confidence: "verified", effectiveFrom: "1980-06-16", formula: "0.60 للشهادة، 0.80 للصورة أو الورقة القضائية، 1.00 للإعلان أو العرض", sourceIds: ["law-96-1980-court-buildings"] }
  ,{ code: "EXECUTION_PRINCIPAL", title: "رسم التنفيذ وإعادة التنفيذ", state: "published", confidence: "operational", formula: "ثلث الرسم النسبي أو الثابت عند التنفيذ لأول مرة، وتسع الرسم الأصلي عند إعادة التنفيذ على النوع الواحد، بحد أدنى 0.50 جنيه؛ تقرب النتيجة مرة واحدة إلى أقرب مليم", sourceIds: ["law-90-1944-execution-official", "law-90-1944-attestations-official"], reviewNote: "أصل الثلث والتخفيض والحد الأدنى موثق؛ التقريب إلى أقرب مليم سياسة تمثيل نقدي تشغيلية بعد حذف جبر كسر القرش من النص الحالي للمادة 55، وتحتاج مطابقة على عينة أوامر تقدير فعلية قبل التحصيل." }
  ,{ code: "EXECUTION_FIXED_SURCHARGE", title: "الرسم الثابت الإضافي على التنفيذ", state: "published", confidence: "verified", formula: "1 جنيه للجزئي و2.50 جنيه لباقي السندات المحددة؛ عند إعادة التنفيذ يخفض إلى الثلث بحد أدنى 0.50؛ يعفى إذا كان مبلغ التنفيذ أقل من 15 جنيهًا", sourceIds: ["law-90-1944-execution-official"] }
  ,{ code: "EXECUTIVE_FORMULA_OTHER_AUTHORITY", title: "الصيغة التنفيذية من جهة غير الجهة المصدرة", state: "published", confidence: "verified", formula: "1 جنيه لكل حكم أو إشهاد، بشرط اختلاف الجهة المطلوبة عن الجهة المصدرة", sourceIds: ["law-90-1944-attestations-official"] }
  ,{ code: "ATTESTATION_FEES", title: "رسوم الإشهاد والتوكيل والتصديق", state: "published", confidence: "verified", formula: "الإشهاد 5 + 1 لكل ورقة زائدة؛ التوكيل أو العزل 2 + 0.50 لكل ورقة زائدة مع مسار النصف؛ التصديق 1 لكل إمضاء أو ختم", sourceIds: ["law-90-1944-attestations-official"] }
  ,{ code: "FOREIGN_AND_EXTERNAL_AUTHENTICATION", title: "اعتماد الخارج والانتقال للإشهاد أو التصديق", state: "published", confidence: "verified", formula: "اعتماد الخارج 1 لكل تأشيرة؛ الانتقال 5 للإشهاد أو 1.50 للتصديق لكل وحدة استحقاق، بالإضافة إلى مصروفات مثبتة بمرجع", sourceIds: ["law-90-1944-attestations-official"] }
];
