import { Switch, Route, useLocation } from "wouter";
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
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import DataProtection from "@/pages/data-protection";
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
  const [location, setLocation] = useLocation();

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
        <Route path="/" component={PublicHome} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Determine the correct dashboard based on user role
  const getDashboardComponent = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'moderator':
        return <ModeratorDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'collector':
        return <CollectorDashboard />;
      case 'generator':
        return <GeneratorDashboard />;
      default:
        setLocation("/login");
        return <Login />;
    }
  };

  return (
    <Switch>
      <Route path="/login">
        {() => {
          // Redirect authenticated users to their dashboard
          setLocation("/");
          return getDashboardComponent();
        }}
      </Route>
      <Route path="/admin">
        {() => user.role === 'admin' ? <AdminDashboard /> : getDashboardComponent()}
      </Route>
      <Route path="/moderator">
        {() => user.role === 'moderator' ? <ModeratorDashboard /> : getDashboardComponent()}
      </Route>
      <Route path="/manager">
        {() => user.role === 'manager' ? <ManagerDashboard /> : getDashboardComponent()}
      </Route>
      <Route path="/collector">
        {() => user.role === 'collector' ? <CollectorDashboard /> : getDashboardComponent()}
      </Route>
      <Route path="/generator">
        {() => user.role === 'generator' ? <GeneratorDashboard /> : getDashboardComponent()}
      </Route>
      <Route path="/">
        {() => getDashboardComponent()}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;