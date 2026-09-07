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
} from '../services/offline-queue';

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
  const [households, setHouseholds] = useState<Household[]>([]);
  const [collections, setCollections] = useState<WasteCollection[]>([]);
  const [villageData, setVillageData] = useState<VillageData | null>(null);
  const [villageTodayCount, setVillageTodayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // 1. Initial immediate load from SQLite (instant zero-network render)
  useEffect(() => {
    isMounted.current = true;
    try {
      const cachedH = getCachedHouseholds();
      const cachedC = getMergedTodayCollections();
      const cachedV = user?.villageId ? getCachedVillageData(user.villageId) : null;

      if (isMounted.current) {
        if (cachedH.length > 0) setHouseholds(cachedH);
        if (cachedC.length > 0) setCollections(cachedC);
        if (cachedV) setVillageData(cachedV);

        // If we have cached data, dismiss full loading spinner immediately
        if (cachedH.length > 0) {
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.warn('Error loading initial offline cache:', e);
    }

    return () => {
      isMounted.current = false;
    };
  }, [user?.villageId]);

  // 2. Fetch fresh data from network & sync to SQLite
  const loadData = useCallback(async (silent = false) => {
    if (!user?.villageId) return;
    try {
      // Only show full spinner if we don't have any cached households
      if (!silent && households.length === 0) {
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
          // Offline fallback
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
      if (isMounted.current && !silent) {
        setIsLoading(false);
      }
    }
  }, [user?.villageId, households.length]);

  useEffect(() => {
    loadData(false);
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
