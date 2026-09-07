/**
 * Authentication Context for GreenPath Mobile
 *
 * Manages:
 * - Login via POST /api/mobile/auth/login
 * - Refresh token stored in SecureStore (Android Keystore)
 * - Access token kept in memory only
 * - Auto-refresh before expiry
 * - Bootstrap on app launch (restore session from SecureStore)
 * - Logout with server-side token revocation
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform, AppState } from 'react-native';
import { apiRequest, setTokenProvider, ApiError } from '../api/client';
import { setUploadTokenProvider } from '../api/upload.api';
import { API_ENDPOINTS } from '../constants/api';

// ── Types ──────────────────────────────────────────────────────

export interface User {
  userId: string;
  role: string;
  name: string;
  villageId: string | null;
  isFirstLogin: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// ── Constants ──────────────────────────────────────────────────

const SECURE_STORE_REFRESH_KEY = 'greenpath_refresh_token';
const SECURE_STORE_DEVICE_ID_KEY = 'greenpath_device_id';
const SECURE_STORE_USER_KEY = 'greenpath_user';
// Refresh 30 seconds before expiry to avoid race conditions
const REFRESH_BUFFER_SECONDS = 30;

// ── Context ────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  // In-memory token storage (never persisted)
  const accessTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  // ── Helpers ────────────────────────────────────────────────

  const getDeviceId = useCallback(async (): Promise<string> => {
    let deviceId = await SecureStore.getItemAsync(SECURE_STORE_DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a stable device ID on first use
      deviceId = `android-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await SecureStore.setItemAsync(SECURE_STORE_DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }, []);

  const getDeviceName = useCallback((): string => {
    return `${Platform.OS} ${Platform.Version}`;
  }, []);

  const clearTokens = useCallback(async () => {
    accessTokenRef.current = null;
    expiresAtRef.current = 0;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_STORE_REFRESH_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(SECURE_STORE_USER_KEY).catch(() => {}),
    ]);
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const refreshInMs = Math.max((expiresIn - REFRESH_BUFFER_SECONDS) * 1000, 10000);
    refreshTimerRef.current = setTimeout(() => {
      refreshTokens();
    }, refreshInMs);
  }, []);

  // ── Token Provider for API client ──────────────────────────

  const getAccessToken = useCallback((): string | null => {
    return accessTokenRef.current;
  }, []);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_REFRESH_KEY);
        if (!refreshToken) return false;

        const data = await apiRequest<{
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        }>(API_ENDPOINTS.refresh, {
          method: 'POST',
          body: { refreshToken },
          skipAuth: true,
        });

        // Store new tokens
        accessTokenRef.current = data.accessToken;
        expiresAtRef.current = Date.now() + data.expiresIn * 1000;
        await SecureStore.setItemAsync(SECURE_STORE_REFRESH_KEY, data.refreshToken);

        // Schedule next refresh
        scheduleRefresh(data.expiresIn);

        return true;
      } catch (err) {
        // ONLY clear tokens if server explicitly returned 401 (session revoked on server)
        if (err instanceof ApiError && err.status === 401) {
          await clearTokens();
        }
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [scheduleRefresh, clearTokens]);

  const onAuthFailure = useCallback(async () => {
    await clearTokens();
    setState({ user: null, isLoading: false, error: null });
  }, [clearTokens]);

  // Register token provider with API client and upload API
  useEffect(() => {
    setTokenProvider({
      getAccessToken,
      refreshTokens,
      onAuthFailure,
    });
    // Also register with upload API for multipart file uploads
    setUploadTokenProvider({
      getAccessToken,
      refreshTokens,
    });
  }, [getAccessToken, refreshTokens, onAuthFailure]);

  // Silently refresh token when app returns to foreground if in-memory token is empty
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !accessTokenRef.current) {
        refreshTokens().catch(() => {});
      }
    });
    return () => {
      subscription.remove();
    };
  }, [refreshTokens]);

  // ── Bootstrap (restore session on app launch) ──────────────

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [refreshToken, cachedUserStr] = await Promise.all([
          SecureStore.getItemAsync(SECURE_STORE_REFRESH_KEY).catch(() => null),
          SecureStore.getItemAsync(SECURE_STORE_USER_KEY).catch(() => null),
        ]);

        if (!refreshToken) {
          if (mounted) setState({ user: null, isLoading: false, error: null });
          return;
        }

        let cachedUser: User | null = null;
        if (cachedUserStr) {
          try {
            cachedUser = JSON.parse(cachedUserStr);
          } catch {}
        }

        // Offline-first: if cached user exists, immediately restore them so the UI opens without waiting or failing offline!
        if (cachedUser && mounted) {
          setState({ user: cachedUser, isLoading: false, error: null });
        }

        // Attempt silent background token refresh
        try {
          const refreshed = await refreshTokens();
          if (refreshed) {
            // Fresh token obtained: sync user profile in background
            const freshUser = await apiRequest<User>(API_ENDPOINTS.user).catch(() => null);
            if (freshUser) {
              await SecureStore.setItemAsync(SECURE_STORE_USER_KEY, JSON.stringify(freshUser)).catch(() => {});
              if (mounted) setState({ user: freshUser, isLoading: false, error: null });
            }
          } else if (!cachedUser) {
            // No cached user and refresh failed
            if (mounted) setState({ user: null, isLoading: false, error: null });
          }
        } catch (refreshErr) {
          if (refreshErr instanceof ApiError && refreshErr.status === 401) {
            await clearTokens();
            if (mounted) setState({ user: null, isLoading: false, error: null });
            return;
          }
          // Network error: stay logged in with cachedUser
          if (!cachedUser && mounted) {
            setState({ user: null, isLoading: false, error: null });
          }
        }
      } catch {
        if (mounted) setState({ user: null, isLoading: false, error: null });
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────

  const login = useCallback(async (userId: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const deviceId = await getDeviceId();
      const deviceName = getDeviceName();

      const data = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: User;
      }>(API_ENDPOINTS.login, {
        method: 'POST',
        body: { userId, password, deviceId, deviceName },
        skipAuth: true,
      });

      // Store tokens and cached user profile
      accessTokenRef.current = data.accessToken;
      expiresAtRef.current = Date.now() + data.expiresIn * 1000;
      await Promise.all([
        SecureStore.setItemAsync(SECURE_STORE_REFRESH_KEY, data.refreshToken),
        SecureStore.setItemAsync(SECURE_STORE_USER_KEY, JSON.stringify(data.user)),
      ]);

      // Schedule auto-refresh
      scheduleRefresh(data.expiresIn);

      setState({ user: data.user, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, [getDeviceId, getDeviceName, scheduleRefresh]);

  // ── Logout ─────────────────────────────────────────────────

  const logout = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_REFRESH_KEY);
      if (refreshToken && accessTokenRef.current) {
        // Revoke refresh token server-side
        await apiRequest(API_ENDPOINTS.logout, {
          method: 'POST',
          body: { refreshToken },
        }).catch(() => {
          // Best-effort server logout; clear local state regardless
        });
      }
    } finally {
      await clearTokens();
      setState({ user: null, isLoading: false, error: null });
    }
  }, [clearTokens]);

  // ── Clear Error ────────────────────────────────────────────

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
