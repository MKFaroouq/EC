import { AlertOctagon, ArrowUpLeft, BookOpenCheck, CheckCircle2, Clock3, FilePenLine, GitBranch, LockKeyhole, Plus, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Catalog, type NewRuleChangeInput } from "../api";
import { useAuth } from "../auth";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import { DEFAULT_RULE_PARAMETERS, RULE_PARAMETER_DEFINITIONS, formatRuleFormula, isEditableRuleCode, validateRuleParameters, type RuleParameterDefinition } from "../domain/rule-parameters";
import type { RuleChangeRequest, RuleRegisterItem } from "../domain/types";

const today = new Date().toISOString().slice(0, 10);

export function RulesPage() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [changes, setChanges] = useState<RuleChangeRequest[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [proposal, setProposal] = useState<NewRuleChangeInput>({
    ruleCode: "ORIGINAL_RELATIVE", proposedParameters: { ...DEFAULT_RULE_PARAMETERS.ORIGINAL_RELATIVE }, effectiveDate: today, reason: "", sourceIds: [],
    scope: user?.role === "project_manager" ? "global" : "court",
    courtId: user?.role === "supervisor" ? user.courtId : undefined
  });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const load = () => { setError(""); Promise.all([api.catalog(), api.ruleChanges()]).then(([catalogValue, changesValue]) => { setCatalog(catalogValue); setChanges(changesValue.items); }).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر التحميل")); };
  useEffect(load, []);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!catalog) return <LoadingState label="جارٍ تحميل سجل القواعد…" />;

  const submitProposal = async () => {
    setBusy(true); setNotice("");
    try {
      validateRuleParameters(proposal.ruleCode, proposal.proposedParameters);
      await api.proposeRuleChange(proposal);
      setNotice(proposal.scope === "global" ? "أُرسل التعديل العام للمراجعة القانونية؛ لن يستطيع نشره بعد الاعتماد إلا مدير المشروع المحدد." : "أُرسل تعديل المحكمة للمراجعة القانونية؛ لن يؤثر إلا في المحكمة المحددة بعد اعتماده ونشره.");
      setProposal({
        ruleCode: "ORIGINAL_RELATIVE", proposedParameters: { ...DEFAULT_RULE_PARAMETERS.ORIGINAL_RELATIVE }, effectiveDate: today, reason: "", sourceIds: [],
        scope: user?.role === "project_manager" ? "global" : "court",
        courtId: user?.role === "supervisor" ? user.courtId : undefined
      });
      setShowProposal(false); load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "تعذر إرسال المقترح"); }
    finally { setBusy(false); }
  };

  const publishProposal = async (change: RuleChangeRequest) => {
    setBusy(true); setNotice("");
    try {
      await api.publishRuleChange(change.id);
      setNotice(change.scope === "global" ? "نُشر التعديل العام بواسطة مدير المشروع وسُجل في أثر التدقيق." : "نُشر تعديل المحكمة داخل نطاقها فقط وسُجل في أثر التدقيق.");
      load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "تعذر نشر التعديل"); }
    finally { setBusy(false); }
  };

  const reviewProposal = async (change: RuleChangeRequest, decision: "approve" | "reject") => {
    const reviewNote = reviewNotes[change.id]?.trim() ?? "";
    if (reviewNote.length < 10) { setNotice("اكتب ملاحظة مراجعة لا تقل عن 10 أحرف قبل القرار."); return; }
    setBusy(true); setNotice("");
    try {
      await api.reviewRuleChange(change.id, decision, reviewNote);
      setNotice(decision === "approve" ? "اعتمد المقترح للنسخة التالية؛ لم يُفعّل في المحرك الحالي." : "رُفض المقترح مع حفظ سبب الرفض.");
      load();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "تعذر تسجيل القرار"); }
    finally { setBusy(false); }
  };

  const published = catalog.ruleRegister.filter((rule) => rule.state === "published").length;
  const blocked = catalog.ruleRegister.filter((rule) => rule.state === "blocked").length;
  const editableRules = catalog.ruleRegister.filter((rule) => isEditableRuleCode(rule.code));
  const parameterDefinitions = isEditableRuleCode(proposal.ruleCode) ? RULE_PARAMETER_DEFINITIONS[proposal.ruleCode] : [];
  let proposalValid = proposal.effectiveDate.length > 0;
  try { validateRuleParameters(proposal.ruleCode, proposal.proposedParameters); } catch { proposalValid = false; }
  return <div className="stack-xl">
    <div className="page-intro"><div><h2>القواعد</h2></div><div className="intro-actions"><StatusBadge tone="success">{published.toLocaleString("ar-EG")} منشورة</StatusBadge>{(user?.role === "supervisor" || user?.role === "project_manager") && <button className="button primary" type="button" onClick={() => setShowProposal((value) => !value)}>{showProposal ? <X /> : <Plus />}{showProposal ? "إلغاء" : "تعديل"}</button>}</div></div>

    {showProposal && <section className="governance-form"><div className="panel-heading"><div><span className="eyebrow">فصل الصلاحيات</span><h3>اقتراح تعديل قاعدة</h3></div><FilePenLine /></div><div className="scope-lock"><LockKeyhole /><span><strong>{proposal.scope === "global" ? "تعديل عام على مستوى النظام" : "تعديل محلي للمحكمة"}</strong><small>{proposal.scope === "global" ? "هذا النطاق لا ينشئه ولا ينشره إلا مدير المشروع الوحيد المحدد في إعدادات التشغيل." : `النطاق مقيد بـ ${catalog.courts.find((court) => court.id === proposal.courtId)?.name ?? "محكمة المستخدم"} ولا يمكن نقله لمحكمة أخرى.`}</small></span></div><div className="field-grid">
      <label className="field"><span>القاعدة</span><select value={proposal.ruleCode} onChange={(event) => { const ruleCode = event.target.value; if (isEditableRuleCode(ruleCode)) setProposal({ ...proposal, ruleCode, proposedParameters: { ...DEFAULT_RULE_PARAMETERS[ruleCode] } }); }}>{editableRules.map((rule) => <option key={rule.code} value={rule.code}>{rule.title}</option>)}</select><small className="field-hint">تظهر فقط القواعد المتصلة فعليًا بمحرك الحساب؛ لا يُسمح بنشر نص وصفي لا ينفذ.</small></label>
      <label className="field"><span>تاريخ السريان المقترح</span><input type="date" value={proposal.effectiveDate ?? ""} onChange={(event) => setProposal({ ...proposal, effectiveDate: event.target.value })} /></label>
      <div className="rule-parameter-grid span-2">{parameterDefinitions.map((definition) => <label className="field" key={definition.key}><span>{definition.label}</span><div className="money-input"><input type="number" min={displayParameter(definition, definition.min)} max={displayParameter(definition, definition.max)} step={definition.unit === "pounds" ? 1 : definition.unit === "percent" ? 0.01 : 0.001} value={displayParameter(definition, proposal.proposedParameters[definition.key] ?? 0)} onChange={(event) => setProposal({ ...proposal, proposedParameters: { ...proposal.proposedParameters, [definition.key]: storeParameter(definition, event.target.value) } })} /><b>{definition.unit === "percent" ? "%" : "جنيه"}</b></div></label>)}</div>
      <div className="formula-preview span-2"><span>الصيغة التي ستُنشر</span><strong>{proposalValid ? formatRuleFormula(proposal.ruleCode, proposal.proposedParameters) : "أكمل القيم بترتيب صحيح"}</strong><small>تُحفظ القيم رقميًا ويُولد هذا الوصف منها؛ لا يُنفذ نص حر داخل النظام.</small></div>
      <label className="field span-2"><span>سبب التعديل وأثره على الحالات السابقة</span><textarea maxLength={2000} value={proposal.reason} onChange={(event) => setProposal({ ...proposal, reason: event.target.value })} /></label>
      <fieldset className="source-picker span-2"><legend>المصادر المؤيدة <small>اختر مصدرًا واحدًا على الأقل</small></legend>{catalog.legalSources.filter((source) => source.status === "primary" || source.status === "supporting").map((source) => <label key={source.id}><input type="checkbox" checked={proposal.sourceIds.includes(source.id)} onChange={(event) => setProposal({ ...proposal, sourceIds: event.target.checked ? [...proposal.sourceIds, source.id] : proposal.sourceIds.filter((id) => id !== source.id) })} /><span>{source.title}</span></label>)}</fieldset>
    </div><div className="form-actions"><button className="button primary" type="button" disabled={busy || !proposalValid || proposal.reason.trim().length < 10 || proposal.sourceIds.length === 0} onClick={submitProposal}><Send />إرسال للمراجعة القانونية</button></div></section>}

    <section className="rule-release">
      <div className="release-icon"><GitBranch /></div>
      <div className="release-copy"><span className="eyebrow">الإصدار الفعّال</span><h3>{catalog.ruleSet.title}</h3><p>رقم الإصدار {catalog.ruleSet.version} | سارٍ من {new Date(catalog.ruleSet.effectiveFrom).toLocaleDateString("ar-EG")}</p></div>
      <div className="release-stats"><span><strong>{published}</strong><small>منشورة</small></span><span><strong>{catalog.ruleRegister.filter((r) => r.state === "draft").length}</strong><small>مسودة</small></span><span><strong>{blocked}</strong><small>محجوبة</small></span></div>
      <div className="release-actions">
        <span className="readonly-label"><LockKeyhole />النشر من مقترح معتمد فقط</span>
      </div>
    </section>
    {notice && <div className="success-notice"><CheckCircle2 />{notice}</div>}

    <section className="rules-table-panel">
      <div className="panel-heading"><div><span className="eyebrow">سجل القرار</span><h3>القواعد وموقف اعتمادها</h3></div><span className="table-count">{catalog.ruleRegister.length.toLocaleString("ar-EG")} قواعد</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>القاعدة</th><th>الصيغة</th><th>السريان</th><th>الثقة</th><th>الحالة</th></tr></thead><tbody>{catalog.ruleRegister.map((rule) => <RuleRow key={rule.code} rule={rule} />)}</tbody></table></div>
    </section>

    <section className="rule-changes-panel"><div className="panel-heading"><div><span className="eyebrow">مسار التغيير</span><h3>مقترحات تعديل القواعد</h3></div><span className="table-count">{changes.length.toLocaleString("ar-EG")} مقترحات</span></div>{changes.length === 0 ? <div className="empty-list"><FilePenLine /><h3>لا توجد مقترحات بعد</h3><p>يبدأ المسار باقتراح مقيد النطاق، ثم قرار قانوني مستقل، ثم نشر من صاحب الصلاحية.</p></div> : <div className="rule-change-list">{changes.map((change) => { const canPublish = change.status === "approved" && !change.publishedAt && ((user?.role === "project_manager" && change.scope === "global") || (user?.role === "supervisor" && change.scope === "court" && change.courtId === user.courtId)); return <article className="rule-change-item" key={change.id}><div className="change-main"><div className="change-heading"><div><span>{catalog.ruleRegister.find((rule) => rule.code === change.ruleCode)?.title ?? change.ruleCode}</span><h4>{change.proposedFormula}</h4></div><ChangeStatus status={change.status} publishedAt={change.publishedAt} /></div><p>{change.reason}</p><small>{change.scope === "global" ? "نطاق عام" : `نطاق ${catalog.courts.find((court) => court.id === change.courtId)?.name ?? change.courtId}`} | اقترحه {change.proposerName} في {new Date(change.createdAt).toLocaleString("ar-EG")} | {change.sourceIds.length.toLocaleString("ar-EG")} مصادر</small>{change.reviewNote && <div className="review-note"><BookOpenCheck />{change.reviewNote}</div>}{change.publishedAt && <div className="review-note"><CheckCircle2 />نشره {change.publisherName} في {new Date(change.publishedAt).toLocaleString("ar-EG")}</div>}{canPublish && <div className="form-actions"><button className="button primary" type="button" disabled={busy} onClick={() => publishProposal(change)}><Send />{change.scope === "global" ? "نشر عام" : "نشر للمحكمة"}</button></div>}</div>{user?.role === "legal_reviewer" && change.status === "in_review" && <div className="change-review"><label className="field"><span>ملاحظة القرار</span><textarea value={reviewNotes[change.id] ?? ""} onChange={(event) => setReviewNotes({ ...reviewNotes, [change.id]: event.target.value })} maxLength={2000} /></label><div><button className="button secondary" type="button" disabled={busy} onClick={() => reviewProposal(change, "reject")}><ThumbsDown />رفض</button><button className="button primary" type="button" disabled={busy} onClick={() => reviewProposal(change, "approve")}><ThumbsUp />اعتماد للنسخة التالية</button></div></div>}</article>; })}</div>}</section>

    <div className="governance-callout"><BookOpenCheck /><div><h3>شرط النشر</h3><p>المصدر، المادة، تاريخ السريان، حالات الاختبار، وصاحبَي المراجعة يجب أن تكتمل قبل التفعيل. الحسابات السابقة تظل مرتبطة بإصدارها القديم.</p></div><ArrowUpLeft /></div>
  </div>;
}

function ChangeStatus({ status, publishedAt }: { status: RuleChangeRequest["status"]; publishedAt?: string }) {
  if (publishedAt) return <StatusBadge tone="success"><CheckCircle2 />منشور</StatusBadge>;
  if (status === "approved") return <StatusBadge tone="success"><CheckCircle2 />معتمد للنسخة التالية</StatusBadge>;
  if (status === "rejected") return <StatusBadge tone="danger"><AlertOctagon />مرفوض</StatusBadge>;
  return <StatusBadge tone="warning"><Clock3 />قيد المراجعة</StatusBadge>;
}

function RuleRow({ rule }: { rule: RuleRegisterItem }) {
  const state = rule.state === "published" ? <StatusBadge tone="success"><CheckCircle2 />منشورة</StatusBadge> : rule.state === "draft" ? <StatusBadge tone="warning"><Clock3 />مسودة</StatusBadge> : <StatusBadge tone="danger"><AlertOctagon />محجوبة</StatusBadge>;
  const confidence = rule.confidence === "verified" ? "موثقة" : rule.confidence === "operational" ? "تشغيلية" : "مرشحة";
  return <tr><td><strong>{rule.title}</strong><small>{rule.code}</small>{rule.reviewNote && <span className="row-note">{rule.reviewNote}</span>}</td><td>{rule.formula}</td><td>{rule.effectiveFrom ? new Date(rule.effectiveFrom).toLocaleDateString("ar-EG") : "بعد الاعتماد"}</td><td>{confidence}</td><td>{state}</td></tr>;
}

function displayParameter(definition: RuleParameterDefinition, storedValue: number): number {
  if (definition.unit === "money") return storedValue / 1_000;
  if (definition.unit === "percent") return storedValue / 100;
  return storedValue;
}

function storeParameter(definition: RuleParameterDefinition, displayValue: string): number {
  const parsed = Number(displayValue);
  if (!Number.isFinite(parsed)) return 0;
  if (definition.unit === "money") return Math.round(parsed * 1_000);
  if (definition.unit === "percent") return Math.round(parsed * 100);
  return Math.round(parsed);
}
