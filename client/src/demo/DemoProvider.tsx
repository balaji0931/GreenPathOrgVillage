import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DemoContext, type DemoRole } from "./DemoContext";
import { seedDemoData } from "./mock-data/seeder";
import { getDemoApiResponse } from "./mock-data/fetchInterceptor";
import { useToast } from "@/hooks/use-toast";

interface DemoProviderProps {
  role: DemoRole;
  children: ReactNode;
}

// Guard flag — prevents double-patching if two DemoProviders mount briefly
const DEMO_FETCH_FLAG = "__demo_fetch_patched__";

/**
 * DemoProvider — wraps a real dashboard component with isolated demo data.
 *
 * How it works:
 * 1. Creates a SEPARATE QueryClient with mock data pre-seeded
 * 2. Wraps children in a new QueryClientProvider (overrides the global one)
 * 3. Intercepts window.fetch for /api/* calls (safety net for custom queryFns)
 * 4. All mutations show a "demo mode" toast instead of hitting the server
 *
 * Security guarantees:
 * - queryFn default: () => undefined (never fetches)
 * - staleTime: Infinity (never refetches)
 * - fetch interceptor: /api/* calls return mock data
 * - Non-API calls (images, map tiles, CDN) pass through unmodified
 */
export function DemoProvider({ role, children }: DemoProviderProps) {
  const [resetKey, setResetKey] = useState(0);
  const { toast } = useToast();
  const lastToastTime = useRef(0);

  // Create isolated QueryClient — recreated on reset
  const demoQueryClient = useMemo(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          /**
           * Critical: Some queries (e.g. useAuth) override staleTime/refetchOnMount,
           * which triggers this queryFn even if data was pre-seeded.
           * We MUST return correct mock data here, not [].
           *
           * Priority: 1) existing cache data  2) getDemoApiResponse  3) []
           */
          queryFn: ({ queryKey }) => {
            // 1) Return existing cached data (handles re-fetches of seeded data)
            const cached = client.getQueryData(queryKey);
            if (cached !== undefined) return cached;

            // 2) Try the fetch interceptor's response mapper
            const path = typeof queryKey[0] === "string" ? queryKey[0] : "";
            if (path.startsWith("/api/")) {
              try {
                const mockData = getDemoApiResponse(path, role);
                return mockData;
              } catch {
                // fall through
              }
            }

            // 3) Fallback
            if (process.env.NODE_ENV === "development") {
              console.warn("[Demo] No mock data for query key:", queryKey);
            }
            return [] as any;
          },
          retry: false,
          staleTime: Infinity, // Pre-seeded data never goes stale
          gcTime: Infinity, // Never garbage collect demo data
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
        mutations: {
          // Block ALL mutations — show demo toast (throttled)
          mutationFn: async () => {
            // Return success shape so onSuccess callbacks don't crash
            return { success: true, id: Date.now() };
          },
        },
      },
    });

    // Pre-seed all mock data for this role
    seedDemoData(client, role);

    // Debug helper — access demo client from browser console
    if (process.env.NODE_ENV === "development") {
      (window as any).__demoClient = client;
    }

    return client;
  }, [role, resetKey]);

  // Scoped fetch interceptor with guard flag
  useEffect(() => {
    // Prevent double-patching
    if ((window as any)[DEMO_FETCH_FLAG]) return;

    const originalFetch = window.fetch;
    (window as any)[DEMO_FETCH_FLAG] = true;

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      // ONLY intercept /api/ calls — everything else passes through
      const pathname = new URL(url, window.location.origin).pathname;
      if (pathname.startsWith("/api/")) {
        // Block mutations (POST/PUT/DELETE/PATCH) — with demo-specific simulation
        const method = (init?.method || "GET").toUpperCase();
        if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
          const fullUrl = new URL(url, window.location.origin);

          // ── Simulate QR batch generation (3s delay + success) ──
          if (fullUrl.pathname === "/api/qr-codes/batch" && method === "POST") {
            await new Promise((r) => setTimeout(r, 3000));
            return new Response(
              JSON.stringify({
                batchId: `BATCH-DEMO-${String(Date.now()).slice(-4)}`,
                qrCodes: Array.from({ length: 9 }, (_, i) => ({
                  id: 100 + i,
                  qrCode: `DEMO-QR-${Date.now()}-${i + 1}`,
                })),
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // ── Simulate material log creation (instant success) ──
          if (fullUrl.pathname.startsWith("/api/material-log/") && method === "POST") {
            return new Response(
              JSON.stringify({ success: true, id: Date.now() }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // ── Simulate export estimate ──
          if (fullUrl.pathname === "/api/export/estimate" && method === "POST") {
            return new Response(
              JSON.stringify({
                totalRows: 1250,
                totalSizeKB: 340,
                estimatedTimeSec: 3,
                exceedsSizeLimit: false,
                isSensitive: false,
                suggestedPassword: "SN-2026-demo",
                estimates: [
                  { label: "Household Register", villageName: "Sundernagar", rowCount: 100, sizeKB: 45, sensitivity: "personal" },
                  { label: "Waste Collections", villageName: "Sundernagar", rowCount: 850, sizeKB: 210, sensitivity: "personal" },
                  { label: "Daily Waste Quantity", villageName: "Sundernagar", rowCount: 30, sizeKB: 12, sensitivity: "aggregated" },
                  { label: "Compost Production", villageName: "Sundernagar", rowCount: 15, sizeKB: 8, sensitivity: "aggregated" },
                ],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // ── All other mutations → demo toast ──
          const now = Date.now();
          if (now - lastToastTime.current > 1500) {
            toast({
              title: "📋 Demo Mode",
              description: "This action is disabled in demo. Contact us to get started.",
            });
            lastToastTime.current = now;
          }
          return new Response(
            JSON.stringify({ success: true, id: Date.now(), message: "Demo mode" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // GET requests — return mock data based on URL (with error handling)
        try {
          const mockData = getDemoApiResponse(url, role);
          return new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[Demo fetch error]", url, err);
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Non-API calls (images, CDN, map tiles, etc.) go through normally
      return originalFetch(input, init);
    };

    // ── Also intercept window.open for /api/ URLs (QR downloads, PDFs) ──
    const originalOpen = window.open;
    window.open = function (url?: string | URL, ...args: any[]) {
      const urlStr = typeof url === "string" ? url : url?.toString() || "";
      if (urlStr.startsWith("/api/")) {
        toast({
          title: "📋 Demo Mode",
          description: "Downloads are disabled in demo. Contact us to get started.",
        });
        return null;
      }
      return originalOpen.call(window, url, ...args);
    } as typeof window.open;

    return () => {
      window.fetch = originalFetch;
      window.open = originalOpen;
      (window as any)[DEMO_FETCH_FLAG] = false;
    };
  }, [role, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      demoQueryClient.clear();
    };
  }, [demoQueryClient]);

  const resetDemo = () => setResetKey((k) => k + 1);

  return (
    <DemoContext.Provider value={{ isDemo: true, role, resetDemo }}>
      <QueryClientProvider client={demoQueryClient}>
        {children}
      </QueryClientProvider>
    </DemoContext.Provider>
  );
}
