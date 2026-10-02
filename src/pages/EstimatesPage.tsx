import { Calculator, ClipboardList, Files } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";
import { formatMoney } from "../domain/calculate";

const serviceLabels: Record<string, string> = {
  "registry-copy": "صورة مستخرجة من سجل",
  certificate: "شهادة أو ملخص من سجل",
  "judicial-paper-copy": "صورة من أوراق قضائية",
  translation: "ترجمة أوراق",
  "named-search": "كشف بالاسم",
  "theoretical-search": "كشف نظري في مادة",
  order: "أمر قضائي",
  "cassation-memorandum": "مذكرة محكمة النقض",
  announcement: "إعلان قضائي",
  execution: "تنفيذ حكم أو سند تنفيذي",
  "executive-formula-other-authority": "صيغة تنفيذية من جهة أخرى",
  attestation: "إشهاد",
  "power-of-attorney-attestation": "إشهاد بتوكيل أو عزل",
  "signature-or-seal-certification": "تصديق على إمضاء أو ختم",
  "foreign-use-authentication": "اعتماد ختم للاستعمال خارج القطر",
  "external-authentication": "انتقال للإشهاد أو التصديق"
};

export function EstimatesPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>> | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    api.estimates().then((value) => setItems(value.items)).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر التحميل"));
  };
  useEffect(load, []);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!items) return <LoadingState label="جارٍ تحميل التقديرات…" />;

  return <div className="stack-xl">
    <div className="page-intro">
      <div><h2>التقديرات</h2></div>
      <div className="intro-actions">
        <Link to="/services" className="button secondary"><Files />خدمة جديدة</Link>
        <Link to="/calculator" className="button primary"><Calculator />تقدير دعوى</Link>
      </div>
    </div>
    {items.length === 0
      ? <div className="empty-list"><ClipboardList /><h3>لا توجد تقديرات بعد</h3><p>أنشئ تقدير دعوى أو خدمة، وسيظهر هنا مع الموظف والمحكمة ووقت الحساب.</p><Link to="/calculator" className="button secondary">ابدأ تقديرًا</Link></div>
      : <section className="rules-table-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>المرجع</th><th>المنشئ</th><th>نوع التقدير</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>{items.map((item) => {
        const isService = item.entryType === "service";
        const detail = isService
          ? serviceLabels[String(item.serviceKind)] ?? String(item.serviceKind)
          : String(item.caseTypeId);
        const stage = isService ? "خدمة قلم الكتاب" : item.stage === "filing" ? "دعوى عند الرفع" : "تسوية نهائية";
        return <tr key={String(item.id)}>
          <td><strong>{String(item.id).slice(0, 8).toUpperCase()}</strong><small>{detail}</small></td>
          <td>{String(item.actorName)}</td>
          <td>{stage}</td>
          <td>{new Date(String(item.createdAt)).toLocaleString("ar-EG")}</td>
          <td><strong>{formatMoney(Number(item.totalMillieme))}</strong>{Number(item.refundableMillieme ?? 0) > 0 && <small>رد تقديري: {formatMoney(Number(item.refundableMillieme))}</small>}</td>
          <td><StatusBadge tone={item.status === "issued" ? "success" : "warning"}>{item.status === "issued" ? "صادر" : item.status === "reviewed" ? "مراجع" : "مسودة"}</StatusBadge></td>
        </tr>;
      })}</tbody></table></div></section>}
  </div>;
}
