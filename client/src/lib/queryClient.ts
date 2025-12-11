import { QueryClient, QueryFunction } from "@tanstack/react-query";

// CSRF token storage - use sessionStorage for persistence across page reloads
let csrfToken: string | null = null;

// Initialize from sessionStorage on module load
if (typeof window !== 'undefined') {
  csrfToken = sessionStorage.getItem('csrfToken');
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('csrfToken', token);
    } else {
      sessionStorage.removeItem('csrfToken');
    }
  }
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

// Fetch CSRF token from server (called on app initialization for authenticated users)
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
        return data.csrfToken;
      }
    }
  } catch (error) {
    // Silently fail - user may not be authenticated
  }
  return null;
}

// Get headers for fetch requests that include CSRF token (for file uploads)
export function getFetchHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  return headers;
}

// Wrapper for fetch with CSRF token (for file uploads and other raw fetch calls)
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase())) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Include CSRF token for state-changing requests
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
