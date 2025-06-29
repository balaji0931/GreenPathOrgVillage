import React from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./hooks/useAuth";
import { registerServiceWorker } from "./hooks/usePWA";

import LoginPage from "./pages/login";
import AdminDashboard from "./pages/admin-dashboard";
import ManagerDashboard from "./pages/manager-dashboard";
import CollectorDashboard from "./pages/collector-dashboard";
import GeneratorDashboard from "./pages/generator-dashboard";
import NotFound from "./pages/not-found";
import { InstallPWA } from "./components/InstallPWA";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/collector" component={CollectorDashboard} />
      <Route path="/generator" component={GeneratorDashboard} />
      <Route path="/moderator" component={ModeratorDashboard} />
      <Route path="/">
        {user.role === "admin" && <AdminDashboard />}
        {user.role === "manager" && <ManagerDashboard />}
        {user.role === "collector" && <CollectorDashboard />}
        {user.role === "generator" && <GeneratorDashboard />}
        {user.role === "moderator" && <ModeratorDashboard />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  React.useEffect(() => {
    // Register service worker when app loads
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Router />
        <InstallPWA />
        <Toaster />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);