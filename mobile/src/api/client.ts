/**
 * API Client for GreenPath Mobile
 *
 * Handles Bearer token attachment with proactive pre-request refresh.
 * No CSRF needed — Bearer tokens are CSRF-immune.
 *
 * Design principles:
 * - Proactively refresh BEFORE making a request if the token is expired.
 *   This avoids the 401 → refresh → retry round-trip entirely.
 * - Distinguish NetworkError (DNS/TLS failure, no connectivity) from
 *   ApiError (server responded with an error status).
 * - Only call onAuthFailure when the REFRESH TOKEN is dead (server 401
 *   on the refresh endpoint). Transient network errors never cause logout.
 */
import { API_BASE_URL } from '../constants/api';

// ── Error Types ────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Thrown when the device can't reach the server at all.
 * (DNS failure, TLS handshake error, no internet, network transition, etc.)
 * Callers should treat this as transient and retry — never log the user out.
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ── Token Provider ─────────────────────────────────────────────

type TokenProvider = {
  getAccessToken: () => string | null;
  refreshTokens: () => Promise<boolean>;
  onAuthFailure: () => void;
};

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

// ── API Request ────────────────────────────────────────────────

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

/**
 * Wraps fetch with network error detection.
 * If fetch itself throws (DNS, TLS, no connectivity), wraps it in NetworkError.
 */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: any) {
    // fetch throws TypeError for network-level failures
    // (DNS resolution, TLS handshake, no connectivity, CORS in dev, etc.)
    throw new NetworkError(
      err?.message || 'Network request failed — check your internet connection'
    );
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // ── Step 1: Attach Bearer token (proactively refresh if expired) ──
  if (!skipAuth && tokenProvider) {
    let token = tokenProvider.getAccessToken();

    // getAccessToken() returns null if the token is expired.
    // Proactively refresh BEFORE the request to avoid a 401 round-trip.
    if (!token) {
      try {
        const refreshed = await tokenProvider.refreshTokens();
        if (refreshed) {
          token = tokenProvider.getAccessToken();
        }
      } catch (err) {
        if (err instanceof NetworkError) {
          // Can't reach server to refresh — proceed without token.
          // If we're offline, the request will also fail and be caught below.
        }
        // If refresh threw ApiError 401, refreshTokens already cleared tokens
        // and the caller will get an error on the actual request.
      }
    }
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
      requestHeaders['X-Mobile-Token'] = token;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // ── Step 2: Make the request ──
  let response = await safeFetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // ── Step 3: Handle 401 — refresh and retry ONCE ──
  if (response.status === 401 && !skipAuth && tokenProvider) {
    try {
      const refreshed = await tokenProvider.refreshTokens();
      if (refreshed) {
        // Retry with new token
        const newToken = tokenProvider.getAccessToken();
        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`;
          requestHeaders['X-Mobile-Token'] = newToken;
        }
        response = await safeFetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        // Can't reach server to refresh — throw the network error, NOT a logout.
        throw err;
      }
      // ApiError from refresh endpoint — refreshTokens() already handled cleanup
    }

    // If STILL 401 after refresh attempt → the refresh token is dead.
    // This is the ONLY path where we force a logout.
    if (response.status === 401) {
      tokenProvider.onAuthFailure();
      throw new ApiError('Session expired. Please login again.', 401);
    }
  }

  // ── Step 4: Parse response ──
  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.message) message = parsed.message;
    } catch {
      // use default message
    }
    throw new ApiError(message, response.status);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
