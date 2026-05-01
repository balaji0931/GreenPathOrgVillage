import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";

import { OfflineIndicator } from "@/components/OfflineIndicator";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import CollectorDashboard from "@/pages/collector-dashboard";
import GeneratorDashboard from "@/pages/generator-dashboard";
import ModeratorDashboard from "@/pages/moderator";
import FieldWorkerDashboard from "@/pages/fieldworker-dashboard";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import DataProtection from "@/pages/data-protection";
import NotFound from "@/pages/not-found";
import "./i18n";

// New public pages
import HomePage from "@/pages/public/HomePage";
import ProductPage from "@/pages/public/ProductPage";
import SolutionsPage from "@/pages/public/SolutionsPage";
import PricingPage from "@/pages/public/PricingPage";
import AboutPage from "@/pages/public/AboutPage";
import ContactPage from "@/pages/public/ContactPage";
import CaseStudiesPage from "@/pages/public/CaseStudiesPage";
import { ScrollToTop } from "@/components/ScrollToTop";

// Interactive demo (public, zero server impact)
import DemoLanding from "@/demo/DemoLanding";
import { DemoRoute } from "@/demo/DemoRoute";


function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <Router />



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

        {/* New public pages */}
        <Route path="/product" component={ProductPage} />
        <Route path="/solutions" component={SolutionsPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/case-studies" component={CaseStudiesPage} />
        <Route path="/impact">{() => <Redirect to="/product" />}</Route>
        <Route path="/blog">{() => <Redirect to="/about" />}</Route>

        {/* Interactive demo - public, no auth needed */}
        <Route path="/demo/:role">{(params) => <DemoRoute role={params.role} />}</Route>
        <Route path="/demo" component={DemoLanding} />

        {/* Legacy routes redirect to new pages */}
        <Route path="/home">{() => <HomePage />}</Route>
        <Route path="/feedback">{() => <Redirect to="/contact" />}</Route>

        <Route path="/">
          {() => <HomePage />}
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
    <>
      <OfflineIndicator userRole={user.role} />
      <Switch>
      {/* Logged-in user visiting /login → redirect to dashboard */}
      <Route path="/login">
        {() => <Redirect to="/" />}
      </Route>

      {/* Public Pages allowed for logged-in users */}
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/data-protection" component={DataProtection} />

      {/* Public marketing pages (also accessible when logged in) */}
      <Route path="/product" component={ProductPage} />
      <Route path="/solutions" component={SolutionsPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/case-studies" component={CaseStudiesPage} />
      <Route path="/impact">{() => <Redirect to="/product" />}</Route>
      <Route path="/blog">{() => <Redirect to="/about" />}</Route>
      <Route path="/home">{() => <HomePage />}</Route>
      <Route path="/feedback">{() => <Redirect to="/contact" />}</Route>

      {/* Interactive demo - also accessible when logged in */}
      <Route path="/demo/:role">{(params) => <DemoRoute role={params.role} />}</Route>
      <Route path="/demo" component={DemoLanding} />

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
    </>
  );
}

export default App;
