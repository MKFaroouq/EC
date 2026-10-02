import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { LoadingState } from "./components/LoadingState";

const AuditPage = lazy(() => import("./pages/AuditPage").then((module) => ({ default: module.AuditPage })));
const CalculatorPage = lazy(() => import("./pages/CalculatorPage").then((module) => ({ default: module.CalculatorPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const EstimatesPage = lazy(() => import("./pages/EstimatesPage").then((module) => ({ default: module.EstimatesPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RulesPage = lazy(() => import("./pages/RulesPage").then((module) => ({ default: module.RulesPage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then((module) => ({ default: module.ServicesPage })));
const SourcesPage = lazy(() => import("./pages/SourcesPage").then((module) => ({ default: module.SourcesPage })));

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><span className="spinner" /> جارٍ التحقق من الجلسة…</div>;
  if (!user) return <Suspense fallback={<LoadingState />}><LoginPage /></Suspense>;

  const dashboardAllowed = user.role !== "estimator";
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={dashboardAllowed ? <DashboardPage /> : <Navigate to="/calculator" replace />} />
          <Route path="calculator" element={<CalculatorPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="estimates" element={<EstimatesPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
