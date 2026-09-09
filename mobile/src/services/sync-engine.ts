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
import { AppState, type NativeEventSubscription } from 'react-native';
import {
  getPendingRecords,
  getPendingRecordsForManualSync,
  markSyncing,
  markConfirmed,
  markFailed,
  resetStaleSync,
  resetToQueued,
  saveUploadedUrl,
  getQueueStats,
  cleanupOldRecords,
  getQueuedWasteLogs,
  syncAllQueuedWasteLogs,
  type QueuedCollection,
} from './offline-queue';
import { uploadPhoto, uploadVoice } from '../api/upload.api';
import { submitCollectionRaw } from '../api/collector.api';
import { NetworkError } from '../api/client';
import { File } from 'expo-file-system';

// ── State ──────────────────────────────────────────────────────

let isSyncing = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let onStatsChangeCallback: ((stats: ReturnType<typeof getQueueStats>) => void) | null = null;
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // Run daily cleanup every 12 hours

// ── Public API ─────────────────────────────────────────────────

/**
 * Initialize the sync engine. Call once on app launch.
 */
export function initSyncEngine(): void {
  // Reset any records stuck in SYNCING (app crashed mid-sync)
  resetStaleSync();

  // Listen for AppState changes: instantly wake up sync when returning to foreground
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        triggerSync();

        const now = Date.now();
        if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
          lastCleanupTime = now;
          runDailyCleanup().catch(() => {});
        }
      }
    });
  }

  // Start periodic sync
  startPeriodicSync();

  // Trigger initial sync
  triggerSync();

  // Run daily cleanup if due on launch
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    lastCleanupTime = now;
    runDailyCleanup().catch(() => {});
  }
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
 * Trigger a manual sync ("Sync Now" button). Ignores the attempt limit
 * and resets stuck records so they can be retried.
 */
export function triggerManualSync(): void {
  if (isSyncing) return;
  processQueue(true);
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
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  isSyncing = false;
}

/**
 * Check if the sync engine is actively processing records.
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Salvage unsynced collections that may be blocked due to photo or audio upload network failures.
 * Only called during daily cleanup before confirmed records are purged.
 * Tries uploading media once more. If photo or audio upload fails:
 * - Adds failure note to remarks:
 *   - Both failed: "Photo and audio failed to upload due to network issue"
 *   - Photo failed: "Photo failed to upload due to network issue"
 *   - Audio failed: "Audio failed to upload due to network issue"
 * - If any one succeeds, submits with that media URL and without failure note for that media.
 * - Submits the collection to preserve the core work record.
 */
export async function salvagePendingCollections(): Promise<void> {
  const pending = getPendingRecordsForManualSync();
  if (pending.length === 0) return;

  for (const record of pending) {
    try {
      let photoUrl = record.photoUrl || '';
      let voiceUrl = record.voiceUrl || '';
      let photoFailed = false;
      let voiceFailed = false;

      const hadPhoto = Boolean(record.photoLocalPath);
      const hadVoice = Boolean(record.voiceLocalPath);

      // 1. If photo was captured and not yet uploaded, try uploading once more
      if (hadPhoto && !photoUrl) {
        try {
          const photoFile = new File(record.photoLocalPath);
          if (photoFile.exists) {
            photoUrl = await uploadPhoto(record.photoLocalPath);
            saveUploadedUrl(record.id, 'photoUrl', photoUrl);
          } else {
            photoFailed = true;
          }
        } catch {
          photoFailed = true;
        }
      }

      // 2. If voice was recorded and not yet uploaded, try uploading once more
      if (hadVoice && !voiceUrl) {
        try {
          const voiceFile = new File(record.voiceLocalPath);
          if (voiceFile.exists) {
            voiceUrl = await uploadVoice(record.voiceLocalPath);
            saveUploadedUrl(record.id, 'voiceUrl', voiceUrl);
          } else {
            voiceFailed = true;
          }
        } catch {
          voiceFailed = true;
        }
      }

      // 3. Format remarks note according to user instructions
      let failureNote = '';
      if (photoFailed && voiceFailed) {
        failureNote = 'Photo and audio failed to upload due to network issue';
      } else if (photoFailed) {
        failureNote = 'Photo failed to upload due to network issue';
      } else if (voiceFailed) {
        failureNote = 'Audio failed to upload due to network issue';
      }

      const finalRemarks = [record.remarks, failureNote].filter(Boolean).join(' | ');

      // 4. Submit core collection to server (with whichever media succeeded, or without failing media)
      const wasteTypes = JSON.parse(record.wasteTypes || '[]');
      await submitCollectionRaw({
        clientRequestId: record.clientRequestId,
        householdUid: record.householdUid,
        status: record.status,
        missedReason: record.missedReason || undefined,
        segregationRating: record.segregationRating,
        wasteTypes,
        weightKg: record.weightKg || undefined,
        photoUrl: photoUrl || undefined,
        voiceUrl: voiceUrl || undefined,
        remarks: finalRemarks || undefined,
        collectionDate: record.collectionDate,
      });

      // 5. Mark confirmed (which also immediately deletes local media files from disk)
      markConfirmed(record.id, photoUrl, voiceUrl);
    } catch (err) {
      console.warn(`[SyncEngine] Salvage sync failed for record #${record.id}:`, err);
    }
  }
  notifyStatsChange();
}

/**
 * Daily / end-of-day cleanup:
 * 1. First, salvage any pending collections stuck on media uploads.
 * 2. Then, clean up confirmed records older than 24 hours and unsynced records older than 7 days.
 */
export async function runDailyCleanup(): Promise<void> {
  try {
    await salvagePendingCollections();
  } catch (e) {
    console.warn('[SyncEngine] Daily salvage failed:', e);
  }

  try {
    await cleanupOldRecords();
  } catch (e) {
    console.warn('[SyncEngine] Daily cleanup failed:', e);
  }
  notifyStatsChange();
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
    // Run daily cleanup (salvage + purge) every 12 hours
    const now = Date.now();
    if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
      lastCleanupTime = now;
      runDailyCleanup().catch(() => {});
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

async function processQueue(isManual: boolean = false): Promise<void> {
  isSyncing = true;
  notifyStatsChange();

  try {
    // Also sync any queued waste logs silently in background
    await syncAllQueuedWasteLogs().catch(() => {});

    const pending = isManual ? getPendingRecordsForManualSync() : getPendingRecords();
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
      try {
        const photoFile = new File(record.photoLocalPath);
        if (photoFile.exists) {
          photoUrl = await uploadPhoto(record.photoLocalPath);
          // Save URL to DB immediately so retries don't re-upload
          saveUploadedUrl(record.id, 'photoUrl', photoUrl);
        } else {
          console.warn(`[SyncEngine] Local photo file does not exist: ${record.photoLocalPath}, skipping photo`);
        }
      } catch (photoErr: any) {
        if (isNetworkError(photoErr)) throw photoErr;
        console.warn(`[SyncEngine] Photo upload failed with local error:`, photoErr?.message);
      }
    }

    // 2. Upload voice if present and not yet uploaded
    if (record.voiceLocalPath && !voiceUrl) {
      try {
        const voiceFile = new File(record.voiceLocalPath);
        if (voiceFile.exists) {
          voiceUrl = await uploadVoice(record.voiceLocalPath);
          // Save URL to DB immediately so retries don't re-upload
          saveUploadedUrl(record.id, 'voiceUrl', voiceUrl);
        } else {
          console.warn(`[SyncEngine] Local voice file does not exist: ${record.voiceLocalPath}, skipping voice`);
        }
      } catch (voiceErr: any) {
        if (isNetworkError(voiceErr)) throw voiceErr;
        console.warn(`[SyncEngine] Voice upload failed with local error:`, voiceErr?.message);
      }
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
