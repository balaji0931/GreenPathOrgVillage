/**
 * Subscription Hook for GreenPath Mobile
 *
 * Provides real-time subscription lifecycle management:
 * - Checks active subscription for current village via /api/subscriptions/villages/:villageId/active
 * - Caches subscription status synchronously in SQLite for instant zero-latency offline start
 * - Computes dynamic stages: active, warning_30, warning_15, warning_7, grace, expired, no_subscription
 * - Exposes isWriteBlocked flag when expired or no_subscription
 * - Proactively revalidates when returning to foreground
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import {
  fetchActiveSubscription,
  type SubscriptionState,
  type ActiveSubscriptionResponse,
} from '../api/subscription.api';
import {
  saveCachedSubscription,
  getCachedSubscription,
} from '../services/collector-queue';

export type { SubscriptionState };

export interface SubscriptionInfo extends Partial<ActiveSubscriptionResponse> {
  state: SubscriptionState;
  daysRemaining: number;
}

export interface UseSubscriptionResult {
  subscription: SubscriptionInfo | null;
  state: SubscriptionState;
  daysRemaining: number;
  isWriteBlocked: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function computeSubscriptionState(data: any | null): {
  state: SubscriptionState;
  daysRemaining: number;
} {
  if (!data || data.noSubscription || !data.endDate) {
    return { state: 'no_subscription', daysRemaining: 0 };
  }

  const now = Date.now();
  const endDate = new Date(data.endDate).getTime();
  const gracePeriodDays = typeof data.gracePeriodDays === 'number' ? data.gracePeriodDays : 0;
  const graceEnd = endDate + (gracePeriodDays * 24 * 60 * 60 * 1000);
  const daysToEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  let state: SubscriptionState = 'active';

  if (now > graceEnd) {
    state = 'expired';
  } else if (now > endDate && now <= graceEnd) {
    state = 'grace';
  } else if (daysToEnd >= 4 && daysToEnd <= 10) {
    state = 'warning_10';
  } else if (daysToEnd >= 0 && daysToEnd <= 3) {
    state = 'warning_7';
  }

  return {
    state,
    daysRemaining: Math.max(0, daysToEnd),
  };
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const villageId = user?.villageId;
  const isMounted = useRef(true);
  const lastFetchRef = useRef(Date.now());

  // Initialize synchronously from SQLite cache
  const [subData, setSubData] = useState<any | null>(() => {
    if (!villageId) return null;
    try {
      return getCachedSubscription(villageId);
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (!villageId || user?.role === 'admin') return false;
    try {
      return getCachedSubscription(villageId) === null;
    } catch {
      return true;
    }
  });

  // Sync cache if user/villageId changes
  useEffect(() => {
    if (villageId) {
      try {
        const cached = getCachedSubscription(villageId);
        if (cached !== null) {
          setSubData(cached);
        }
      } catch (e) {
        console.warn('Error reading cached subscription:', e);
      }
    }
  }, [villageId]);

  const loadSubscription = useCallback(async (silent = true) => {
    if (!villageId || user?.role === 'admin') {
      setIsLoading(false);
      return;
    }

    if (!silent && !subData) {
      setIsLoading(true);
    }

    try {
      const res = await fetchActiveSubscription(villageId);
      if (!isMounted.current) return;

      if (res) {
        saveCachedSubscription(villageId, res);
        setSubData(res);
      } else {
        // 404 — No subscription found for this village
        const noSubRecord = { noSubscription: true };
        saveCachedSubscription(villageId, noSubRecord);
        setSubData(noSubRecord);
      }
    } catch (err) {
      // Offline / network failure: fallback to local cache
      if (isMounted.current) {
        try {
          const cached = getCachedSubscription(villageId);
          if (cached) {
            setSubData(cached);
          }
        } catch {}
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      lastFetchRef.current = Date.now();
    }
  }, [villageId, user?.role, subData]);

  // Initial load on mount
  useEffect(() => {
    isMounted.current = true;
    loadSubscription(true);
    return () => {
      isMounted.current = false;
    };
  }, [loadSubscription]);

  // Proactive revalidation on foreground return (if away > 10 minutes)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const now = Date.now();
        if (now - lastFetchRef.current > 10 * 60 * 1000) {
          lastFetchRef.current = now;
          loadSubscription(true);
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, [loadSubscription]);

  // Admin users are never blocked
  if (user?.role === 'admin') {
    return {
      subscription: null,
      state: 'active',
      daysRemaining: 999,
      isWriteBlocked: false,
      isLoading: false,
      refresh: async () => {},
    };
  }

  const { state, daysRemaining } = computeSubscriptionState(subData);
  const isWriteBlocked = state === 'expired' || state === 'no_subscription';

  const subscription: SubscriptionInfo | null = subData && !subData.noSubscription
    ? {
        ...subData,
        state,
        daysRemaining,
      }
    : null;

  return {
    subscription,
    state,
    daysRemaining,
    isWriteBlocked,
    isLoading,
    refresh: () => loadSubscription(false),
  };
}
