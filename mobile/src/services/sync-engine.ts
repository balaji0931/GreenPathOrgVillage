/**
 * Background Sync Engine
 *
 * Runs silently in the background. The collector never sees or waits for this.
 * Picks up QUEUED/FAILED records from SQLite and:
 *   1. Uploads photo (if present) → gets URL
 *   2. Uploads voice (if present) → gets URL
 *   3. POST /api/waste-collections with all data
 *   4. Marks record CONFIRMED or FAILED
 *
 * Triggers:
 * - On app launch (reset stale SYNCING → QUEUED, then sync)
 * - On network reconnect
 * - After each new collection is enqueued
 * - Periodic interval (every 30 seconds while pending records exist)
 *
 * Concurrency: processes ONE record at a time to avoid overwhelming
 * the server and to keep photo uploads sequential.
 *
 * Error handling (production-ready):
 * - Network errors (DNS, TLS, no connectivity): leave record as QUEUED,
 *   do NOT increment attempt count. Will retry on next cycle.
 * - Server errors (4xx/5xx): mark FAILED, increment attempt count.
 *   After 5 attempts, stop retrying (manual retry via UI).
 * - Auth errors (401): leave as QUEUED, will retry after token refresh.
 */
import {
  getPendingRecords,
  markSyncing,
  markConfirmed,
  markFailed,
  resetStaleSync,
  resetToQueued,
  getQueueStats,
  cleanupOldRecords,
  getQueuedWasteLogs,
  syncAllQueuedWasteLogs,
  type QueuedCollection,
} from './offline-queue';
import { uploadPhoto, uploadVoice } from '../api/upload.api';
import { submitCollectionRaw } from '../api/collector.api';
import { NetworkError } from '../api/client';

// ── State ──────────────────────────────────────────────────────

let isSyncing = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let onStatsChangeCallback: ((stats: ReturnType<typeof getQueueStats>) => void) | null = null;

// ── Public API ─────────────────────────────────────────────────

/**
 * Initialize the sync engine. Call once on app launch.
 */
export function initSyncEngine(): void {
  // Reset any records stuck in SYNCING (app crashed mid-sync)
  resetStaleSync();

  // Start periodic sync
  startPeriodicSync();

  // Trigger initial sync
  triggerSync();
}

/**
 * Trigger a sync cycle. Safe to call multiple times — will
 * skip if already syncing.
 */
export function triggerSync(): void {
  if (isSyncing) return;
  processQueue();
}

/**
 * Register a callback for stats changes (for UI badges).
 */
export function onSyncStatsChange(cb: (stats: ReturnType<typeof getQueueStats>) => void): () => void {
  onStatsChangeCallback = cb;
  // Emit current stats immediately
  cb(getQueueStats());
  return () => { onStatsChangeCallback = null; };
}

/**
 * Stop the sync engine (on logout).
 */
export function stopSyncEngine(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  isSyncing = false;
}

/**
 * Check if the sync engine is actively processing records.
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

// ── Internal ───────────────────────────────────────────────────

function startPeriodicSync(): void {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    const stats = getQueueStats();
    const queuedWaste = getQueuedWasteLogs();
    if (stats.queued > 0 || stats.failed > 0 || queuedWaste.length > 0) {
      triggerSync();
    }
    // Cleanup old confirmed records once a day-ish
    if (stats.confirmed > 50) {
      cleanupOldRecords();
    }
  }, 30_000); // Every 30 seconds
}

function notifyStatsChange(): void {
  if (onStatsChangeCallback) {
    try {
      onStatsChangeCallback(getQueueStats());
    } catch {}
  }
}

/**
 * Detect if an error is a transient network issue (should retry without
 * counting as a failure) vs a definitive server error (should count).
 */
function isNetworkError(err: any): boolean {
  // Our explicit NetworkError from client.ts / upload.api.ts
  if (err instanceof NetworkError) return true;
  // React Native fetch throws TypeError for network failures
  if (err instanceof TypeError) return true;
  // Common error messages from various Android network stacks
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('could not connect') ||
    msg.includes('unable to resolve host') ||
    msg.includes('failed to connect') ||
    msg.includes('socket') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('dns') ||
    msg.includes('tls') ||
    msg.includes('ssl') ||
    msg.includes('certificate') ||
    msg.includes('could not configure') ||
    msg.includes('could not decode')
  );
}

async function processQueue(): Promise<void> {
  isSyncing = true;
  notifyStatsChange();

  try {
    // Also sync any queued waste logs silently in background
    await syncAllQueuedWasteLogs().catch(() => {});

    const pending = getPendingRecords();
    if (pending.length === 0) {
      isSyncing = false;
      notifyStatsChange();
      return;
    }

    // Process one at a time
    for (const record of pending) {
      await syncOneRecord(record);
      notifyStatsChange();
    }
  } catch {
    // Top-level catch — don't let sync engine crash
  } finally {
    isSyncing = false;
    notifyStatsChange();
  }
}

async function syncOneRecord(record: QueuedCollection): Promise<void> {
  markSyncing(record.id);

  try {
    let photoUrl = record.photoUrl || '';
    let voiceUrl = record.voiceUrl || '';

    // 1. Upload photo if present and not yet uploaded
    if (record.photoLocalPath && !photoUrl) {
      photoUrl = await uploadPhoto(record.photoLocalPath);
    }

    // 2. Upload voice if present and not yet uploaded
    if (record.voiceLocalPath && !voiceUrl) {
      voiceUrl = await uploadVoice(record.voiceLocalPath);
    }

    // 3. Submit to server
    const wasteTypes = JSON.parse(record.wasteTypes || '[]');
    const result = await submitCollectionRaw({
      clientRequestId: record.clientRequestId,
      householdUid: record.householdUid,
      status: record.status,
      missedReason: record.missedReason || undefined,
      segregationRating: record.segregationRating,
      wasteTypes,
      weightKg: record.weightKg || undefined,
      photoUrl: photoUrl || undefined,
      voiceUrl: voiceUrl || undefined,
      remarks: record.remarks || undefined,
      collectionDate: record.collectionDate,
    });

    // 4. Success — mark confirmed
    markConfirmed(record.id, photoUrl, voiceUrl);
  } catch (err: any) {
    if (isNetworkError(err)) {
      // ── TRANSIENT NETWORK ERROR ──
      // Reset to QUEUED without incrementing attempt count.
      // The next sync cycle (30 seconds) will try again.
      resetToQueued(record.id);
      return;
    }

    if (err?.status === 401) {
      // ── AUTH EXPIRED ──
      // Reset to QUEUED — the auth layer will refresh the token,
      // and the next sync cycle will retry with a fresh token.
      resetToQueued(record.id);
      return;
    }

    // ── DEFINITIVE SERVER ERROR (4xx/5xx) ──
    // This is a real failure (bad data, conflict, server bug).
    // Count it toward the 5-attempt limit.
    const message = err?.message || 'Unknown sync error';
    markFailed(record.id, message);
  }
}
