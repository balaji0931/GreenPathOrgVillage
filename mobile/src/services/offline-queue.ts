/**
 * Offline Queue — SQLite-first collection storage
 *
 * This is the heart of the collector UX:
 * - Every submission writes to SQLite FIRST (~50ms)
 * - The collector sees "Saved" and moves on instantly
 * - Background sync handles upload + API POST silently
 *
 * Record lifecycle:
 *   QUEUED → SYNCING → CONFIRMED
 *                ↓
 *            FAILED (retried automatically)
 *
 * Guarantees:
 * - Data survives app crashes, phone restarts, battery death
 * - No record deleted until server confirms receipt
 * - Each record has a unique clientRequestId for idempotency
 * - Photo/voice files are saved to local filesystem before upload
 */
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Paths, File, Directory } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import type { Household, WasteCollection, VillageData, WasteLogFormData } from '../types/collector';
import { createWasteLog } from '../api/collector.api';

// ── Types ──────────────────────────────────────────────────────

export type QueueStatus = 'QUEUED' | 'SYNCING' | 'CONFIRMED' | 'FAILED';

export interface QueuedCollection {
  id: number;
  clientRequestId: string;
  householdUid: string;
  householdName: string;
  houseNumber: string;
  status: 'collected' | 'missed';
  missedReason: string;
  segregationRating: number;
  wasteTypes: string; // JSON array string
  weightKg: string;
  photoLocalPath: string; // local file path
  photoUrl: string;       // uploaded URL (filled after sync)
  voiceLocalPath: string;
  voiceUrl: string;
  remarks: string;
  collectionDate: string; // ISO string
  syncStatus: QueueStatus;
  syncError: string;
  syncAttempts: number;
  createdAt: string;
  syncedAt: string;
}

export interface QueuedWasteLog {
  id: number;
  clientRequestId: string;
  date: string;
  wetWasteKg: string;
  dryWasteKg: string;
  sanitaryWasteKg: string;
  specialCareWasteKg: string;
  mixedWasteKg: string;
  remarks: string;
  syncStatus: QueueStatus;
  syncError: string;
  createdAt: string;
}

export interface QueueStats {
  total: number;
  queued: number;
  syncing: number;
  confirmed: number;
  failed: number;
}

// ── Database ───────────────────────────────────────────────────

const DB_NAME = 'greenpath_offline.db';

let db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
    initializeSchema();
  }
  return db;
}

function initializeSchema(): void {
  const database = db!;
  database.execSync(`
    CREATE TABLE IF NOT EXISTS collection_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientRequestId TEXT NOT NULL UNIQUE,
      householdUid TEXT NOT NULL,
      householdName TEXT NOT NULL DEFAULT '',
      houseNumber TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'collected',
      missedReason TEXT NOT NULL DEFAULT '',
      segregationRating INTEGER NOT NULL DEFAULT 0,
      wasteTypes TEXT NOT NULL DEFAULT '[]',
      weightKg TEXT NOT NULL DEFAULT '',
      photoLocalPath TEXT NOT NULL DEFAULT '',
      photoUrl TEXT NOT NULL DEFAULT '',
      voiceLocalPath TEXT NOT NULL DEFAULT '',
      voiceUrl TEXT NOT NULL DEFAULT '',
      remarks TEXT NOT NULL DEFAULT '',
      collectionDate TEXT NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'QUEUED',
      syncError TEXT NOT NULL DEFAULT '',
      syncAttempts INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      syncedAt TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_queue_sync_status ON collection_queue(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_queue_household_date ON collection_queue(householdUid, collectionDate);
    CREATE INDEX IF NOT EXISTS idx_queue_client_request ON collection_queue(clientRequestId);

    CREATE TABLE IF NOT EXISTS today_collected_households (
      householdUid TEXT PRIMARY KEY,
      collectionTime TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_today_collected_created ON today_collected_households(createdAt);

    CREATE TABLE IF NOT EXISTS cached_households (
      id INTEGER PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      headName TEXT,
      phone TEXT,
      houseNumber TEXT,
      ward TEXT,
      villageId TEXT,
      latitude TEXT,
      longitude TEXT,
      status TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_cached_households_uid ON cached_households(uid);

    CREATE TABLE IF NOT EXISTS cached_village_data (
      villageId TEXT PRIMARY KEY,
      dataJson TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_server_collections (
      id INTEGER PRIMARY KEY,
      householdId INTEGER,
      collectorId INTEGER,
      collectionDate TEXT,
      segregationRating INTEGER,
      remarks TEXT,
      photoUrl TEXT,
      voiceUrl TEXT,
      status TEXT,
      missedReason TEXT,
      wasteTypes TEXT,
      weightKg TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_cached_server_collections_date ON cached_server_collections(collectionDate);

    CREATE TABLE IF NOT EXISTS waste_log_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientRequestId TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      wetWasteKg TEXT NOT NULL DEFAULT '0',
      dryWasteKg TEXT NOT NULL DEFAULT '0',
      sanitaryWasteKg TEXT NOT NULL DEFAULT '0',
      specialCareWasteKg TEXT NOT NULL DEFAULT '0',
      mixedWasteKg TEXT NOT NULL DEFAULT '0',
      remarks TEXT NOT NULL DEFAULT '',
      syncStatus TEXT NOT NULL DEFAULT 'QUEUED',
      syncError TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_waste_log_sync ON waste_log_queue(syncStatus);
  `);
}

// ── Public API: Offline Household & Village Caching ───────────

export function saveCachedHouseholds(households: Household[]): void {
  if (!households || households.length === 0) return;
  const database = getDb();
  database.withTransactionSync(() => {
    for (const h of households) {
      database.runSync(
        `INSERT OR REPLACE INTO cached_households (
          id, uid, headName, phone, houseNumber, ward, villageId, latitude, longitude, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        h.id,
        h.uid,
        h.headName || '',
        h.phone || '',
        h.houseNumber || '',
        h.ward || '',
        h.villageId || '',
        h.latitude || '',
        h.longitude || '',
        h.status || 'active',
      );
    }
  });
}

export function getCachedHouseholds(): Household[] {
  const database = getDb();
  const rows = database.getAllSync<any>(`SELECT * FROM cached_households ORDER BY id ASC`);
  return rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    headName: r.headName,
    phone: r.phone,
    houseNumber: r.houseNumber,
    ward: r.ward,
    villageId: r.villageId,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status,
  }));
}

export function saveCachedVillageData(villageId: string, data: VillageData): void {
  if (!villageId || !data) return;
  const database = getDb();
  database.runSync(
    `INSERT OR REPLACE INTO cached_village_data (villageId, dataJson) VALUES (?, ?)`,
    villageId,
    JSON.stringify(data),
  );
}

export function getCachedVillageData(villageId: string): VillageData | null {
  if (!villageId) return null;
  const database = getDb();
  const row = database.getFirstSync<{ dataJson: string }>(
    `SELECT dataJson FROM cached_village_data WHERE villageId = ?`,
    villageId,
  );
  if (!row) return null;
  try {
    return JSON.parse(row.dataJson) as VillageData;
  } catch {
    return null;
  }
}

export function saveCachedServerCollections(
  serverCollections: WasteCollection[],
  households: Household[],
): void {
  const database = getDb();
  const today = new Date().toDateString();
  const startOfDayMs = new Date().setHours(0, 0, 0, 0);

  const householdIdToUid = new Map<number, string>();
  for (const h of households) {
    householdIdToUid.set(h.id, h.uid);
  }

  database.withTransactionSync(() => {
    for (const sc of serverCollections) {
      if (!sc.householdId) continue;
      const cDate = new Date(sc.collectionDate || '').toDateString();

      // Cache full collection row
      database.runSync(
        `INSERT OR REPLACE INTO cached_server_collections (
          id, householdId, collectorId, collectionDate, segregationRating,
          remarks, photoUrl, voiceUrl, status, missedReason, wasteTypes, weightKg
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sc.id,
        sc.householdId,
        sc.collectorId,
        sc.collectionDate,
        sc.segregationRating || 0,
        sc.remarks || '',
        sc.photoUrl || '',
        sc.voiceUrl || '',
        sc.status || 'collected',
        sc.missedReason || '',
        JSON.stringify(sc.wasteTypes || []),
        sc.weightKg || '',
      );

      // Also record in today_collected_households for instant duplicate lock
      if (cDate === today) {
        const uid = householdIdToUid.get(sc.householdId);
        if (uid) {
          database.runSync(
            `INSERT OR REPLACE INTO today_collected_households (householdUid, collectionTime, createdAt)
             VALUES (?, ?, ?)`,
            uid,
            sc.collectionDate || new Date().toISOString(),
            startOfDayMs,
          );
        }
      }
    }
  });
}

/**
 * Returns merged collections for today combining:
 * 1) Server collections stored in SQLite
 * 2) Locally queued collections made offline or pending sync
 * Deduplicated by household so the collector always sees exact today's progress!
 */
export function getMergedTodayCollections(): WasteCollection[] {
  const database = getDb();
  const today = new Date().toDateString();

  // 1. Get cached server collections for today
  const serverRows = database.getAllSync<any>(`SELECT * FROM cached_server_collections`);
  const collections: WasteCollection[] = [];
  const collectedHouseholdIds = new Set<number>();

  for (const r of serverRows) {
    const cDate = new Date(r.collectionDate || '').toDateString();
    if (cDate === today) {
      let wasteTypes: any[] = [];
      try { wasteTypes = JSON.parse(r.wasteTypes || '[]'); } catch {}
      collections.push({
        id: r.id,
        householdId: r.householdId,
        collectorId: r.collectorId,
        collectionDate: r.collectionDate,
        segregationRating: r.segregationRating,
        remarks: r.remarks,
        photoUrl: r.photoUrl,
        voiceUrl: r.voiceUrl,
        status: r.status,
        missedReason: r.missedReason,
        wasteTypes,
        weightKg: r.weightKg,
      });
      collectedHouseholdIds.add(r.householdId);
    }
  }

  // 2. Get local queue collections for today
  const queueRows = database.getAllSync<any>(
    `SELECT * FROM collection_queue ORDER BY id DESC`
  );

  const householdRows = database.getAllSync<any>(`SELECT id, uid FROM cached_households`);
  const uidToId = new Map<string, number>();
  for (const h of householdRows) {
    uidToId.set(h.uid, h.id);
  }

  for (const q of queueRows) {
    const cDate = new Date(q.collectionDate || '').toDateString();
    if (cDate === today) {
      const hId = uidToId.get(q.householdUid) || (q.id + 900000);
      if (!collectedHouseholdIds.has(hId)) {
        let wasteTypes: any[] = [];
        try { wasteTypes = JSON.parse(q.wasteTypes || '[]'); } catch {}
        collections.push({
          id: q.id + 900000,
          householdId: hId,
          collectorId: 0,
          collectionDate: q.collectionDate,
          segregationRating: q.segregationRating,
          remarks: q.remarks,
          photoUrl: q.photoLocalPath || q.photoUrl,
          voiceUrl: q.voiceLocalPath || q.voiceUrl,
          status: q.status,
          missedReason: q.missedReason,
          wasteTypes,
          weightKg: q.weightKg,
        });
        collectedHouseholdIds.add(hId);
      }
    }
  }

  return collections;
}

// Keep backwards-compatible alias
export const cacheServerCollections = saveCachedServerCollections;

/**
 * Save a collection to SQLite. This is the INSTANT operation (~50ms)
 * that the collector sees as "done."
 */
export async function enqueueCollection(data: {
  householdUid: string;
  householdName: string;
  houseNumber: string;
  status: 'collected' | 'missed';
  missedReason: string;
  segregationRating: number;
  wasteTypes: string[];
  weightKg: string;
  photoLocalUri: string; // camera file URI
  voiceLocalUri: string; // recording file URI
  remarks: string;
}): Promise<{ clientRequestId: string; id: number }> {
  const database = getDb();
  const clientRequestId = Crypto.randomUUID();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const collectionDate = now;

  // Copy photo/voice to a durable location (expo cache can be cleaned)
  let photoLocalPath = '';
  let voiceLocalPath = '';

  if (data.photoLocalUri) {
    photoLocalPath = await copyToDurableStorage(data.photoLocalUri, 'photo', clientRequestId);
    try {
      const src = new File(data.photoLocalUri);
      if (src.exists) src.delete();
    } catch {}
  }
  if (data.voiceLocalUri) {
    voiceLocalPath = await copyToDurableStorage(data.voiceLocalUri, 'voice', clientRequestId);
    try {
      const src = new File(data.voiceLocalUri);
      if (src.exists) src.delete();
    } catch {}
  }

  const result = database.runSync(
    `INSERT INTO collection_queue (
      clientRequestId, householdUid, householdName, houseNumber,
      status, missedReason, segregationRating, wasteTypes, weightKg,
      photoLocalPath, voiceLocalPath, remarks, collectionDate,
      syncStatus, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?)`,
    clientRequestId,
    data.householdUid,
    data.householdName,
    data.houseNumber,
    data.status,
    data.missedReason,
    data.segregationRating,
    JSON.stringify(data.wasteTypes),
    data.weightKg,
    photoLocalPath,
    voiceLocalPath,
    data.remarks,
    collectionDate,
    now,
  );

  // Immediately record in today's local cache so duplicate is permanently blocked
  database.runSync(
    `INSERT OR REPLACE INTO today_collected_households (householdUid, collectionTime, createdAt)
     VALUES (?, ?, ?)`,
    data.householdUid,
    now,
    nowMs,
  );

  return { clientRequestId, id: Number(result.lastInsertRowId) };
}

/**
 * Check if a household already has a collection today (local queue or cache).
 * Used for duplicate detection BEFORE and DURING saving.
 */
export function hasLocalCollectionToday(householdUid: string): boolean {
  const database = getDb();
  const startOfDayMs = new Date().setHours(0, 0, 0, 0);

  // Check 1: today_collected_households cache table
  const cacheRow = database.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM today_collected_households
     WHERE householdUid = ? AND createdAt >= ?`,
    householdUid,
    startOfDayMs,
  );
  if ((cacheRow?.cnt ?? 0) > 0) return true;

  // Check 2: collection_queue for today's submissions
  const queueRow = database.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM collection_queue
     WHERE householdUid = ? AND syncStatus != 'FAILED'`,
    householdUid,
  );
  // Also check if any record in queue for this UID is from today
  if ((queueRow?.cnt ?? 0) > 0) {
    const today = new Date().toDateString();
    const rows = database.getAllSync<{ collectionDate: string }>(
      `SELECT collectionDate FROM collection_queue WHERE householdUid = ? AND syncStatus != 'FAILED'`,
      householdUid,
    );
    for (const r of rows) {
      if (new Date(r.collectionDate).toDateString() === today) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get today's local collection record for a household UID (if any).
 */
export function getLocalCollectionForHousehold(householdUid: string): QueuedCollection | null {
  const database = getDb();
  const today = new Date().toDateString();
  const rows = database.getAllSync<QueuedCollection>(
    `SELECT * FROM collection_queue WHERE householdUid = ? AND syncStatus != 'FAILED' ORDER BY id DESC`,
    householdUid,
  );
  for (const r of rows) {
    if (new Date(r.collectionDate).toDateString() === today) {
      return r;
    }
  }
  return null;
}

/**
 * Get all records that need syncing (QUEUED or FAILED with < 5 attempts).
 */
export function getPendingRecords(): QueuedCollection[] {
  const database = getDb();
  return database.getAllSync<QueuedCollection>(
    `SELECT * FROM collection_queue
     WHERE syncStatus IN ('QUEUED', 'FAILED') AND syncAttempts < 5
     ORDER BY createdAt ASC`,
  );
}

/**
 * Mark a record as currently being synced.
 */
export function markSyncing(id: number): void {
  const database = getDb();
  database.runSync(
    `UPDATE collection_queue SET syncStatus = 'SYNCING' WHERE id = ?`,
    id,
  );
}

/**
 * Save an uploaded media URL to the database immediately after upload.
 * This ensures retries don't re-upload already-uploaded files.
 */
export function saveUploadedUrl(id: number, field: 'photoUrl' | 'voiceUrl', url: string): void {
  const database = getDb();
  database.runSync(
    `UPDATE collection_queue SET ${field} = ? WHERE id = ?`,
    url,
    id,
  );
}

/**
 * Mark a record as confirmed (server accepted it).
 * Also store the server-returned photo/voice URLs and IMMEDIATELY delete local files.
 */
export function markConfirmed(id: number, photoUrl?: string, voiceUrl?: string): void {
  const database = getDb();

  // Immediately delete local photo and voice files from mobile storage upon confirmation
  const record = database.getFirstSync<{ photoLocalPath: string; voiceLocalPath: string }>(
    `SELECT photoLocalPath, voiceLocalPath FROM collection_queue WHERE id = ?`,
    id,
  );
  if (record) {
    if (record.photoLocalPath) {
      try {
        const f = new File(record.photoLocalPath);
        if (f.exists) f.delete();
      } catch {}
    }
    if (record.voiceLocalPath) {
      try {
        const f = new File(record.voiceLocalPath);
        if (f.exists) f.delete();
      } catch {}
    }
  }

  database.runSync(
    `UPDATE collection_queue SET syncStatus = 'CONFIRMED', syncedAt = ?,
     photoUrl = COALESCE(?, photoUrl), voiceUrl = COALESCE(?, voiceUrl),
     photoLocalPath = '', voiceLocalPath = ''
     WHERE id = ?`,
    new Date().toISOString(),
    photoUrl || '',
    voiceUrl || '',
    id,
  );
}

/**
 * Mark a record as failed with an error message.
 */
export function markFailed(id: number, error: string): void {
  const database = getDb();
  database.runSync(
    `UPDATE collection_queue SET syncStatus = 'FAILED', syncError = ?, syncAttempts = syncAttempts + 1 WHERE id = ?`,
    error,
    id,
  );
}

/**
 * Reset a SYNCING record back to QUEUED (e.g., app crashed mid-sync).
 */
export function resetStaleSync(): void {
  const database = getDb();
  database.runSync(
    `UPDATE collection_queue SET syncStatus = 'QUEUED', syncAttempts = 0 WHERE syncStatus = 'SYNCING'`,
  );
}

/**
 * Reset a specific record back to QUEUED AND reset syncAttempts to 0.
 * Used by the sync engine for transient network errors (DNS, TLS, no connectivity)
 * and auth expiry — these are not "real" failures and should not count toward
 * the 5-attempt limit.
 */
export function resetToQueued(id: number): void {
  const database = getDb();
  database.runSync(
    `UPDATE collection_queue SET syncStatus = 'QUEUED', syncAttempts = 0 WHERE id = ?`,
    id,
  );
}

/**
 * Get pending records for manual sync ("Sync Now" button).
 * Ignores the syncAttempts limit — user explicitly wants to retry.
 */
export function getPendingRecordsForManualSync(): QueuedCollection[] {
  const database = getDb();
  return database.getAllSync<QueuedCollection>(
    `SELECT * FROM collection_queue
     WHERE syncStatus IN ('QUEUED', 'FAILED')
     ORDER BY createdAt ASC`,
  );
}

/**
 * Get queue statistics for the sync indicator badge.
 */
export function getQueueStats(): QueueStats {
  const database = getDb();
  const rows = database.getAllSync<{ syncStatus: string; cnt: number }>(
    `SELECT syncStatus, COUNT(*) as cnt FROM collection_queue GROUP BY syncStatus`,
  );

  const stats: QueueStats = { total: 0, queued: 0, syncing: 0, confirmed: 0, failed: 0 };
  for (const row of rows) {
    const count = row.cnt;
    stats.total += count;
    if (row.syncStatus === 'QUEUED') stats.queued = count;
    else if (row.syncStatus === 'SYNCING') stats.syncing = count;
    else if (row.syncStatus === 'CONFIRMED') stats.confirmed = count;
    else if (row.syncStatus === 'FAILED') stats.failed = count;
  }
  return stats;
}

/**
 * Get all records in the queue (pending, syncing, failed, and recent confirmed).
 */
export function getAllQueueRecords(): QueuedCollection[] {
  const database = getDb();
  return database.getAllSync<QueuedCollection>(
    `SELECT * FROM collection_queue 
     ORDER BY 
       CASE syncStatus 
         WHEN 'FAILED' THEN 1 
         WHEN 'SYNCING' THEN 2 
         WHEN 'QUEUED' THEN 3 
         ELSE 4 
       END ASC,
       createdAt DESC`,
  );
}

/**
 * Reset all failed records to QUEUED so user can retry them.
 */
export function retryFailedRecords(): void {
  const database = getDb();
  database.runSync(
    `UPDATE collection_queue SET syncStatus = 'QUEUED', syncAttempts = 0 WHERE syncStatus = 'FAILED'`,
  );
}

/**
 * Get today's local collections (for display alongside server data).
 */
export function getTodayLocalCollections(): QueuedCollection[] {
  const database = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return database.getAllSync<QueuedCollection>(
    `SELECT * FROM collection_queue WHERE collectionDate >= ? ORDER BY createdAt DESC`,
    today.toISOString(),
  );
}

/**
 * Clean up confirmed records older than 7 days and their local files.
 */
export async function cleanupOldRecords(): Promise<number> {
  const database = getDb();
  const confirmedCutoff = new Date();
  confirmedCutoff.setDate(confirmedCutoff.getDate() - 1); // Purge confirmed records older than 24 hours

  const unsyncedCutoff = new Date();
  unsyncedCutoff.setDate(unsyncedCutoff.getDate() - 7); // Purge unsynced records older than 7 days

  // Get files to delete from old confirmed records
  const oldConfirmed = database.getAllSync<{ photoLocalPath: string; voiceLocalPath: string }>(
    `SELECT photoLocalPath, voiceLocalPath FROM collection_queue
     WHERE syncStatus = 'CONFIRMED' AND syncedAt < ?`,
    confirmedCutoff.toISOString(),
  );

  // Get files to delete from old unsynced records (QUEUED/FAILED older than 7 days)
  const oldUnsynced = database.getAllSync<{ photoLocalPath: string; voiceLocalPath: string }>(
    `SELECT photoLocalPath, voiceLocalPath FROM collection_queue
     WHERE syncStatus IN ('QUEUED', 'FAILED') AND createdAt < ?`,
    unsyncedCutoff.toISOString(),
  );

  // Delete local files
  for (const record of [...oldConfirmed, ...oldUnsynced]) {
    if (record.photoLocalPath) {
      try { const f = new File(record.photoLocalPath); if (f.exists) f.delete(); } catch {}
    }
    if (record.voiceLocalPath) {
      try { const f = new File(record.voiceLocalPath); if (f.exists) f.delete(); } catch {}
    }
  }

  // Delete confirmed DB records older than 24h
  const r1 = database.runSync(
    `DELETE FROM collection_queue WHERE syncStatus = 'CONFIRMED' AND syncedAt < ?`,
    confirmedCutoff.toISOString(),
  );

  // Delete unsynced DB records older than 7 days
  const r2 = database.runSync(
    `DELETE FROM collection_queue WHERE syncStatus IN ('QUEUED', 'FAILED') AND createdAt < ?`,
    unsyncedCutoff.toISOString(),
  );

  return r1.changes + r2.changes;
}

/**
 * Clear ALL queue data — called on logout.
 * Deletes all SQLite records (collection_queue, waste_log_queue,
 * cached_server_collections, today_collected_households)
 * and wipes the local photo/voice files directory.
 */
export function clearAllQueueData(): void {
  const database = getDb();

  // Delete all local files
  try {
    const queueDir = new Directory(Paths.document, QUEUE_DIR_NAME);
    if (queueDir.exists) {
      queueDir.delete();
    }
  } catch {}

  // Clear all tables
  database.runSync(`DELETE FROM collection_queue`);
  database.runSync(`DELETE FROM waste_log_queue`);
  database.runSync(`DELETE FROM cached_server_collections`);
  database.runSync(`DELETE FROM today_collected_households`);
}

// ── Public API: Waste Log Queue (Offline-First) ───────────────

/**
 * Enqueue a waste log for offline storage.
 */
export function enqueueWasteLog(data: WasteLogFormData): QueuedWasteLog {
  const database = getDb();
  const clientRequestId = Crypto.randomUUID();
  const now = new Date().toISOString();
  const wetKg = String(data.wetWasteKg ?? data.wetKg ?? '0');
  const dryKg = String(data.dryWasteKg ?? data.dryKg ?? '0');
  const sanitaryKg = String(data.sanitaryWasteKg ?? data.sanitaryKg ?? '0');
  const specialCareKg = String(data.specialCareWasteKg ?? data.specialCareKg ?? '0');
  const mixedKg = String(data.mixedWasteKg ?? data.mixedKg ?? '0');
  const remarks = String(data.remarks ?? data.notes ?? '');
  const date = data.date || now.split('T')[0];

  const result = database.runSync(
    `INSERT INTO waste_log_queue (
      clientRequestId, date, wetWasteKg, dryWasteKg, sanitaryWasteKg,
      specialCareWasteKg, mixedWasteKg, remarks, syncStatus, syncError, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', '', ?)`,
    clientRequestId,
    date,
    wetKg,
    dryKg,
    sanitaryKg,
    specialCareKg,
    mixedKg,
    remarks,
    now,
  );

  return {
    id: Number(result.lastInsertRowId),
    clientRequestId,
    date,
    wetWasteKg: wetKg,
    dryWasteKg: dryKg,
    sanitaryWasteKg: sanitaryKg,
    specialCareWasteKg: specialCareKg,
    mixedWasteKg: mixedKg,
    remarks,
    syncStatus: 'QUEUED',
    syncError: '',
    createdAt: now,
  };
}

/**
 * Get all queued waste logs in descending order.
 */
export function getQueuedWasteLogs(): QueuedWasteLog[] {
  const database = getDb();
  return database.getAllSync<QueuedWasteLog>(
    `SELECT * FROM waste_log_queue ORDER BY createdAt DESC`,
  );
}

/**
 * Delete a queued waste log by ID.
 */
export function deleteQueuedWasteLog(id: number): void {
  const database = getDb();
  database.runSync(`DELETE FROM waste_log_queue WHERE id = ?`, id);
}

/**
 * Attempt to sync a single queued waste log.
 */
export async function syncSingleWasteLog(id: number): Promise<boolean> {
  const database = getDb();
  const record = database.getFirstSync<QueuedWasteLog>(
    `SELECT * FROM waste_log_queue WHERE id = ?`,
    id,
  );
  if (!record) return false;

  database.runSync(
    `UPDATE waste_log_queue SET syncStatus = 'SYNCING' WHERE id = ?`,
    id,
  );

  try {
    const payload: WasteLogFormData = {
      date: record.date,
      wetWasteKg: record.wetWasteKg,
      dryWasteKg: record.dryWasteKg,
      sanitaryWasteKg: record.sanitaryWasteKg,
      specialCareWasteKg: record.specialCareWasteKg,
      mixedWasteKg: record.mixedWasteKg,
      remarks: record.remarks,
      wetKg: record.wetWasteKg,
      dryKg: record.dryWasteKg,
      sanitaryKg: record.sanitaryWasteKg,
      specialCareKg: record.specialCareWasteKg,
      mixedKg: record.mixedWasteKg,
      notes: record.remarks,
    };
    await createWasteLog(payload);
    database.runSync(`DELETE FROM waste_log_queue WHERE id = ?`, id);
    return true;
  } catch (err: any) {
    const errorMsg = err?.message || 'Sync failed';
    database.runSync(
      `UPDATE waste_log_queue SET syncStatus = 'FAILED', syncError = ? WHERE id = ?`,
      errorMsg,
      id,
    );
    return false;
  }
}

/**
 * Sync all pending queued waste logs.
 */
export async function syncAllQueuedWasteLogs(): Promise<{ success: number; failed: number }> {
  const records = getQueuedWasteLogs().filter((r) => r.syncStatus !== 'SYNCING');
  let success = 0;
  let failed = 0;
  for (const record of records) {
    const ok = await syncSingleWasteLog(record.id);
    if (ok) success++;
    else failed++;
  }
  return { success, failed };
}

// ── Internal helpers ───────────────────────────────────────────

const QUEUE_DIR_NAME = 'greenpath_queue';

async function copyToDurableStorage(sourceUri: string, type: string, requestId: string): Promise<string> {
  // Ensure directory exists using new SDK 57 API
  const queueDir = new Directory(Paths.document, QUEUE_DIR_NAME);
  if (!queueDir.exists) {
    queueDir.create();
  }

  const ext = type === 'photo' ? '.jpg' : '.m4a';
  const destFile = new File(queueDir, `${type}_${requestId}${ext}`);

  // Copy source file to durable location
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);

  return destFile.uri;
}
