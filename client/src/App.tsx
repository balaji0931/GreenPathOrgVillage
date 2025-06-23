import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import CollectorDashboard from "@/pages/collector-dashboard";
import GeneratorDashboard from "@/pages/generator-dashboard";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Router />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

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
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/collector" component={CollectorDashboard} />
      <Route path="/generator" component={GeneratorDashboard} />
      <Route path="/">
        {() => {
          // Route based on user role
          switch (user.role) {
            case 'admin':
              return <AdminDashboard />;
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
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;