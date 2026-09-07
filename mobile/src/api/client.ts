/**
 * API Client for GreenPath Mobile
 *
 * Handles Bearer token attachment and automatic refresh on 401.
 * No CSRF needed — Bearer tokens are CSRF-immune.
 */
import { API_BASE_URL } from '../constants/api';

type TokenProvider = {
  getAccessToken: () => string | null;
  refreshTokens: () => Promise<boolean>;
  onAuthFailure: () => void;
};

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
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

  // Attach Bearer token if available
  if (!skipAuth && tokenProvider) {
    let token = tokenProvider.getAccessToken();
    if (!token) {
      try {
        const refreshed = await tokenProvider.refreshTokens();
        if (refreshed) {
          token = tokenProvider.getAccessToken();
        }
      } catch {
        // Continue with attempt; fetch will handle 401 if unauthenticated
      }
    }
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  let response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If 401 and we have a token provider, try refreshing once
  if (response.status === 401 && !skipAuth && tokenProvider) {
    const refreshed = await tokenProvider.refreshTokens();
    if (refreshed) {
      // Retry with new token
      const newToken = tokenProvider.getAccessToken();
      if (newToken) {
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
      }
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    // If still 401 after refresh attempt, auth is dead
    if (response.status === 401) {
      tokenProvider.onAuthFailure();
      throw new ApiError('Session expired. Please login again.', 401);
    }
  }

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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
