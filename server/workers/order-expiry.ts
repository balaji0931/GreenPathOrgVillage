/**
 * Order Expiry Worker
 *
 * Runs every 10 minutes to:
 * 1. Mark pending orders as expired if past expiresAt
 * 2. Unlock associated bills so they can be paid again
 *
 * Usage: Import and call startOrderExpiryWorker() during server startup.
 */
import { expirePendingOrders } from "../modules/payment/payment.storage";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

async function runExpiryCheck() {
  try {
    const count = await expirePendingOrders();
    if (count > 0) {
      console.log(`[OrderExpiry] Expired ${count} pending order(s) and unlocked their bills`);
    }
  } catch (error) {
    console.error("[OrderExpiry] Error during expiry check:", error);
  }
}

export function startOrderExpiryWorker() {
  if (intervalId) {
    console.warn("[OrderExpiry] Worker already running");
    return;
  }

  console.log("[OrderExpiry] Starting worker - checking every 10 minutes");
  // Run once immediately on startup
  runExpiryCheck();
  // Then every 10 minutes
  intervalId = setInterval(runExpiryCheck, INTERVAL_MS);
}

export function stopOrderExpiryWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[OrderExpiry] Worker stopped");
  }
}
