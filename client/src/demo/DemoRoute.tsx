import { lazy, Suspense } from "react";
import type { DemoRole } from "./DemoContext";
import { DemoProvider } from "./DemoProvider";
import { DemoBanner } from "./DemoBanner";

// Lazy-load dashboard components for demo — no extra bundle for real users
const ManagerDashboard = lazy(() => import("@/pages/manager-dashboard"));
const CollectorDashboard = lazy(() => import("@/pages/collector-dashboard"));
const GeneratorDashboard = lazy(() => import("@/pages/generator-dashboard"));
const FieldWorkerDashboard = lazy(() => import("@/pages/fieldworker-dashboard"));

const DASHBOARD_MAP: Record<DemoRole, React.LazyExoticComponent<any>> = {
  manager: ManagerDashboard,
  collector: CollectorDashboard,
  generator: GeneratorDashboard,
  fieldworker: FieldWorkerDashboard,
};

const VALID_ROLES = new Set<string>(["manager", "collector", "generator", "fieldworker"]);

function DemoLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Loading demo dashboard...</p>
      </div>
    </div>
  );
}

/**
 * DemoRoute — renders the real dashboard wrapped in DemoProvider.
 * Access via /demo/:role (e.g., /demo/manager)
 */
export function DemoRoute({ role }: { role: string }) {
  if (!VALID_ROLES.has(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Demo Role</h1>
          <p className="text-gray-500 mb-4">"{role}" is not a valid role.</p>
          <a href="/demo" className="text-emerald-600 hover:underline font-medium">
            ← Back to Demo
          </a>
        </div>
      </div>
    );
  }

  const demoRole = role as DemoRole;
  const Dashboard = DASHBOARD_MAP[demoRole];

  return (
    <DemoProvider role={demoRole}>
      <DemoBanner />
      {/* Top padding to account for demo banner height */}
      <div style={{ paddingTop: "36px" }}>
        <Suspense fallback={<DemoLoading />}>
          <Dashboard />
        </Suspense>
      </div>
    </DemoProvider>
  );
}
