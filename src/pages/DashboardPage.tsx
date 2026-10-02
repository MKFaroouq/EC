import { Activity, ArrowUpLeft, Building2, CircleGauge, Coins, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type DashboardData } from "../api";
import { ErrorState, LoadingState } from "../components/LoadingState";
import { StatusBadge } from "../components/StatusBadge";

const moneyCompact = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 });

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    api.dashboard().then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر التحميل"));
  };
  useEffect(load, []);
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return <LoadingState label="جارٍ تحميل مؤشرات الرسوم…" />;

  const trend = data.trend.map((row) => ({ ...row, assessed: row.assessedMillieme / 1_000_000_000, collected: row.collectedMillieme / 1_000_000_000 }));
  const courts = data.byCourt.map((row) => ({ ...row, shortName: row.courtName.replace("محكمة ", "").replace(" الابتدائية", ""), collected: row.collectedMillieme / 1_000_000_000 }));
  return (
    <div className="stack-xl">
      <div className="page-intro">
        <div><h2>المؤشرات</h2></div>
        <div className="intro-actions"><StatusBadge tone="warning">بيانات عرض تجريبية</StatusBadge><span className="as-of">حتى {new Date(data.asOf).toLocaleDateString("ar-EG")}</span></div>
      </div>

      <section className="executive-summary" aria-label="المؤشرات الرئيسية">
        <article className="treasury-hero">
          <div className="treasury-head"><span><Coins />المتحصل الفعلي</span><small>يناير - يونيو</small></div>
          <strong>{moneyCompact.format(data.collectedMillieme / 1000)}</strong>
          <p>قيمة التحصيل المسجلة من المحاكم المبلغة في الفترة المحددة.</p>
        </article>
        <div className="metric-ledger">
          <Metric icon={<Coins />} label="مقدّر للتحصيل" value={moneyCompact.format(data.assessedMillieme / 1000)} detail="وعاء المطالبات" />
          <Metric icon={<CircleGauge />} label="معدل التحصيل" value={`${(data.collectionRate * 100).toLocaleString("ar-EG", { maximumFractionDigits: 1 })}%`} detail="المتحصل من المستحق" />
          <Metric icon={<Activity />} label="مبالغ قائمة" value={moneyCompact.format(data.outstandingMillieme / 1000)} detail="تحتاج متابعة" />
          <Metric icon={<Building2 />} label="محاكم مبلغة" value={data.reportingCourts.toLocaleString("ar-EG")} detail="لها حركة في الفترة" />
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel wide">
          <div className="panel-heading"><div><h3>الحركة</h3></div><span className="chart-unit">مليون جنيه</span></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e9ee" />
                <XAxis dataKey="month" tickFormatter={(value) => new Date(`${value}-01`).toLocaleDateString("ar-EG", { month: "short" })} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={42} />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} مليون`} labelFormatter={(value) => new Date(`${value}-01`).toLocaleDateString("ar-EG", { month: "long", year: "numeric" })} />
                <Legend formatter={(value) => value === "assessed" ? "مستحق" : "متحصل"} />
                <Line type="monotone" dataKey="assessed" stroke="#b99042" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="collected" stroke="#17857a" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel summary-panel">
          <div className="panel-heading"><div><h3>المتبقي</h3></div><Activity /></div>
          <strong className="outstanding-value">{moneyCompact.format(data.outstandingMillieme / 1000)}</strong>
          <div className="progress-track"><span style={{ width: `${data.collectionRate * 100}%` }} /></div>
          <div className="progress-label"><span>تم تحصيل {(data.collectionRate * 100).toLocaleString("ar-EG", { maximumFractionDigits: 1 })}%</span><span>نسبة المتبقي {(100 - data.collectionRate * 100).toLocaleString("ar-EG", { maximumFractionDigits: 1 })}%</span></div>
          <div className="insight"><ArrowUpLeft /><span><strong>إجراء متابعة</strong> مراجعة المحاكم الأدنى من متوسط التحصيل وتصنيف أعمار المديونيات.</span></div>
        </article>

        <article className="panel chart-panel wide">
          <div className="panel-heading"><div><h3>المحاكم</h3></div><span className="chart-unit">مليون جنيه</span></div>
          <div className="chart-box compact-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courts} layout="vertical" margin={{ top: 0, right: 6, left: 6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e9ee" />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} width={92} />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} مليون`} />
                <Bar dataKey="collected" fill="#0b4965" radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel data-note">
          <Info />
          <div><h3>التعريف</h3><p>{data.note}</p><small>المبالغ المعروضة: {money.format(data.collectedMillieme / 1000)} متحصل فعلي تجريبي.</small></div>
        </article>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="metric-ledger-item"><span>{icon}{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
