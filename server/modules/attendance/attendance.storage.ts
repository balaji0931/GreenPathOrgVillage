import { db } from "../../db";
import {
  attendanceCenters,
  shiftLogs,
  workerAttendance,
  collectors,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// ── Haversine distance (meters) ──
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Attendance Centers ──

export async function createCenter(data: {
  villageId: string;
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters?: number;
}) {
  const qrToken = crypto.randomUUID();
  const [center] = await db
    .insert(attendanceCenters)
    .values({
      villageId: data.villageId,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters || 200,
      qrToken,
    })
    .returning();
  return center;
}

export async function getCenters(villageId: string) {
  return db
    .select()
    .from(attendanceCenters)
    .where(and(eq(attendanceCenters.villageId, villageId), eq(attendanceCenters.isActive, true)))
    .orderBy(attendanceCenters.name);
}

export async function deleteCenter(id: number) {
  await db
    .update(attendanceCenters)
    .set({ isActive: false })
    .where(eq(attendanceCenters.id, id));
}

export async function getCenterByQrToken(token: string) {
  const [center] = await db
    .select()
    .from(attendanceCenters)
    .where(and(eq(attendanceCenters.qrToken, token), eq(attendanceCenters.isActive, true)));
  return center || null;
}

// ── Shift Logs ──

export async function getWorkerShiftsToday(workerId: string, shiftDate: string) {
  return db
    .select()
    .from(shiftLogs)
    .where(and(eq(shiftLogs.workerId, workerId), eq(shiftLogs.shiftDate, shiftDate)))
    .orderBy(shiftLogs.shiftNumber, shiftLogs.markedAt);
}

export async function getShiftLogsForDate(villageId: string, date: string) {
  return db
    .select()
    .from(shiftLogs)
    .where(and(eq(shiftLogs.villageId, villageId), eq(shiftLogs.shiftDate, date)))
    .orderBy(shiftLogs.workerName, shiftLogs.shiftNumber, shiftLogs.markedAt);
}

export async function insertShiftLog(data: {
  villageId: string;
  workerId: string;
  workerName: string;
  shiftDate: string;
  shiftNumber: number;
  eventType: "shift_start" | "shift_end";
  markedAt: Date;
  latitude?: string;
  longitude?: string;
  distanceFromCenter?: number;
  attendanceCenterId?: number;
}) {
  const [log] = await db
    .insert(shiftLogs)
    .values(data as any)
    .returning();
  return log;
}

/**
 * Compute the current shift state for a worker on a given date.
 * Returns: { currentShiftNumber, isShiftActive, shifts: [...] }
 */
export async function getWorkerShiftState(workerId: string, shiftDate: string) {
  const logs = await getWorkerShiftsToday(workerId, shiftDate);

  // Group by shiftNumber
  const shiftsMap = new Map<number, { start?: typeof logs[0]; end?: typeof logs[0] }>();
  for (const log of logs) {
    const sn = log.shiftNumber;
    if (!shiftsMap.has(sn)) shiftsMap.set(sn, {});
    const shift = shiftsMap.get(sn)!;
    if (log.eventType === "shift_start") shift.start = log;
    if (log.eventType === "shift_end") shift.end = log;
  }

  const shifts = Array.from(shiftsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([num, data]) => ({
      shiftNumber: num,
      startedAt: data.start?.markedAt || null,
      endedAt: data.end?.markedAt || null,
      startCenter: data.start?.distanceFromCenter ?? null,
      endCenter: data.end?.distanceFromCenter ?? null,
    }));

  const lastShift = shifts[shifts.length - 1];
  const isShiftActive = lastShift ? (lastShift.startedAt && !lastShift.endedAt) : false;
  const currentShiftNumber = lastShift ? lastShift.shiftNumber : 0;

  return { currentShiftNumber, isShiftActive, shifts };
}

/**
 * Verify QR token + GPS distance, then insert a shift event.
 */
export async function scanShift(data: {
  qrToken: string;
  workerId: string;
  workerName: string;
  villageId: string;
  latitude: number;
  longitude: number;
}) {
  // 1. Verify QR
  const center = await getCenterByQrToken(data.qrToken);
  if (!center) return { error: "Invalid QR code" };
  if (center.villageId !== data.villageId) return { error: "QR code belongs to a different village" };

  // 2. Verify GPS
  const distance = Math.round(
    haversineMeters(
      data.latitude,
      data.longitude,
      parseFloat(center.latitude),
      parseFloat(center.longitude)
    )
  );

  if (distance > center.radiusMeters) {
    return {
      error: "too_far",
      distance,
      maxDistance: center.radiusMeters,
      centerName: center.name,
    };
  }

  // 3. Determine event type (start or end)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + istOffset);
  const shiftDate = nowIst.toISOString().split("T")[0];

  const state = await getWorkerShiftState(data.workerId, shiftDate);

  let eventType: "shift_start" | "shift_end";
  let shiftNumber: number;

  if (state.isShiftActive) {
    // Active shift → end it
    eventType = "shift_end";
    shiftNumber = state.currentShiftNumber;
  } else {
    // No active shift → start new one
    eventType = "shift_start";
    shiftNumber = state.currentShiftNumber + 1;
  }

  // 4. Insert
  const log = await insertShiftLog({
    villageId: data.villageId,
    workerId: data.workerId,
    workerName: data.workerName,
    shiftDate,
    shiftNumber,
    eventType,
    markedAt: new Date(),
    latitude: String(data.latitude),
    longitude: String(data.longitude),
    distanceFromCenter: distance,
    attendanceCenterId: center.id,
  });

  // 5. Return updated state
  const newState = await getWorkerShiftState(data.workerId, shiftDate);
  return { success: true, eventType, shiftNumber, distance, centerName: center.name, state: newState };
}

// ── Worker Attendance (manager-only) ──

export async function markAttendance(data: {
  villageId: string;
  workerId: string;
  workerName: string;
  attendanceDate: string;
  status: "present" | "half_day" | "absent";
  markedByUserId: string;
  remarks?: string;
}) {
  const [result] = await db
    .insert(workerAttendance)
    .values(data as any)
    .onConflictDoUpdate({
      target: [workerAttendance.villageId, workerAttendance.workerId, workerAttendance.attendanceDate],
      set: {
        status: data.status,
        markedByUserId: data.markedByUserId,
        remarks: data.remarks || null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function getAttendanceForDate(villageId: string, date: string) {
  return db
    .select()
    .from(workerAttendance)
    .where(and(eq(workerAttendance.villageId, villageId), eq(workerAttendance.attendanceDate, date)))
    .orderBy(workerAttendance.workerName);
}

export async function getAttendanceReport(villageId: string, startDate: string, endDate: string) {
  const { sql } = await import("drizzle-orm");
  return db
    .select()
    .from(workerAttendance)
    .where(
      and(
        eq(workerAttendance.villageId, villageId),
        sql`${workerAttendance.attendanceDate} >= ${startDate}`,
        sql`${workerAttendance.attendanceDate} <= ${endDate}`
      )
    )
    .orderBy(workerAttendance.attendanceDate, workerAttendance.workerName);
}

// ── Helpers ──

export async function getCollectorsForVillage(villageId: string) {
  return db
    .select({ uid: collectors.uid, name: collectors.name })
    .from(collectors)
    .where(eq(collectors.villageId, villageId))
    .orderBy(collectors.name);
}

export { haversineMeters };
