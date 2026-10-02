import { AlertTriangle, CheckCircle2, ExternalLink, FileCheck2, FilePlus2, FileQuestion, Files, Image, Plus, Sheet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type Catalog, type NewLegalSourceInput } from "../api";
import { useAuth } from "../auth";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import type { LegalSource } from "../domain/types";

const kindLabel: Record<LegalSource["kind"], string> = { law: "قانون", regulation: "لائحة", circular: "كتاب دوري", judgment: "قضاء", research: "بحث قانوني", workbook: "جدول عمل", "legacy-screen": "شاشة سابقة" };

export function SourcesPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [sourceDraft, setSourceDraft] = useState<NewLegalSourceInput>({ title: "", kind: "law", status: "supporting", notes: "" });
  const load = () => { setError(""); api.catalog().then(setCatalog).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر التحميل")); };
  useEffect(load, []);
  const sources = useMemo(() => catalog?.legalSources.filter((source) => filter === "all" || source.status === filter) ?? [], [catalog, filter]);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!catalog) return <LoadingState label="جارٍ فهرسة المصادر…" />;

  const saveSource = async () => {
    setSaving(true); setFormError(""); setNotice("");
    try {
      await api.addSource({
        ...sourceDraft,
        effectiveDate: sourceDraft.effectiveDate || undefined,
        url: sourceDraft.url || undefined
      });
      setNotice("أُضيف المصدر إلى السجل، وسُجل الإجراء في أثر التدقيق.");
      setSourceDraft({ title: "", kind: "law", status: "supporting", notes: "" });
      setShowForm(false);
      load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "تعذر حفظ المصدر");
    } finally { setSaving(false); }
  };

  return <div className="stack-xl">
    <div className="page-intro"><div><h2>المصادر</h2></div><div className="intro-actions"><div className="source-summary"><Files /><span><strong>{catalog.legalSources.length.toLocaleString("ar-EG")}</strong><small>مصدرًا</small></span></div>{user?.role === "legal_reviewer" && <button className="button primary" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? <X /> : <Plus />}{showForm ? "إلغاء" : "إضافة"}</button>}</div></div>
    <div className="source-alert"><AlertTriangle /><div><strong>فجوتان تمنعان اكتمال التغطية</strong><p>الملف 2.pdf فارغ (0 بايت)، كما أن خلية S29 في ملف Excel تحتوي صيغة تالفة نتيجتها #VALUE!. لم تُستخدم أي منهما في الحساب.</p></div></div>
    {notice && <div className="success-notice"><CheckCircle2 />{notice}</div>}
    {showForm && <section className="governance-form"><div className="panel-heading"><div><h3>مصدر</h3></div><FilePlus2 /></div><div className="field-grid">
      <label className="field span-2"><span>عنوان المصدر</span><input value={sourceDraft.title} maxLength={300} onChange={(event) => setSourceDraft({ ...sourceDraft, title: event.target.value })} /></label>
      <label className="field"><span>نوع المصدر</span><select value={sourceDraft.kind} onChange={(event) => setSourceDraft({ ...sourceDraft, kind: event.target.value as NewLegalSourceInput["kind"] })}><option value="law">قانون</option><option value="regulation">لائحة أو قرار</option><option value="circular">كتاب دوري</option><option value="judgment">حكم أو مبدأ قضائي</option><option value="research">بحث قانوني</option><option value="workbook">جدول عمل</option><option value="legacy-screen">شاشة سابقة</option></select></label>
      <label className="field"><span>قوة المصدر</span><select value={sourceDraft.status} onChange={(event) => setSourceDraft({ ...sourceDraft, status: event.target.value as NewLegalSourceInput["status"] })}><option value="primary">أصلي</option><option value="supporting">مساند</option><option value="incomplete">غير مكتمل</option><option value="operational-only">تشغيلي فقط</option></select></label>
      <label className="field"><span>تاريخ السريان <small>(إن وجد)</small></span><input type="date" value={sourceDraft.effectiveDate ?? ""} onChange={(event) => setSourceDraft({ ...sourceDraft, effectiveDate: event.target.value })} /></label>
      <label className="field"><span>رابط رسمي آمن <small>(اختياري)</small></span><input dir="ltr" type="url" placeholder="https://" value={sourceDraft.url ?? ""} onChange={(event) => setSourceDraft({ ...sourceDraft, url: event.target.value })} /></label>
      <label className="field span-2"><span>النطاق وملاحظات الاعتماد</span><textarea minLength={10} maxLength={2000} value={sourceDraft.notes} onChange={(event) => setSourceDraft({ ...sourceDraft, notes: event.target.value })} placeholder="ما القواعد التي يثبتها؟ وهل يحتاج مراجعة إضافية؟" /></label>
    </div>{formError && <div className="inline-error"><AlertTriangle />{formError}</div>}<div className="form-actions"><button className="button primary" type="button" disabled={saving || sourceDraft.title.trim().length < 5 || sourceDraft.notes.trim().length < 10} onClick={saveSource}>{saving ? <span className="spinner light" /> : <FilePlus2 />}{saving ? "جارٍ الحفظ…" : "حفظ المصدر"}</button></div></section>}
    <div className="filter-tabs" role="tablist"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>الكل</button><button className={filter === "primary" ? "active" : ""} onClick={() => setFilter("primary")}>مصادر أصلية</button><button className={filter === "supporting" ? "active" : ""} onClick={() => setFilter("supporting")}>مساندة</button><button className={filter === "incomplete" ? "active" : ""} onClick={() => setFilter("incomplete")}>غير مكتملة</button></div>
    <section className="source-list">{sources.map((source) => <SourceCard key={source.id} source={source} />)}</section>
  </div>;
}

function SourceCard({ source }: { source: LegalSource }) {
  const icon = source.kind === "workbook" ? <Sheet /> : source.kind === "legacy-screen" ? <Image /> : source.status === "incomplete" ? <FileQuestion /> : <FileCheck2 />;
  const tone = source.status === "primary" ? "success" : source.status === "incomplete" ? "danger" : source.status === "operational-only" ? "warning" : "info";
  const status = source.status === "primary" ? "مصدر أصلي" : source.status === "supporting" ? "مصدر مساند" : source.status === "incomplete" ? "غير مكتمل" : "تشغيلي فقط";
  return <article className="source-card"><span className="source-icon">{icon}</span><div className="source-body"><div className="source-title"><div><span className="eyebrow">{kindLabel[source.kind]} | {source.effectiveDate ? `ساري ${new Date(source.effectiveDate).toLocaleDateString("ar-EG")}` : "مرجع مصنف"}</span><h3>{source.title}</h3></div><StatusBadge tone={tone}>{status}</StatusBadge></div><p>{source.notes}</p><div className="source-meta">{source.localFile && <span>ملف: {source.localFile}</span>}{source.url && <a href={source.url} target="_blank" rel="noreferrer"><ExternalLink />المصدر الإلكتروني</a>}</div></div></article>;
}
