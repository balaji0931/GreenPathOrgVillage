import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { InstallPWA } from "@/components/InstallPWA";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import CollectorDashboard from "@/pages/collector-dashboard";
import GeneratorDashboard from "@/pages/generator-dashboard";
import ModeratorDashboard from "@/pages/moderator-dashboard";
import NotFound from "@/pages/not-found";
import "./i18n";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Router />
        <InstallPWA />
      </div>
      <Toaster />
    </QueryClientProvider>
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
        <Route>
          {() => {
            setLocation("/login");
            return <Login />;
          }}
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {() => {
          // Redirect authenticated users away from login
          switch (user.role) {
            case 'admin':
              setLocation("/admin");
              return <AdminDashboard />;
            case 'moderator':
              setLocation("/moderator");
              return <ModeratorDashboard />;
            case 'manager':
              setLocation("/manager");
              return <ManagerDashboard />;
            case 'collector':
              setLocation("/collector");
              return <CollectorDashboard />;
            case 'generator':
              setLocation("/generator");
              return <GeneratorDashboard />;
            default:
              setLocation("/login");
              return <Login />;
          }
        }}
      </Route>
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/moderator" component={ModeratorDashboard} />
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/collector" component={CollectorDashboard} />
      <Route path="/generator" component={GeneratorDashboard} />
      <Route path="/">
        {() => {
          if (isLoading) return <div>Loading...</div>;
          if (!user) {
            if (location !== "/login") {
              setLocation("/login");
            }
            return <Login />;
          }

          // Handle role-based routing with explicit path checking
          const currentPath = location || "/";

          switch (user.role) {
            case 'admin':
              if (currentPath !== "/" && currentPath !== "/admin") {
                setLocation("/");
              }
              return <AdminDashboard />;
            case 'manager':
              if (currentPath !== "/" && currentPath !== "/manager") {
                setLocation("/");
              }
              return <ManagerDashboard />;
            case 'moderator':
              if (currentPath !== "/" && currentPath !== "/moderator") {
                setLocation("/");
              }
              return <ModeratorDashboard />;
            case 'collector':
              if (currentPath !== "/" && currentPath !== "/collector") {
                setLocation("/");
              }
              return <CollectorDashboard />;
            case 'generator':
              if (currentPath !== "/" && currentPath !== "/generator") {
                setLocation("/");
              }
              return <GeneratorDashboard />;
            default:
              setLocation("/login");
              return <Login />;
          }
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;