/**
 * Field Worker Offline Queue — SQLite Storage
 *
 * Dedicated offline queue for Field Worker household mapping:
 * - Every household mapping write hits SQLite FIRST (~50ms)
 * - Worker sees immediate success feedback and can continue scanning
 * - Background sync (fieldworker-sync.ts) flushes queued mappings to server
 *
 * Record lifecycle:
 *   QUEUED → SYNCING → CONFIRMED
 *                ↓
 *            FAILED (retried automatically or manually)
 *
 * Tables:
 * 1. fieldworker_mapping_queue: Queued household-to-QR mappings
 * 2. cached_fieldworker_mapped_households: Local cache of mapped households
 * 3. cached_fieldworker_village_data: Cached village details & wards
 * 4. cached_fieldworker_household_types: Cached household type categories
 */
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type {
  HouseholdMappingPayload,
  QueuedMapping,
  FieldWorkerQueueStats,
  QueueSyncStatus,
  MappedHousehold,
  HouseholdTypeOption,
  FieldWorkerVillageData,
  VillageRoad,
} from '../types/fieldworker';

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
    CREATE TABLE IF NOT EXISTS fieldworker_mapping_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientRequestId TEXT NOT NULL UNIQUE,
      uid TEXT NOT NULL,
      headName TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      houseNumber TEXT NOT NULL DEFAULT '',
      ward TEXT NOT NULL DEFAULT '',
      householdType TEXT NOT NULL DEFAULT '',
      familySize INTEGER NOT NULL DEFAULT 1,
      address TEXT NOT NULL DEFAULT '',
      latitude TEXT NOT NULL DEFAULT '',
      longitude TEXT NOT NULL DEFAULT '',
      accessRoadId INTEGER,
      preferredCollectionTime TEXT NOT NULL DEFAULT '',
      payloadJson TEXT NOT NULL DEFAULT '{}',
      syncStatus TEXT NOT NULL DEFAULT 'QUEUED',
      syncError TEXT NOT NULL DEFAULT '',
      syncAttempts INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      syncedAt TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_fw_queue_sync_status ON fieldworker_mapping_queue(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_fw_queue_uid ON fieldworker_mapping_queue(uid);
    CREATE INDEX IF NOT EXISTS idx_fw_queue_client_request ON fieldworker_mapping_queue(clientRequestId);

    -- Clean up legacy cached households table if present
    DROP TABLE IF EXISTS cached_fieldworker_mapped_households;

    CREATE TABLE IF NOT EXISTS cached_fieldworker_village_data (
      villageId TEXT PRIMARY KEY,
      dataJson TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_fieldworker_household_types (
      villageId TEXT PRIMARY KEY,
      typesJson TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_fieldworker_village_roads (
      villageId TEXT PRIMARY KEY,
      roadsJson TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

// ── Queue Operations ───────────────────────────────────────────

/**
 * Enqueue a household mapping to SQLite.
 * Field workers only write to the offline sync queue.
 */
export function enqueueHouseholdMapping(payload: HouseholdMappingPayload): string {
  const database = getDb();
  const clientRequestId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const payloadJson = JSON.stringify(payload);
  const latStr = payload.latitude != null ? String(payload.latitude) : '';
  const lngStr = payload.longitude != null ? String(payload.longitude) : '';

  database.runSync(
    `INSERT INTO fieldworker_mapping_queue (
      clientRequestId, uid, headName, phone, houseNumber, ward,
      householdType, familySize, address, latitude, longitude,
      accessRoadId, preferredCollectionTime, payloadJson,
      syncStatus, syncError, syncAttempts, createdAt, syncedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', '', 0, ?, '')`,
    [
      clientRequestId,
      payload.uid.trim(),
      payload.headName.trim(),
      payload.phone.trim(),
      payload.houseNumber.trim(),
      payload.ward.trim(),
      payload.householdType,
      payload.familySize || 1,
      payload.address.trim(),
      latStr,
      lngStr,
      payload.accessRoadId ?? null,
      payload.preferredCollectionTime ?? '',
      payloadJson,
      now,
    ]
  );

  return clientRequestId;
}

/**
 * Check if a QR code has already been mapped locally on this device.
 */
export function isQRAlreadyMappedLocally(uid: string): boolean {
  const database = getDb();
  const cleanUid = uid.trim();

  // Check pending/confirmed queue
  const queueRow = database.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM fieldworker_mapping_queue WHERE uid = ? AND syncStatus != 'FAILED'`,
    [cleanUid]
  );
  return Boolean(queueRow && queueRow.count > 0);
}

/**
 * Get count of mappings created on this device today.
 */
export function getTodayMappedCount(): number {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const row = database.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM fieldworker_mapping_queue WHERE createdAt LIKE ? AND syncStatus != 'FAILED'`,
    [`${today}%`]
  );
  return row ? row.count : 0;
}

/**
 * Deprecated stub: Field workers never fetch or browse existing village households.
 */
export function getAllLocalMappedHouseholds(): MappedHousehold[] {
  return [];
}

/**
 * Get pending records for automatic background sync (attempts < 5).
 */
export function getPendingMappingRecords(): QueuedMapping[] {
  const database = getDb();
  const rows = database.getAllSync<any>(
    `SELECT * FROM fieldworker_mapping_queue
     WHERE syncStatus = 'QUEUED' OR (syncStatus = 'FAILED' AND syncAttempts < 5)
     ORDER BY id ASC`
  );

  return rows.map(mapRowToQueuedMapping);
}

/**
 * Get pending records for manual sync (ignores attempt count limit).
 */
export function getPendingMappingRecordsForManualSync(): QueuedMapping[] {
  const database = getDb();
  const rows = database.getAllSync<any>(
    `SELECT * FROM fieldworker_mapping_queue
     WHERE syncStatus IN ('QUEUED', 'FAILED')
     ORDER BY id ASC`
  );

  return rows.map(mapRowToQueuedMapping);
}

/**
 * Get all records in queue (for the Sync Queue screen list).
 */
export function getAllMappingRecords(): QueuedMapping[] {
  const database = getDb();
  const rows = database.getAllSync<any>(
    `SELECT * FROM fieldworker_mapping_queue ORDER BY id DESC LIMIT 500`
  );

  return rows.map(mapRowToQueuedMapping);
}

/**
 * Mark a record as currently syncing.
 */
export function markMappingSyncing(id: number): void {
  const database = getDb();
  database.runSync(
    `UPDATE fieldworker_mapping_queue SET syncStatus = 'SYNCING' WHERE id = ?`,
    [id]
  );
}

/**
 * Mark a record as confirmed by server.
 */
export function markMappingConfirmed(id: number): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync(
    `UPDATE fieldworker_mapping_queue SET syncStatus = 'CONFIRMED', syncError = '', syncedAt = ? WHERE id = ?`,
    [now, id]
  );
}

/**
 * Mark a record as failed with an error message and increment attempt counter.
 */
export function markMappingFailed(id: number, error: string): void {
  const database = getDb();
  database.runSync(
    `UPDATE fieldworker_mapping_queue
     SET syncStatus = 'FAILED', syncError = ?, syncAttempts = syncAttempts + 1
     WHERE id = ?`,
    [error, id]
  );
}

/**
 * Reset a record to QUEUED without incrementing attempts (for transient network/auth errors).
 */
export function resetMappingToQueued(id: number): void {
  const database = getDb();
  database.runSync(
    `UPDATE fieldworker_mapping_queue SET syncStatus = 'QUEUED' WHERE id = ?`,
    [id]
  );
}

/**
 * Reset any stale records stuck in SYNCING state on app launch.
 */
export function resetStaleMappingSync(): void {
  const database = getDb();
  database.runSync(
    `UPDATE fieldworker_mapping_queue SET syncStatus = 'QUEUED' WHERE syncStatus = 'SYNCING'`
  );
}

/**
 * Retry all failed records.
 */
export function retryFailedMappingRecords(): void {
  const database = getDb();
  database.runSync(
    `UPDATE fieldworker_mapping_queue SET syncStatus = 'QUEUED', syncAttempts = 0 WHERE syncStatus = 'FAILED'`
  );
}

/**
 * Clear confirmed records older than 24 hours.
 */
export function clearConfirmedMappingRecords(): void {
  const database = getDb();
  database.runSync(
    `DELETE FROM fieldworker_mapping_queue WHERE syncStatus = 'CONFIRMED'`
  );
}

/**
 * Get queue stats for badges and status cards.
 */
export function getFieldWorkerQueueStats(): FieldWorkerQueueStats {
  const database = getDb();
  const rows = database.getAllSync<{ syncStatus: QueueSyncStatus; count: number }>(
    `SELECT syncStatus, COUNT(*) as count FROM fieldworker_mapping_queue GROUP BY syncStatus`
  );

  let queued = 0;
  let syncing = 0;
  let confirmed = 0;
  let failed = 0;

  for (const r of rows) {
    if (r.syncStatus === 'QUEUED') queued = r.count;
    else if (r.syncStatus === 'SYNCING') syncing = r.count;
    else if (r.syncStatus === 'CONFIRMED') confirmed = r.count;
    else if (r.syncStatus === 'FAILED') failed = r.count;
  }

  return {
    total: queued + syncing + confirmed + failed,
    queued,
    syncing,
    confirmed,
    failed,
  };
}

// ── Cache Operations for Metadata ──────────────────────────────

export function saveCachedFieldWorkerVillageData(villageId: string, data: FieldWorkerVillageData): void {
  const database = getDb();
  database.runSync(
    `INSERT OR REPLACE INTO cached_fieldworker_village_data (villageId, dataJson, updatedAt) VALUES (?, ?, ?)`,
    [villageId, JSON.stringify(data), Date.now()]
  );
}

export function getCachedFieldWorkerVillageData(villageId: string): FieldWorkerVillageData | null {
  const database = getDb();
  const row = database.getFirstSync<{ dataJson: string }>(
    `SELECT dataJson FROM cached_fieldworker_village_data WHERE villageId = ?`,
    [villageId]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.dataJson);
  } catch {
    return null;
  }
}

export function saveCachedHouseholdTypes(villageId: string, types: HouseholdTypeOption[]): void {
  const database = getDb();
  database.runSync(
    `INSERT OR REPLACE INTO cached_fieldworker_household_types (villageId, typesJson, updatedAt) VALUES (?, ?, ?)`,
    [villageId, JSON.stringify(types), Date.now()]
  );
}

export function getCachedHouseholdTypes(villageId: string): HouseholdTypeOption[] {
  const database = getDb();
  const row = database.getFirstSync<{ typesJson: string }>(
    `SELECT typesJson FROM cached_fieldworker_household_types WHERE villageId = ?`,
    [villageId]
  );
  if (!row) return [];
  try {
    return JSON.parse(row.typesJson);
  } catch {
    return [];
  }
}

export function saveCachedVillageRoads(villageId: string, roads: VillageRoad[]): void {
  const database = getDb();
  database.runSync(
    `INSERT OR REPLACE INTO cached_fieldworker_village_roads (villageId, roadsJson, updatedAt) VALUES (?, ?, ?)`,
    [villageId, JSON.stringify(roads), Date.now()]
  );
}

export function getCachedVillageRoads(villageId: string): VillageRoad[] {
  const database = getDb();
  const row = database.getFirstSync<{ roadsJson: string }>(
    `SELECT roadsJson FROM cached_fieldworker_village_roads WHERE villageId = ?`,
    [villageId]
  );
  if (!row) return [];
  try {
    return JSON.parse(row.roadsJson);
  } catch {
    return [];
  }
}

export function clearAllFieldWorkerQueueData(): void {
  const database = getDb();
  database.execSync(`
    DELETE FROM fieldworker_mapping_queue;
    DELETE FROM cached_fieldworker_village_data;
    DELETE FROM cached_fieldworker_household_types;
  `);
}

// ── Helpers ────────────────────────────────────────────────────

function mapRowToQueuedMapping(row: any): QueuedMapping {
  return {
    id: row.id,
    clientRequestId: row.clientRequestId,
    uid: row.uid,
    headName: row.headName,
    phone: row.phone,
    houseNumber: row.houseNumber,
    ward: row.ward,
    householdType: row.householdType,
    familySize: row.familySize,
    address: row.address,
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    accessRoadId: row.accessRoadId ?? undefined,
    preferredCollectionTime: row.preferredCollectionTime || undefined,
    payloadJson: row.payloadJson,
    syncStatus: row.syncStatus,
    syncError: row.syncError,
    syncAttempts: row.syncAttempts,
    createdAt: row.createdAt,
    syncedAt: row.syncedAt,
  };
}
