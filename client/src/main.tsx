import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { registerServiceWorker } from "./hooks/usePWA";
import { OfflineIndicator } from "./components/OfflineIndicator";
import App from "./App";
import "./index.css";

function MainApp() {
  React.useEffect(() => {
    // Register service worker when app loads
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <OfflineIndicator />
        <App />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<MainApp />);