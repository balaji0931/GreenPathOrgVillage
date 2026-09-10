/**
 * Field Worker Background Sync Engine
 *
 * Runs silently in the background:
 * - Picks up QUEUED / FAILED household mappings from SQLite
 * - Calls POST /api/qr-codes/:uid/map
 * - Updates record status to CONFIRMED or FAILED
 *
 * Triggers:
 * - On app launch / mount
 * - On network reconnect
 * - After each new mapping is enqueued
 * - Periodic interval (every 30 seconds while pending mappings exist)
 * - Proactive refresh on foreground return
 *
 * Concurrency: processes ONE mapping at a time sequentially.
 */
import { AppState, type NativeEventSubscription } from 'react-native';
import {
  getPendingMappingRecords,
  getPendingMappingRecordsForManualSync,
  markMappingSyncing,
  markMappingConfirmed,
  markMappingFailed,
  resetStaleMappingSync,
  resetMappingToQueued,
  getFieldWorkerQueueStats,
} from './fieldworker-queue';
import { mapHousehold } from '../api/fieldworker.api';
import { NetworkError } from '../api/client';
import type { QueuedMapping, FieldWorkerQueueStats, HouseholdMappingPayload } from '../types/fieldworker';

// ── State ──────────────────────────────────────────────────────

let isSyncing = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let onStatsChangeCallback: ((stats: FieldWorkerQueueStats) => void) | null = null;

// ── Public API ─────────────────────────────────────────────────

/**
 * Initialize the Field Worker sync engine. Call on dashboard mount.
 */
export function initFieldWorkerSyncEngine(): void {
  // Reset any records that were left in SYNCING state when the app was killed
  resetStaleMappingSync();

  // Listen for app returning to foreground
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        triggerFieldWorkerSync();
      }
    });
  }

  // Start periodic sync timer
  startPeriodicSync();

  // Trigger initial sync
  triggerFieldWorkerSync();
}

/**
 * Trigger an automatic sync cycle. Skips if already syncing.
 */
export function triggerFieldWorkerSync(): void {
  if (isSyncing) return;
  processQueue(false);
}

/**
 * Trigger a manual sync ("Sync Now" button). Ignores attempt limits.
 */
export function triggerFieldWorkerManualSync(): void {
  if (isSyncing) return;
  processQueue(true);
}

/**
 * Register a listener for queue stats changes (for UI badges & counters).
 */
export function onFieldWorkerSyncStatsChange(
  cb: (stats: FieldWorkerQueueStats) => void
): () => void {
  onStatsChangeCallback = cb;
  // Emit current stats immediately
  cb(getFieldWorkerQueueStats());
  return () => {
    onStatsChangeCallback = null;
  };
}

/**
 * Stop the Field Worker sync engine (on logout or unmount).
 */
export function stopFieldWorkerSyncEngine(): void {
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
export function isFieldWorkerSyncInProgress(): boolean {
  return isSyncing;
}

// ── Internal Helpers ───────────────────────────────────────────

function startPeriodicSync(): void {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    const stats = getFieldWorkerQueueStats();
    if (stats.queued > 0 || stats.failed > 0) {
      triggerFieldWorkerSync();
    }
  }, 30_000); // Check every 30 seconds
}

function notifyStatsChange(): void {
  if (onStatsChangeCallback) {
    try {
      onStatsChangeCallback(getFieldWorkerQueueStats());
    } catch {}
  }
}

/**
 * Check whether an error is transient (network drop, DNS, timeout).
 */
function isNetworkError(err: any): boolean {
  if (err instanceof NetworkError) return true;
  if (err instanceof TypeError) return true;
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
    msg.includes('timeout')
  );
}

async function processQueue(isManual: boolean = false): Promise<void> {
  isSyncing = true;
  notifyStatsChange();

  try {
    const pending = isManual
      ? getPendingMappingRecordsForManualSync()
      : getPendingMappingRecords();

    if (pending.length === 0) {
      isSyncing = false;
      notifyStatsChange();
      return;
    }

    for (const record of pending) {
      await syncOneMapping(record);
      notifyStatsChange();
    }
  } catch {
    // Guard against top-level uncaught failures
  } finally {
    isSyncing = false;
    notifyStatsChange();
  }
}

async function syncOneMapping(record: QueuedMapping): Promise<void> {
  markMappingSyncing(record.id);

  try {
    let payload: HouseholdMappingPayload;
    try {
      payload = JSON.parse(record.payloadJson);
    } catch {
      payload = {
        uid: record.uid,
        headName: record.headName,
        phone: record.phone,
        houseNumber: record.houseNumber,
        ward: record.ward,
        householdType: record.householdType,
        familySize: record.familySize,
        address: record.address,
        latitude: record.latitude ? parseFloat(record.latitude) : undefined,
        longitude: record.longitude ? parseFloat(record.longitude) : undefined,
        accessRoadId: record.accessRoadId ?? undefined,
        preferredCollectionTime: record.preferredCollectionTime || undefined,
      };
    }

    // Call server to map QR code to household
    await mapHousehold(payload);

    // Marked confirmed on success
    markMappingConfirmed(record.id);
  } catch (err: any) {
    if (isNetworkError(err)) {
      // Network drop: reset to QUEUED without incrementing attempt count
      resetMappingToQueued(record.id);
      return;
    }

    if (err?.status === 401) {
      // Token expired: reset to QUEUED, auth layer will refresh
      resetMappingToQueued(record.id);
      return;
    }

    if (err?.status === 429) {
      // Throttled: reset to QUEUED, will retry next cycle
      resetMappingToQueued(record.id);
      return;
    }

    // If server says "already mapped", consider confirmed locally
    const errMsg = err?.message || '';
    if (err?.status === 400 && errMsg.toLowerCase().includes('already mapped')) {
      markMappingConfirmed(record.id);
      return;
    }

    // Definitive server failure: mark FAILED and record error message
    markMappingFailed(record.id, errMsg || 'Server rejected mapping');
  }
}
