import { FileClock, Fingerprint, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";

const actions: Record<string, string> = { ESTIMATE_CREATED: "إنشاء تقدير", RULE_SET_SUBMITTED: "إرسال قواعد للمراجعة", RULE_SET_APPROVED: "اعتماد إصدار قواعد" };

export function AuditPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>> | null>(null);
  const [error, setError] = useState("");
  const load = () => { setError(""); api.audit().then((value) => setItems(value.items)).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر التحميل")); };
  useEffect(load, []);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!items) return <LoadingState label="جارٍ التحقق من سلسلة التدقيق…" />;
  return <div className="stack-xl"><div className="page-intro"><div><h2>التدقيق</h2></div><StatusBadge tone="success"><ShieldCheck />مفعّل</StatusBadge></div>
    <div className="audit-explainer"><Fingerprint /><div><h3>النطاق</h3><p>هوية المنفذ ودوره ووقت العملية والكيان المتأثر ونسخة القاعدة، دون تخزين أسرار جلسة أو كلمات مرور.</p></div></div>
    {items.length === 0 ? <div className="empty-list"><FileClock /><h3>لا توجد أحداث بعد</h3><p>تظهر هنا عمليات الحساب والاعتماد.</p></div> : <section className="audit-timeline">{items.map((item, index) => <article className="audit-event" key={String(item.id)}><span className="timeline-dot" /><div className="audit-event-head"><div><strong>{actions[String(item.action)] ?? String(item.action)}</strong><span>{String(item.actorName)} | {roleName(String(item.actorRole))}</span></div><time>{new Date(String(item.occurredAt)).toLocaleString("ar-EG")}</time></div><div className="hash-row"><Fingerprint /><code>{String(item.eventHash).slice(0, 24)}…</code><span>{index === items.length - 1 ? "بداية السلسلة أو الحدث الأقدم" : "مرتبط بالحدث السابق"}</span></div></article>)}</section>}
  </div>;
}

function roleName(role: string): string {
  return ({ estimator: "موظف تقدير", supervisor: "رئيس قلم", legal_reviewer: "مراجع قانوني", project_manager: "مدير المشروع", leader: "مستخدم قيادي" } as Record<string, string>)[role] ?? role;
}
