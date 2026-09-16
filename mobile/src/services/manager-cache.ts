/**
 * GreenPath Village Manager — Single-Day (Today-Only) Report Cache
 *
 * Enforces strict zero-bloat cache policy:
 * 1. ONLY today's operational report is ever cached.
 * 2. Past/historical dates are NEVER cached and are loaded on-demand.
 * 3. When the date rolls over to a new day, previous dates are immediately purged.
 * 4. Maximum storage footprint is capped to 1 single row (~5KB) indefinitely.
 */
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import type { ManagerPremiumReportData, ManagerDailyCollectionSummary } from '../types/manager';

const DB_NAME = 'greenpath_manager.db';

// ── In-Memory L1 Cache (Stores only today) ─────────────────────
let todayMemoryCache: {
  villageId: string;
  date: string;
  data: ManagerPremiumReportData;
} | null = null;

let todayCollectionsMemoryCache: {
  villageId: string;
  date: string;
  data: ManagerDailyCollectionSummary;
} | null = null;

// ── Persistent SQLite L2 Cache ─────────────────────────────────
let db: SQLiteDatabase | null = null;

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isTodayDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr.trim() === getTodayDateStr();
}

function getDb(): SQLiteDatabase | null {
  if (!db) {
    try {
      db = openDatabaseSync(DB_NAME);
      db.execSync(`
        CREATE TABLE IF NOT EXISTS manager_reports_cache (
          village_id TEXT PRIMARY KEY,
          report_date TEXT NOT NULL,
          data_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS manager_collections_cache (
          village_id TEXT PRIMARY KEY,
          collection_date TEXT NOT NULL,
          data_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      // Immediately purge any stale records from previous days upon open
      const todayStr = getTodayDateStr();
      db.runSync(
        `DELETE FROM manager_reports_cache WHERE report_date != ?`,
        [todayStr]
      );
      db.runSync(
        `DELETE FROM manager_collections_cache WHERE collection_date != ?`,
        [todayStr]
      );
    } catch (err) {
      console.warn('[ManagerCache] SQLite init warning:', err);
      return null;
    }
  }
  return db;
}

/**
 * Purge any cached reports from previous dates (guarantees tables have <= 1 row)
 */
export function purgeOldReportsCache(): void {
  const todayStr = getTodayDateStr();

  // Clear memory cache if it belongs to an older date
  if (todayMemoryCache && todayMemoryCache.date !== todayStr) {
    todayMemoryCache = null;
  }
  if (todayCollectionsMemoryCache && todayCollectionsMemoryCache.date !== todayStr) {
    todayCollectionsMemoryCache = null;
  }

  // Purge SQLite records not matching today
  try {
    const database = getDb();
    if (database) {
      database.runSync(
        `DELETE FROM manager_reports_cache WHERE report_date != ?`,
        [todayStr]
      );
      database.runSync(
        `DELETE FROM manager_collections_cache WHERE collection_date != ?`,
        [todayStr]
      );
    }
  } catch (err) {
    console.warn('[ManagerCache] Error purging old cache:', err);
  }
}

/**
 * Get cached report data synchronously — ONLY for today.
 * If date is not today, returns null immediately (no cache).
 */
export function getCachedReport(
  villageId: string,
  date: string
): ManagerPremiumReportData | null {
  if (!villageId || !date) return null;

  // Strict rule: only today is cached
  if (!isTodayDate(date)) {
    return null;
  }

  const cleanVillageId = villageId.trim();
  const todayStr = getTodayDateStr();

  // 1. Check in-memory L1 cache
  if (
    todayMemoryCache &&
    todayMemoryCache.villageId === cleanVillageId &&
    todayMemoryCache.date === todayStr
  ) {
    return todayMemoryCache.data;
  }

  // 2. Check SQLite L2 cache (and auto-purge older dates)
  try {
    const database = getDb();
    if (!database) return null;

    purgeOldReportsCache();

    const row = database.getFirstSync<{ data_json: string; report_date: string }>(
      `SELECT data_json, report_date FROM manager_reports_cache WHERE village_id = ? AND report_date = ? LIMIT 1`,
      [cleanVillageId, todayStr]
    );

    if (row && row.data_json && row.report_date === todayStr) {
      const parsed = JSON.parse(row.data_json) as ManagerPremiumReportData;
      todayMemoryCache = {
        villageId: cleanVillageId,
        date: todayStr,
        data: parsed,
      };
      return parsed;
    }
  } catch (err) {
    console.warn('[ManagerCache] Error reading cached report:', err);
  }

  return null;
}

/**
 * Save report data — ONLY if date is today.
 * If date is not today, it is NOT cached.
 */
export function saveCachedReport(
  villageId: string,
  date: string,
  data: ManagerPremiumReportData
): void {
  if (!villageId || !date || !data) return;

  // Strict rule: do not cache past/historical dates
  if (!isTodayDate(date)) {
    return;
  }

  const cleanVillageId = villageId.trim();
  const todayStr = getTodayDateStr();

  // 1. Update in-memory L1 cache
  todayMemoryCache = {
    villageId: cleanVillageId,
    date: todayStr,
    data,
  };

  // 2. Write to SQLite and purge any other dates
  try {
    const database = getDb();
    if (!database) return;

    purgeOldReportsCache();

    const json = JSON.stringify(data);
    const now = Date.now();

    database.runSync(
      `INSERT OR REPLACE INTO manager_reports_cache (village_id, report_date, data_json, updated_at)
       VALUES (?, ?, ?, ?)`,
      [cleanVillageId, todayStr, json, now]
    );
  } catch (err) {
    console.warn('[ManagerCache] Error saving cached report:', err);
  }
}

/**
 * Completely wipe all reports cache (memory and SQLite)
 */
export function clearAllReportsCache(): void {
  todayMemoryCache = null;
  todayCollectionsMemoryCache = null;
  try {
    const database = getDb();
    if (database) {
      database.runSync(`DELETE FROM manager_reports_cache`);
      database.runSync(`DELETE FROM manager_collections_cache`);
    }
  } catch (err) {
    console.warn('[ManagerCache] Error wiping reports cache:', err);
  }
}

/**
 * Get cached daily collection summary synchronously — ONLY for today.
 * If date is not today, returns null immediately.
 */
export function getCachedCollectionsSummary(
  villageId: string,
  date: string
): ManagerDailyCollectionSummary | null {
  if (!villageId || !date) return null;

  if (!isTodayDate(date)) {
    return null;
  }

  const cleanVillageId = villageId.trim();
  const todayStr = getTodayDateStr();

  // 1. Check in-memory L1 cache
  if (
    todayCollectionsMemoryCache &&
    todayCollectionsMemoryCache.villageId === cleanVillageId &&
    todayCollectionsMemoryCache.date === todayStr
  ) {
    return todayCollectionsMemoryCache.data;
  }

  // 2. Check SQLite L2 cache
  try {
    const database = getDb();
    if (!database) return null;

    purgeOldReportsCache();

    const row = database.getFirstSync<{ data_json: string; collection_date: string }>(
      `SELECT data_json, collection_date FROM manager_collections_cache WHERE village_id = ? AND collection_date = ? LIMIT 1`,
      [cleanVillageId, todayStr]
    );

    if (row && row.data_json && row.collection_date === todayStr) {
      const parsed = JSON.parse(row.data_json) as ManagerDailyCollectionSummary;
      todayCollectionsMemoryCache = {
        villageId: cleanVillageId,
        date: todayStr,
        data: parsed,
      };
      return parsed;
    }
  } catch (err) {
    console.warn('[ManagerCache] Error reading cached collections summary:', err);
  }

  return null;
}

/**
 * Save daily collection summary — ONLY if date is today.
 */
export function saveCachedCollectionsSummary(
  villageId: string,
  date: string,
  data: ManagerDailyCollectionSummary
): void {
  if (!villageId || !date || !data) return;

  if (!isTodayDate(date)) {
    return;
  }

  const cleanVillageId = villageId.trim();
  const todayStr = getTodayDateStr();

  // 1. Update in-memory L1 cache
  todayCollectionsMemoryCache = {
    villageId: cleanVillageId,
    date: todayStr,
    data,
  };

  // 2. Write to SQLite
  try {
    const database = getDb();
    if (!database) return;

    purgeOldReportsCache();

    const json = JSON.stringify(data);
    const now = Date.now();

    database.runSync(
      `INSERT OR REPLACE INTO manager_collections_cache (village_id, collection_date, data_json, updated_at)
       VALUES (?, ?, ?, ?)`,
      [cleanVillageId, todayStr, json, now]
    );
  } catch (err) {
    console.warn('[ManagerCache] Error saving cached collections summary:', err);
  }
}
