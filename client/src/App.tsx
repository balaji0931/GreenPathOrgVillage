import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { InstallPWA } from "@/components/InstallPWA";
import Login from "@/pages/login";
import PublicHome from "@/pages/public-home";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import CollectorDashboard from "@/pages/collector-dashboard";
import GeneratorDashboard from "@/pages/generator-dashboard";
import ModeratorDashboard from "@/pages/moderator-dashboard";
import FieldWorkerDashboard from "@/pages/fieldworker-dashboard";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import DataProtection from "@/pages/data-protection";
import Pricing from "@/pages/pricing";
import NotFound from "@/pages/not-found";
import "./i18n";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Router />
      <InstallPWA />
      <Toaster />
    </div>
  );
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/data-protection" component={DataProtection} />
        <Route path="/pricing" component={Pricing} />

        <Route path="/home">{() => <PublicHome initialSection="home" />}</Route>
        <Route path="/about">{() => <PublicHome initialSection="about" />}</Route>
        <Route path="/feedback">{() => <PublicHome initialSection="feedback" />}</Route>
        <Route path="/contact">{() => <PublicHome initialSection="contact" />}</Route>

        <Route path="/">
          {() => <PublicHome initialSection="home" />}
        </Route>

        <Route component={NotFound} />
      </Switch>
    );
  }

  const dashboard = {
    admin: <AdminDashboard />,
    moderator: <ModeratorDashboard />,
    manager: <ManagerDashboard />,
    collector: <CollectorDashboard />,
    generator: <GeneratorDashboard />,
    fieldworker: <FieldWorkerDashboard />
  }[user.role];

  // If user has unknown / invalid role → redirect to login
  if (!dashboard) {
    return <Redirect to="/login" />;
  }

  return (
    <Switch>
      {/* Logged-in user visiting /login → redirect to dashboard */}
      <Route path="/login">
        {() => <Redirect to="/" />}
      </Route>

      {/* Public Pages allowed for logged-in users */}
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/data-protection" component={DataProtection} />
      <Route path="/pricing" component={Pricing} />

      <Route path="/home">{() => <PublicHome initialSection="home" />}</Route>
      <Route path="/about">{() => <PublicHome initialSection="about" />}</Route>
      <Route path="/feedback">{() => <PublicHome initialSection="feedback" />}</Route>
      <Route path="/contact">{() => <PublicHome initialSection="contact" />}</Route>

      {/* Role-specific routes */}
      <Route path="/admin">
        {() => user.role === "admin" ? <AdminDashboard /> : <Redirect to="/" />}
      </Route>

      <Route path="/moderator">
        {() => user.role === "moderator" ? <ModeratorDashboard /> : <Redirect to="/" />}
      </Route>

      <Route path="/manager">
        {() => user.role === "manager" ? <ManagerDashboard /> : <Redirect to="/" />}
      </Route>

      <Route path="/collector">
        {() => user.role === "collector" ? <CollectorDashboard /> : <Redirect to="/" />}
      </Route>

      <Route path="/generator">
        {() => user.role === "generator" ? <GeneratorDashboard /> : <Redirect to="/" />}
      </Route>

      <Route path="/fieldworker">
        {() => user.role === "fieldworker" ? <FieldWorkerDashboard /> : <Redirect to="/" />}
      </Route>

      {/* Default route → user's dashboard */}
      <Route path="/">
        {() => dashboard}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
