import {
  BarChart3,
  BookOpenCheck,
  Calculator,
  ChevronDown,
  ClipboardList,
  FileClock,
  Files,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import type { Role } from "../api";
import { BrandMark } from "./BrandMark";

const roleNames: Record<Role, string> = {
  estimator: "موظف تقدير",
  supervisor: "رئيس قلم",
  legal_reviewer: "مراجع قانوني",
  project_manager: "مدير المشروع",
  leader: "مستخدم قيادي"
};

const pages: Record<string, { title: string; section: string }> = {
  "/": { title: "المؤشرات", section: "المتابعة" },
  "/calculator": { title: "التقدير", section: "الدعاوى" },
  "/services": { title: "الخدمات", section: "الرسوم" },
  "/estimates": { title: "السجل", section: "التقديرات" },
  "/rules": { title: "القواعد", section: "الحوكمة" },
  "/sources": { title: "المصادر", section: "الأسانيد" },
  "/audit": { title: "التدقيق", section: "الرقابة" }
};

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = pages[location.pathname] ?? pages["/"];
  if (!user) return null;

  const canSeeDashboard = user.role !== "estimator";
  const canSeeAudit = user.role !== "estimator";
  const close = () => setMobileOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        <div className="sidebar-head">
          <BrandMark />
          <button className="icon-button sidebar-close" onClick={close} aria-label="إغلاق القائمة"><X /></button>
        </div>
        <nav className="main-nav" aria-label="التنقل الرئيسي">
          <span className="nav-section">العمليات</span>
          {canSeeDashboard && <NavItem to="/" label="لوحة المؤشرات" icon={<BarChart3 />} onClick={close} end />}
          <NavItem to="/calculator" label="تقدير جديد" icon={<Calculator />} onClick={close} />
          <NavItem to="/services" label="خدمات المحاكم" icon={<Files />} onClick={close} />
          <NavItem to="/estimates" label="سجل التقديرات" icon={<ClipboardList />} onClick={close} />
          <span className="nav-section">الحوكمة</span>
          <NavItem to="/rules" label="قواعد الاحتساب" icon={<BookOpenCheck />} onClick={close} />
          <NavItem to="/sources" label="المصادر القانونية" icon={<ScrollText />} onClick={close} />
          {canSeeAudit && <NavItem to="/audit" label="أثر المراجعة" icon={<FileClock />} onClick={close} />}
        </nav>
        <div className="sidebar-security"><ShieldCheck /><span><strong>ضوابط التقدير</strong><small>تسجيل القاعدة والسند والإصدار لكل بند</small></span></div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" onClick={close} aria-label="إغلاق القائمة" />}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة"><Menu /></button>
            <div><span>{page.section}</span><h1>{page.title}</h1></div>
          </div>
          <div className="topbar-government" aria-hidden="true"><span>وزارة العدل</span><i /><span>نظام حساب الرسوم القضائية</span></div>
          <div className="user-menu">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <span className="user-copy"><strong>{user.name}</strong><small>{roleNames[user.role]}</small></span>
            <ChevronDown className="chevron" />
            <button className="logout-button" onClick={() => { logout(); navigate("/", { replace: true }); }} title="تسجيل الخروج"><LogOut /><span>خروج</span></button>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}

function NavItem({ to, label, icon, onClick, end = false }: { to: string; label: string; icon: React.ReactNode; onClick: () => void; end?: boolean }) {
  return <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>{icon}<span>{label}</span></NavLink>;
}
