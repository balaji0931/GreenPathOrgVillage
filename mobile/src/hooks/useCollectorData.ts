/**
 * Collector Data Hook for GreenPath Mobile
 *
 * Fetches and caches all collector-needed data:
 * - Assigned households
 * - Today's collections
 * - Village config (feature flags)
 * - Village today count
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import {
  fetchHouseholds,
  fetchCollectorCollections,
  fetchVillageData,
  fetchVillageTodayCount,
} from '../api/collector.api';
import type {
  Household,
  WasteCollection,
  VillageData,
  CollectorStats,
} from '../types/collector';
import { useAuth } from '../auth/AuthProvider';
import {
  saveCachedHouseholds,
  getCachedHouseholds,
  saveCachedVillageData,
  getCachedVillageData,
  saveCachedServerCollections,
  getMergedTodayCollections,
} from '../services/collector-queue';

interface CollectorData {
  households: Household[];
  collections: WasteCollection[];
  villageData: VillageData | null;
  stats: CollectorStats;
  isLoading: boolean;
  error: string | null;
  refresh: (silent?: boolean) => Promise<void>;
  recordCollectionOptimistic: (household: Household) => void;
}

export function useCollectorData(): CollectorData {
  const { user } = useAuth();

  // Initialize state directly and synchronously from SQLite cache (zero millisecond render)
  const [households, setHouseholds] = useState<Household[]>(() => {
    try {
      return getCachedHouseholds();
    } catch (e) {
      console.warn('Error reading initial cached households:', e);
      return [];
    }
  });

  const [collections, setCollections] = useState<WasteCollection[]>(() => {
    try {
      return getMergedTodayCollections();
    } catch (e) {
      console.warn('Error reading initial cached collections:', e);
      return [];
    }
  });

  const [villageData, setVillageData] = useState<VillageData | null>(() => {
    try {
      return user?.villageId ? getCachedVillageData(user.villageId) : null;
    } catch (e) {
      console.warn('Error reading initial cached village data:', e);
      return null;
    }
  });

  const [villageTodayCount, setVillageTodayCount] = useState<number>(() => {
    try {
      return getMergedTodayCollections().length;
    } catch {
      return 0;
    }
  });

  // Only show blocking loading skeletons if SQLite has ZERO cached households (e.g. brand new install)
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      return getCachedHouseholds().length === 0;
    } catch {
      return true;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const householdsRef = useRef(households);
  householdsRef.current = households;
  const lastFetchTimeRef = useRef(Date.now());

  // Sync villageData cache if user villageId loads or changes
  useEffect(() => {
    if (user?.villageId) {
      try {
        const localV = getCachedVillageData(user.villageId);
        if (localV) setVillageData(localV);
      } catch (e) {
        console.warn('Error syncing cached village data:', e);
      }
    }
  }, [user?.villageId]);

  // Fetch fresh data from network & sync to SQLite silently in the background
  const loadData = useCallback(async (silent = true) => {
    if (!user?.villageId) return;
    try {
      // Only show full spinner if requested non-silent AND there are no cached households
      if (!silent && householdsRef.current.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      const [householdsRes, collectionsRes, villageRes, todayCountRes] = await Promise.all([
        fetchHouseholds().catch(() => null),
        fetchCollectorCollections().catch(() => null),
        fetchVillageData(user.villageId).catch(() => null),
        fetchVillageTodayCount().catch(() => null),
      ]);

      if (isMounted.current) {
        // A. Households
        if (householdsRes && Array.isArray(householdsRes) && householdsRes.length > 0) {
          setHouseholds(householdsRes);
          saveCachedHouseholds(householdsRes);
        } else {
          // Offline / network failure fallback
          const localH = getCachedHouseholds();
          if (localH.length > 0) setHouseholds(localH);
        }

        // B. Village Data
        if (villageRes) {
          setVillageData(villageRes);
          saveCachedVillageData(user.villageId, villageRes);
        } else {
          const localV = getCachedVillageData(user.villageId);
          if (localV) setVillageData(localV);
        }

        // C. Server Collections
        if (collectionsRes && Array.isArray(collectionsRes)) {
          const activeHouseholds = (householdsRes && householdsRes.length > 0)
            ? householdsRes
            : getCachedHouseholds();
          saveCachedServerCollections(collectionsRes, activeHouseholds);
        }

        // D. Merged Today's Collections (Server + Local SQLite Queue)
        const mergedCollections = getMergedTodayCollections();
        setCollections(mergedCollections);

        // E. Today Count
        if (todayCountRes) {
          const todayTotal = todayCountRes.collectedToday ?? todayCountRes.count ?? mergedCollections.length;
          setVillageTodayCount(todayTotal);
        } else {
          setVillageTodayCount(mergedCollections.length);
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        // Fallback to local cache when offline
        const localH = getCachedHouseholds();
        if (localH.length > 0) {
          setHouseholds(localH);
          setCollections(getMergedTodayCollections());
        } else {
          setError(err.message || 'Failed to load data');
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      lastFetchTimeRef.current = Date.now();
    }
  }, [user?.villageId]);

  // Initial silent background sync on mount
  useEffect(() => {
    isMounted.current = true;
    loadData(true);
    return () => {
      isMounted.current = false;
    };
  }, [loadData]);

  // Revalidate silently when returning to foreground if backgrounded > 10 minutes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > 10 * 60 * 1000) {
          lastFetchTimeRef.current = now;
          loadData(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadData]);

  // Optimistic collection recording (instant zero-reload UI update)
  const recordCollectionOptimistic = useCallback((household: Household) => {
    const nowIso = new Date().toISOString();
    const syntheticCollection: WasteCollection = {
      id: Date.now(),
      householdId: household.id,
      collectorId: 0,
      status: 'collected',
      collectionDate: nowIso,
      segregationRating: 5,
    };

    setCollections((prev) => [syntheticCollection, ...prev]);
    setVillageTodayCount((prev) => prev + 1);
  }, []);

  // Compute stats from merged collections
  const today = new Date().toDateString();
  const collectedToday = collections.filter((c) => {
    const cDate = new Date(c.collectionDate || '').toDateString();
    return cDate === today;
  }).length;

  const stats: CollectorStats = {
    totalAssigned: households.length,
    collectedToday,
    villageTodayCount,
  };

  return {
    households,
    collections,
    villageData,
    stats,
    isLoading,
    error,
    refresh: (silent = false) => loadData(silent),
    recordCollectionOptimistic,
  };
}
