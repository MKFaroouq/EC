import { BookOpenCheck, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth";
import { BrandMark } from "../components/BrandMark";

const demoAccounts = [
  { role: "موظف تقدير", username: "estimator", password: "Fees@2026", scope: "إنشاء التقديرات" },
  { role: "رئيس قلم", username: "supervisor", password: "Review@2026", scope: "محكمة شمال القاهرة فقط" },
  { role: "مراجع قانوني", username: "legal", password: "Legal@2026", scope: "مراجعة القواعد والمصادر" },
  { role: "مدير المشروع", username: "project.manager", password: "Project@2026", scope: "النشر العام الحصري" },
  { role: "مستخدم قيادي", username: "leadership", password: "Reports@2026", scope: "عرض المؤشرات فقط" }
];

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("estimator");
  const [password, setPassword] = useState("Fees@2026");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try { await login(username.trim(), password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر تسجيل الدخول"); }
    finally { setBusy(false); }
  };

  return <main className="login-page">
    <section className="login-brand-panel">
      <BrandMark />
      <div className="login-message">
        <span className="kicker">وزارة العدل</span>
        <h1>نظام حساب<br />الرسوم القضائية</h1>
        <p>نظام داخلي لتقدير بنود الرسوم القضائية وتسجيل أسس الحساب ومصادر القواعد المطبقة.</p>
      </div>
      <div className="trust-points"><span><ShieldCheck /> صلاحيات محددة بحسب الدور والمحكمة</span><span><BookOpenCheck /> تسجيل المصدر والمادة وإصدار القاعدة</span></div>
    </section>
    <section className="login-access-panel">
      <div className="login-box">
        <span className="kicker">الدخول إلى بيئة العرض</span>
        <h2>تسجيل الدخول</h2>
        <p>بيانات العرض أدناه مخصصة للاختبار الداخلي. التشغيل الفعلي يتطلب الربط بمنظومة الهوية الحكومية.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="field"><span>اسم المستخدم</span><input dir="ltr" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
          <label className="field"><span>كلمة المرور</span><input dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="inline-error">{error}</div>}
          <button className="button primary large full" disabled={busy || username.trim().length < 3 || password.length < 8}>{busy ? <span className="spinner light" /> : <LogIn />}{busy ? "جارٍ التحقق…" : "دخول"}</button>
        </form>
        <div className="demo-accounts" aria-label="حسابات العرض">
          <strong>حسابات العرض والصلاحيات</strong>
          {demoAccounts.map((account) => <button type="button" key={account.username} onClick={() => { setUsername(account.username); setPassword(account.password); setError(""); }}>
            <span><b>{account.role}</b><small>{account.scope}</small></span><code dir="ltr">{account.username}<br />{account.password}</code>
          </button>)}
        </div>
      </div>
    </section>
  </main>;
}
