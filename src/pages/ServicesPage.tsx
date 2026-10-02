import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  Files,
  Landmark,
  LockKeyhole,
  RotateCcw
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Catalog } from "../api";
import { useAuth } from "../auth";
import { FeeResultCard } from "../components/FeeResultCard";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { buildCourtServiceInput, type CourtServiceFormState, type CourtServiceKind } from "../domain/service-form";
import type { CourtServiceCalculationResult } from "../domain/service-fees";
import type { CourtLevel } from "../domain/types";

const levelNames: Record<CourtLevel, string> = { partial: "جزئي", primary: "ابتدائي", appeal: "استئناف", cassation: "نقض" };

const serviceGroups: Array<{ label: string; items: Array<{ value: CourtServiceKind; label: string }> }> = [
  {
    label: "الصور والشهادات",
    items: [
      { value: "registry-copy", label: "صورة مستخرجة من سجل" },
      { value: "certificate", label: "شهادة أو ملخص من سجل" },
      { value: "judicial-paper-copy", label: "صورة من أوراق قضائية" },
      { value: "translation", label: "ترجمة أوراق" }
    ]
  },
  {
    label: "البحث والكشف",
    items: [
      { value: "named-search", label: "كشف بالاسم" },
      { value: "theoretical-search", label: "كشف نظري في مادة" }
    ]
  },
  {
    label: "الأوامر والمذكرات والإعلانات",
    items: [
      { value: "order", label: "أمر قضائي خاضع للمادة 34" },
      { value: "cassation-memorandum", label: "مذكرة مقدمة لقلم كتاب محكمة النقض" },
      { value: "announcement", label: "إعلان قضائي خاضع للمادة 42" }
    ]
  },
  {
    label: "التنفيذ والصيغة التنفيذية",
    items: [
      { value: "execution", label: "تنفيذ حكم أو سند تنفيذي" },
      { value: "executive-formula-other-authority", label: "صيغة تنفيذية من جهة أخرى" }
    ]
  },
  {
    label: "الإشهاد والتصديقات",
    items: [
      { value: "attestation", label: "إشهاد" },
      { value: "power-of-attorney-attestation", label: "إشهاد بتوكيل أو عزل" },
      { value: "signature-or-seal-certification", label: "تصديق على إمضاء أو ختم" },
      { value: "foreign-use-authentication", label: "اعتماد ختم للاستعمال خارج القطر" },
      { value: "external-authentication", label: "انتقال خارج المحكمة للإشهاد أو التصديق" }
    ]
  }
];

const serviceMeta: Record<CourtServiceKind, { formula: string; source: string }> = {
  "registry-copy": { formula: "الأقل من 0.50 جنيه × الصفحات × النسخ، والمتبقي من حد 100 جنيه للدعوى", source: "المادة 30 من قانون الرسوم القضائية المعدلة بالقانون 126 لسنة 2009" },
  certificate: { formula: "الأقل من الرسم المحسوب والمتبقي من حد 100 جنيه للدعوى، ويضاف 0.60 جنيه للرسم الإضافي", source: "المادة 30 والقانون 96 لسنة 1980" },
  "judicial-paper-copy": { formula: "السعر حسب الدرجة × الصفحات × النسخ، ويضاف 0.80 جنيه للرسم الإضافي", source: "المادة 30 والقانون 96 لسنة 1980" },
  "named-search": { formula: "0.15 جنيه × عدد الأسماء × عدد السنوات", source: "المادة 31 المعدلة بالقانون 126 لسنة 2009" },
  "theoretical-search": { formula: "0.50 جنيه × عدد مواد البحث", source: "المادة 31 المعدلة بالقانون 126 لسنة 2009" },
  translation: { formula: "0.50 جنيه × الصفحات + رسم الصورة المقرر بالمادة 30", source: "المادتان 30 و32 المعدلتان بالقانون 126 لسنة 2009" },
  order: { formula: "0.25 جزئي، 0.75 ابتدائي، 1.50 استئناف أو نقض لكل أمر", source: "المادة 34 المعدلة بالقانون 126 لسنة 2009" },
  "cassation-memorandum": { formula: "0.50 جنيه × صفحات أصل المذكرة", source: "المادة 35 المعدلة بالقانون 126 لسنة 2009" },
  announcement: { formula: "السعر حسب الدرجة × صفحات أصل الإعلان، ويضاف 1 جنيه للرسم الإضافي", source: "المادة 42 والقانون 96 لسنة 1980" },
  execution: { formula: "ثلث الرسم النسبي أو الثابت، والتسع عند إعادة التنفيذ على النوع الواحد، بحد أدنى 0.50 جنيه، مع الرسم الثابت للمادة 46 مكررًا", source: "المواد 43 و46 مكررًا و54 و55 من قانون الرسوم القضائية" },
  "executive-formula-other-authority": { formula: "1 جنيه لكل حكم أو إشهاد يطلب وضع الصيغة التنفيذية عليه من جهة غير التي أصدرته", source: "المادة 57 من قانون الرسوم القضائية" },
  attestation: { formula: "5 جنيهات للورقة الأولى، ويضاف جنيه لكل ورقة زائدة", source: "المادة 68 من قانون الرسوم القضائية" },
  "power-of-attorney-attestation": { formula: "2 جنيه للورقة الأولى، و0.50 لكل ورقة زائدة، ويخفض المجموع للنصف في الحالة المبينة بالمادة", source: "المادة 72 من قانون الرسوم القضائية" },
  "signature-or-seal-certification": { formula: "1 جنيه عن كل إمضاء أو ختم", source: "المادة 73 من قانون الرسوم القضائية" },
  "foreign-use-authentication": { formula: "1 جنيه عن كل تأشيرة اعتماد لختم المحكمة على ورقة رسمية معدة للاستعمال خارج القطر", source: "المادة 60 من قانون الرسوم القضائية" },
  "external-authentication": { formula: "5 جنيهات للإشهاد أو 1.50 جنيه للتصديق لكل وحدة استحقاق، بالإضافة إلى مصاريف الانتقال المثبتة", source: "المادة 74 من قانون الرسوم القضائية" }
};

const initialForm: CourtServiceFormState = {
  kind: "certificate",
  courtLevel: "primary",
  pageCount: "1",
  copyCount: "1",
  nameCount: "1",
  yearCount: "1",
  matterCount: "1",
  documentCount: "1",
  sourceKind: "registry",
  caseReference: "",
  priorRegistryFeePounds: "0",
  executionRequestKind: "initial",
  executionInstrumentKind: "primary-appeal-judgment-or-payment-order",
  executableFormulaConfirmed: false,
  executionFeeBasis: "relative",
  executionAmountPounds: "",
  underlyingFixedFeePounds: "",
  underlyingAssessmentReference: "",
  sameTypePriorExecutionReference: "",
  issuerAuthority: "",
  requestedAuthority: "",
  caseFileHalfRate: false,
  markCount: "1",
  authenticationCount: "1",
  authenticationKind: "attestation",
  chargeableUnitCount: "1",
  travelExpensePounds: "0",
  travelExpenseReference: ""
};

export function ServicesPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [courtId, setCourtId] = useState("");
  const [form, setForm] = useState<CourtServiceFormState>(initialForm);
  const [result, setResult] = useState<(CourtServiceCalculationResult & { estimateId: string; courtId: string }) | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const resultRef = useRef<HTMLElement>(null);

  const loadCatalog = () => {
    setCatalogError("");
    api.catalog().then((value) => {
      setCatalog(value);
      setCourtId((current) => current || user?.courtId || value.courts[0]?.id || "");
    }).catch((reason) => setCatalogError(reason instanceof Error ? reason.message : "تعذر تحميل دليل المحاكم والقواعد"));
  };

  useEffect(loadCatalog, [user?.courtId]);
  useEffect(() => {
    if (!result || !window.matchMedia("(max-width: 1120px)").matches) return;
    window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    });
  }, [result]);

  const canCalculate = user?.role === "estimator" || user?.role === "supervisor";
  const meta = serviceMeta[form.kind];
  const needsCourtLevel = ["judicial-paper-copy", "order", "announcement"].includes(form.kind)
    || (form.kind === "translation" && form.sourceKind === "judicial-paper");
  const needsPages = ["registry-copy", "certificate", "judicial-paper-copy", "translation", "cassation-memorandum", "announcement", "attestation", "power-of-attorney-attestation"].includes(form.kind);
  const needsCopies = ["registry-copy", "certificate", "judicial-paper-copy", "translation"].includes(form.kind);
  const needsRegistryCaseContext = ["registry-copy", "certificate"].includes(form.kind)
    || (form.kind === "translation" && form.sourceKind === "registry");
  const selectedServiceLabel = useMemo(
    () => serviceGroups.flatMap((group) => group.items).find((item) => item.value === form.kind)?.label ?? "الخدمة القضائية",
    [form.kind]
  );

  const updateForm = <K extends keyof CourtServiceFormState>(key: K, value: CourtServiceFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
    setSubmitError("");
  };

  const calculate = async () => {
    if (!canCalculate) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const service = buildCourtServiceInput(form);
      setResult(await api.calculateService(courtId, service));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "تعذر حساب الخدمة";
      const formMessages: Record<string, string> = {
        INVALID_UNIT_COUNT: "أدخل عددًا صحيحًا أكبر من صفر في كل خانة مطلوبة.",
        CASE_REFERENCE_REQUIRED: "أدخل رقم الدعوى وسنتها ونوعها لربط الحد الأقصى بالدعوى الصحيحة.",
        INVALID_PRIOR_REGISTRY_FEE: "أدخل ما سبق احتسابه بين صفر و100 جنيه، بدقة لا تتجاوز ثلاثة أرقام عشرية.",
        INVALID_MONEY: "أدخل قيمة مالية صحيحة أكبر من صفر، بدقة لا تتجاوز ثلاثة أرقام عشرية.",
        EXECUTABLE_FORMULA_REQUIRED: "أكد أن الحكم أو السند مشمول بالصيغة التنفيذية قبل الحساب.",
        SAME_TYPE_PRIOR_EXECUTION_REFERENCE_REQUIRED: "أدخل مرجع التنفيذ السابق لإثبات أن الطلب إعادة تنفيذ على النوع الواحد.",
        UNDERLYING_ASSESSMENT_REFERENCE_REQUIRED: "أدخل مرجع أمر التقدير أو السند الذي يثبت الرسم الثابت الأصلي.",
        ISSUER_AUTHORITY_REQUIRED: "أدخل الجهة التي أصدرت الحكم أو الإشهاد.",
        REQUESTED_AUTHORITY_REQUIRED: "أدخل الجهة المطلوب منها وضع الصيغة التنفيذية.",
        DIFFERENT_AUTHORITY_REQUIRED: "المادة 57 تطبق فقط إذا كانت الجهة المطلوبة مختلفة عن الجهة المصدرة.",
        TRAVEL_EXPENSE_REFERENCE_REQUIRED: "أدخل رقم مأمورية الانتقال أو مستند المصروفات عند إضافة مصاريف انتقال."
      };
      setSubmitError(formMessages[message] ?? message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm(initialForm);
    setResult(null);
    setSubmitError("");
  };

  if (catalogError) return <ErrorState message={catalogError} retry={loadCatalog} />;
  if (!catalog) return <LoadingState label="جارٍ تحميل دليل خدمات المحاكم…" />;

  return <div className="stack-xl">
    <div className="page-intro calculator-intro">
      <div><h2>الخدمات</h2></div>
      <div className="rule-version"><CheckCircle2 /><span><small>إصدار القواعد</small><strong>{catalog.ruleSet.version}</strong></span></div>
    </div>

    {!canCalculate && <div className="permission-note"><LockKeyhole /><span><strong>وضع القراءة فقط</strong> دورك يسمح بالمراجعة ولا يسمح بإنشاء تقدير خدمة.</span></div>}

    <div className="calculator-layout">
      <section className="form-panel service-form-panel">
        <div className="form-section-heading"><span>١</span><div><h3>الخدمة</h3></div></div>
        <div className="field-grid">
          <label className="field span-2"><span>المحكمة</span><div className="select-wrap"><Landmark /><select value={courtId} onChange={(event) => { setCourtId(event.target.value); setResult(null); }}>{catalog.courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}</select></div></label>
          <label className="field span-2"><span>نوع الخدمة القضائية</span><select value={form.kind} onChange={(event) => updateForm("kind", event.target.value as CourtServiceKind)}>{serviceGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</select></label>
          {form.kind === "translation" && <div className="field span-2"><span id="translation-source-label">مصدر الورقة المطلوب ترجمتها</span><div className="segmented" role="group" aria-labelledby="translation-source-label"><button type="button" className={form.sourceKind === "registry" ? "active" : ""} aria-pressed={form.sourceKind === "registry"} onClick={() => updateForm("sourceKind", "registry")}>سجل أو شهادة</button><button type="button" className={form.sourceKind === "judicial-paper" ? "active" : ""} aria-pressed={form.sourceKind === "judicial-paper"} onClick={() => updateForm("sourceKind", "judicial-paper")}>ورقة قضائية</button></div></div>}
          {form.kind === "execution" && <>
            <div className="field span-2"><span id="execution-request-label">نوع طلب التنفيذ</span><div className="segmented" role="group" aria-labelledby="execution-request-label"><button type="button" className={form.executionRequestKind === "initial" ? "active" : ""} aria-pressed={form.executionRequestKind === "initial"} onClick={() => updateForm("executionRequestKind", "initial")}>تنفيذ لأول مرة</button><button type="button" className={form.executionRequestKind === "repeat" ? "active" : ""} aria-pressed={form.executionRequestKind === "repeat"} onClick={() => updateForm("executionRequestKind", "repeat")}>إعادة تنفيذ</button></div></div>
            <label className="field span-2"><span>نوع الحكم أو السند التنفيذي</span><select value={form.executionInstrumentKind} onChange={(event) => updateForm("executionInstrumentKind", event.target.value as CourtServiceFormState["executionInstrumentKind"])}><option value="partial-judgment-or-payment-order">حكم أو أمر أداء جزئي، أو تنفيذ أمام محكمة جزئية</option><option value="primary-appeal-judgment-or-payment-order">حكم أو أمر أداء ابتدائي أو استئناف، أو تنفيذ أمامهما</option><option value="cassation-judgment">حكم محكمة النقض</option><option value="official-contract-or-attestation">عقد رسمي أو إشهاد</option><option value="arbitral-award">حكم محكمين</option><option value="enforceable-administrative-order">أمر إداري واجب التنفيذ</option></select></label>
            <div className="field span-2"><span id="execution-basis-label">أساس الرسم الأصلي للسند</span><div className="segmented" role="group" aria-labelledby="execution-basis-label"><button type="button" className={form.executionFeeBasis === "relative" ? "active" : ""} aria-pressed={form.executionFeeBasis === "relative"} onClick={() => updateForm("executionFeeBasis", "relative")}>رسم نسبي</button><button type="button" className={form.executionFeeBasis === "fixed" ? "active" : ""} aria-pressed={form.executionFeeBasis === "fixed"} onClick={() => updateForm("executionFeeBasis", "fixed")}>رسم ثابت سابق التقدير</button></div></div>
          </>}
          {form.kind === "external-authentication" && <div className="field span-2"><span id="external-authentication-label">نوع العمل خارج المحكمة</span><div className="segmented" role="group" aria-labelledby="external-authentication-label"><button type="button" className={form.authenticationKind === "attestation" ? "active" : ""} aria-pressed={form.authenticationKind === "attestation"} onClick={() => updateForm("authenticationKind", "attestation")}>إشهاد</button><button type="button" className={form.authenticationKind === "certification" ? "active" : ""} aria-pressed={form.authenticationKind === "certification"} onClick={() => updateForm("authenticationKind", "certification")}>تصديق</button></div></div>}
          {needsCourtLevel && <label className="field span-2"><span>درجة المحكمة</span><select value={form.courtLevel} onChange={(event) => updateForm("courtLevel", event.target.value as CourtLevel)}>{Object.entries(levelNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          <div className="service-formula span-2"><BookOpen /><div><strong>قاعدة الحساب المنشورة</strong><p>{meta.formula}</p><small>{meta.source}</small></div></div>
        </div>

        <div className="form-divider" />
        <div className="form-section-heading"><span>٢</span><div><h3>البيانات</h3></div></div>
        <div className="field-grid">
          {needsRegistryCaseContext && <>
            <div className="case-cap-note span-2"><LockKeyhole /><div><strong>حد المادة 30 يخص الدعوى كاملة</strong><p>يربط النظام العملية برقم الدعوى ويخصم ما سبق احتسابه قبل تطبيق سقف 100 جنيه.</p></div></div>
            <label className="field span-2"><span>رقم الدعوى وسنتها ونوعها</span><input type="text" maxLength={120} placeholder="مثال: 125 لسنة 2026 مدني كلي شمال القاهرة" value={form.caseReference} onChange={(event) => updateForm("caseReference", event.target.value)} /></label>
            <label className="field span-2"><span>ما سبق احتسابه عن صور السجل والشهادات في هذه الدعوى</span><div className="money-input"><input type="number" inputMode="decimal" min="0" max="100" step="0.001" value={form.priorRegistryFeePounds} onChange={(event) => updateForm("priorRegistryFeePounds", event.target.value)} /><b>جنيه</b></div><small>راجع ملف الدعوى؛ أدخل صفرًا إذا لم يسبق احتساب أي مبلغ من هذا الوعاء.</small></label>
          </>}
          {needsPages && <label className="field"><span>{form.kind === "announcement" ? "صفحات أصل الإعلان" : form.kind === "cassation-memorandum" ? "صفحات أصل المذكرة" : form.kind === "attestation" || form.kind === "power-of-attorney-attestation" ? "عدد أوراق الإشهاد" : "عدد الصفحات"}</span><input type="number" inputMode="numeric" min="1" step="1" value={form.pageCount} onChange={(event) => updateForm("pageCount", event.target.value)} /></label>}
          {needsCopies && <label className="field"><span>عدد النسخ المطلوبة</span><input type="number" inputMode="numeric" min="1" step="1" value={form.copyCount} onChange={(event) => updateForm("copyCount", event.target.value)} /></label>}
          {form.kind === "named-search" && <><label className="field"><span>عدد الأسماء</span><input type="number" inputMode="numeric" min="1" step="1" value={form.nameCount} onChange={(event) => updateForm("nameCount", event.target.value)} /></label><label className="field"><span>عدد السنوات المطلوب البحث فيها</span><input type="number" inputMode="numeric" min="1" step="1" value={form.yearCount} onChange={(event) => updateForm("yearCount", event.target.value)} /></label></>}
          {form.kind === "theoretical-search" && <label className="field span-2"><span>عدد مواد البحث</span><input type="number" inputMode="numeric" min="1" step="1" value={form.matterCount} onChange={(event) => updateForm("matterCount", event.target.value)} /></label>}
          {form.kind === "order" && <label className="field span-2"><span>عدد الأوامر</span><input type="number" inputMode="numeric" min="1" step="1" value={form.documentCount} onChange={(event) => updateForm("documentCount", event.target.value)} /></label>}
          {form.kind === "execution" && <>
            <div className="case-cap-note span-2"><LockKeyhole /><div><strong>شروط قانونية تمنع الحساب غير الصحيح</strong><p>لا يحسب النظام التنفيذ دون صيغة تنفيذية، ولا يمنح تخفيض إعادة التنفيذ دون مرجع سابق من النوع نفسه.</p></div></div>
            <label className="check-field span-2"><input type="checkbox" checked={form.executableFormulaConfirmed} onChange={(event) => updateForm("executableFormulaConfirmed", event.target.checked)} /><span><strong>الحكم أو السند مشمول بالصيغة التنفيذية</strong><small>شرط صريح لاستحقاق رسم التنفيذ بالمادة 43</small></span></label>
            <label className="field span-2"><span>المبلغ المطلوب التنفيذ من أجله</span><div className="money-input"><input type="number" inputMode="decimal" min="0.001" step="0.001" value={form.executionAmountPounds} onChange={(event) => updateForm("executionAmountPounds", event.target.value)} /><b>جنيه</b></div><small>يستخدم لحساب الرسم النسبي، وكذلك لاختبار الإعفاء من الرسم الثابت إذا كان أقل من 15 جنيهًا.</small></label>
            {form.executionFeeBasis === "fixed" && <>
              <label className="field"><span>الرسم الثابت الأصلي المقدّر</span><div className="money-input"><input type="number" inputMode="decimal" min="0.001" step="0.001" value={form.underlyingFixedFeePounds} onChange={(event) => updateForm("underlyingFixedFeePounds", event.target.value)} /><b>جنيه</b></div></label>
              <label className="field"><span>مرجع التقدير السابق</span><input type="text" maxLength={200} placeholder="مثال: أمر تقدير 18 لسنة 2026" value={form.underlyingAssessmentReference} onChange={(event) => updateForm("underlyingAssessmentReference", event.target.value)} /></label>
            </>}
            {form.executionRequestKind === "repeat" && <label className="field span-2"><span>مرجع التنفيذ السابق على النوع نفسه</span><input type="text" maxLength={200} placeholder="رقم المحضر أو ملف التنفيذ وتاريخه" value={form.sameTypePriorExecutionReference} onChange={(event) => updateForm("sameTypePriorExecutionReference", event.target.value)} /><small>لا يكفي وجود تنفيذ سابق مختلف النوع للحصول على التخفيض.</small></label>}
          </>}
          {form.kind === "executive-formula-other-authority" && <>
            <label className="field"><span>الجهة التي أصدرت الحكم أو الإشهاد</span><input type="text" maxLength={200} value={form.issuerAuthority} onChange={(event) => updateForm("issuerAuthority", event.target.value)} /></label>
            <label className="field"><span>الجهة المطلوب منها وضع الصيغة</span><input type="text" maxLength={200} value={form.requestedAuthority} onChange={(event) => updateForm("requestedAuthority", event.target.value)} /></label>
            <label className="field span-2"><span>عدد الأحكام أو الإشهادات</span><input type="number" inputMode="numeric" min="1" step="1" value={form.documentCount} onChange={(event) => updateForm("documentCount", event.target.value)} /></label>
          </>}
          {form.kind === "power-of-attorney-attestation" && <label className="check-field span-2"><input type="checkbox" checked={form.caseFileHalfRate} onChange={(event) => updateForm("caseFileHalfRate", event.target.checked)} /><span><strong>التوكيل أو العزل ثابت بغير إشهاد أو تصديق ومقدم أو مبدى في قضية</strong><small>عند تحقق الشرطين معًا يخفض رسم المادة 72 إلى النصف.</small></span></label>}
          {form.kind === "signature-or-seal-certification" && <label className="field span-2"><span>عدد الإمضاءات أو الأختام</span><input type="number" inputMode="numeric" min="1" step="1" value={form.markCount} onChange={(event) => updateForm("markCount", event.target.value)} /></label>}
          {form.kind === "foreign-use-authentication" && <label className="field span-2"><span>عدد تأشيرات اعتماد ختم المحكمة</span><input type="number" inputMode="numeric" min="1" step="1" value={form.authenticationCount} onChange={(event) => updateForm("authenticationCount", event.target.value)} /></label>}
          {form.kind === "external-authentication" && <>
            <label className="field span-2"><span>عدد وحدات استحقاق رسم الانتقال</span><input type="number" inputMode="numeric" min="1" step="1" value={form.chargeableUnitCount} onChange={(event) => updateForm("chargeableUnitCount", event.target.value)} /><small>يتعدد الرسم بتعدد الإشهادات، وكذلك بتعدد الطالبين مع اختلاف المواد.</small></label>
            <label className="field"><span>مصاريف الانتقال المثبتة</span><div className="money-input"><input type="number" inputMode="decimal" min="0" step="0.001" value={form.travelExpensePounds} onChange={(event) => updateForm("travelExpensePounds", event.target.value)} /><b>جنيه</b></div></label>
            {Number(form.travelExpensePounds) > 0 && <label className="field"><span>مرجع مأمورية أو مصروفات الانتقال</span><input type="text" maxLength={200} value={form.travelExpenseReference} onChange={(event) => updateForm("travelExpenseReference", event.target.value)} /></label>}
          </>}
        </div>

        {submitError && <div className="inline-error"><AlertTriangle />{submitError}</div>}
        <div className="form-actions"><button className="button ghost" type="button" onClick={reset}><RotateCcw />إعادة الضبط</button><button className="button primary large" type="button" onClick={calculate} disabled={!canCalculate || submitting}>{submitting ? <span className="spinner light" /> : <Calculator />} {submitting ? "جارٍ الحساب…" : "احسب رسوم الخدمة"}<ArrowLeft /></button></div>
      </section>

      <aside className="estimate-side" ref={resultRef} tabIndex={-1} aria-live="polite">
        {result ? <FeeResultCard result={result} totalLabel={`إجمالي ${selectedServiceLabel}`} /> : <div className="empty-result"><span className="empty-icon"><Files /></span><h3>النتيجة</h3><p>أدخل البيانات ثم نفّذ الحساب.</p><div className="empty-proof"><BookOpen /><span><strong>السند</strong><small>الوحدة، السعر، الحد، والمصدر</small></span></div></div>}
      </aside>
    </div>
  </div>;
}
