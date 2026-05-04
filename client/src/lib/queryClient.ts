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
  const currentToken = getCsrfToken();
  if (currentToken) {
    headers["X-CSRF-Token"] = currentToken;
  }
  return headers;
}

// Wrapper for fetch with CSRF token (for file uploads and other raw fetch calls)
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  const currentToken = getCsrfToken();

  if (currentToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRF-Token", currentToken);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Self-healing: if we get a 403, retry once after fetching a fresh token
  if (res.status === 403 && !isRetry && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    console.warn("CSRF mismatch in fetchWithCsrf. Attempting self-healing retry...");
    const newToken = await fetchCsrfToken();
    if (newToken) {
      return fetchWithCsrf(url, options, true);
    }
  }

  return res;
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
  isRetry = false
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Include CSRF token for state-changing requests
  const currentToken = getCsrfToken();
  if (currentToken && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers["X-CSRF-Token"] = currentToken;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Self-healing: if we get a 403, it might be a stale CSRF token.
  // Fetch a new one and retry the request exactly once.
  if (res.status === 403 && !isRetry && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    console.warn("CSRF mismatch detected. Attempting self-healing retry...");
    const newToken = await fetchCsrfToken();
    if (newToken) {
      return apiRequest(method, url, data, true);
    }
  }

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
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds - data stays fresh for active users
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
