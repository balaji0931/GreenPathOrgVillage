import type { Express, Request, Response, NextFunction } from "express";
import * as attendanceStorage from "./attendance.storage";
import { db } from "../../db";
import { villages, villageStaff, attendanceCenters } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logAction } from "../audit/audit.storage";
import QRCode from "qrcode";
import { createCanvas } from "canvas";
import * as staffStorage from "../staff/staff.storage";

// Middleware: reject if attendance feature disabled for this village
async function requireAttendanceEnabled(req: Request, res: Response, next: NextFunction) {
  const villageId = req.session?.villageId;
  if (!villageId) return next();

  const [village] = await db
    .select({ attendanceEnabled: villages.attendanceEnabled })
    .from(villages)
    .where(eq(villages.villageId, villageId));

  if (!village || !village.attendanceEnabled) {
    return res.status(403).json({ message: "Attendance feature is not enabled for this village." });
  }
  next();
}

export function registerAttendanceRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Guard all attendance routes
  app.use("/api/attendance", requireAttendanceEnabled);

  // ═══════════════════════════════════════════
  // Attendance Centers (Manager)
  // ═══════════════════════════════════════════

  // Create center — manager stands at location and taps "Set Location Here"
  app.post("/api/attendance/centers", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const { name, latitude, longitude, radiusMeters } = req.body;
      if (!name || !latitude || !longitude) {
        return res.status(400).json({ message: "Name, latitude, and longitude are required" });
      }

      const center = await attendanceStorage.createCenter({
        villageId: req.session.villageId!,
        name,
        latitude: String(latitude),
        longitude: String(longitude),
        radiusMeters: radiusMeters || 200,
      });

      logAction(req.session.villageId!, req.session.userId!, "created", "attendance_center", String(center.id), { name });

      // Return center with QR data for poster printing
      const qrData = JSON.stringify({ type: "attendance", token: center.qrToken });
      res.json({ ...center, qrData });
    } catch (error) {
      res.status(500).json({ message: "Failed to create attendance center" });
    }
  });

  // List active centers
  app.get("/api/attendance/centers", requireAuth, requireVillageAccess, async (req, res) => {
    try {
      const centers = await attendanceStorage.getCenters(req.session.villageId!);
      res.json(centers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get attendance centers" });
    }
  });

  // Get branded QR poster for a center (PNG)
  app.get("/api/attendance/centers/:id/qr", requireAuth, requireVillageAccess, async (req, res) => {
    try {
      const centers = await attendanceStorage.getCenters(req.session.villageId!);
      const center = centers.find((c: any) => c.id === parseInt(req.params.id));
      if (!center) return res.status(404).json({ message: "Center not found" });

      const qrData = JSON.stringify({ type: "attendance", token: center.qrToken });

      // Generate QR as data URL
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      // Create branded poster using canvas
      const W = 600;
      const H = 780;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Green header bar
      ctx.fillStyle = "#0E7C3F";
      ctx.fillRect(0, 0, W, 90);

      // Load GreenPath SVG logo (white version for green header)
      const { loadImage } = await import("canvas");
      const fs = await import("fs");
      const path = await import("path");
      const logoPath = path.resolve(process.cwd(), "public/logos/logo-full.svg");
      let logoSvg = fs.readFileSync(logoPath, "utf-8");
      // Replace green fill with white for visibility on green header
      logoSvg = logoSvg.replace(/#0E7C3F/gi, "#ffffff");
      const logoBuffer = Buffer.from(logoSvg);
      const logoImage = await loadImage(logoBuffer);
      // Original SVG is 1526x365, scale to fit header (~180px wide)
      const logoH = 40;
      const logoW = (1526 / 365) * logoH;
      ctx.drawImage(logoImage, 20, 25, logoW, logoH);

      // Heading: Shift Logging QR
      ctx.fillStyle = "#111827";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Shift Logging QR", W / 2, 130);

      // Draw QR code
      const qrImage = await loadImage(qrDataUrl);
      const qrSize = 400;
      const qrX = (W - qrSize) / 2;
      ctx.drawImage(qrImage, qrX, 160, qrSize, qrSize);

      // Center name below QR
      ctx.fillStyle = "#374151";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(center.name, W / 2, 600);

      // Small instruction text
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px sans-serif";
      ctx.fillText("Scan this QR to start/end your shift", W / 2, 640);

      // Border
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      // Footer
      ctx.fillStyle = "#d1d5db";
      ctx.font = "11px sans-serif";
      ctx.fillText(`Radius: ${center.radiusMeters}m • Generated: ${new Date().toLocaleDateString("en-IN")}`, W / 2, H - 20);

      const pngBuffer = canvas.toBuffer("image/png");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="shift-qr-${center.name}.png"`);
      res.send(pngBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Rotate QR token for a center (regenerate)
  app.put("/api/attendance/centers/:id/rotate-qr", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const centerId = parseInt(req.params.id);
      const centers = await attendanceStorage.getCenters(req.session.villageId!);
      const center = centers.find((c: any) => c.id === centerId);
      if (!center) return res.status(404).json({ message: "Center not found" });

      // Generate new token
      const crypto = await import("crypto");
      const newToken = crypto.randomUUID();

      await db
        .update(attendanceCenters)
        .set({ qrToken: newToken })
        .where(eq(attendanceCenters.id, centerId));

      logAction(req.session.villageId!, req.session.userId!, "rotated_qr", "attendance_center", String(centerId), {
        centerName: center.name,
      });

      res.json({ success: true, message: "QR token rotated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to rotate QR token" });
    }
  });

  // Delete (soft) center
  app.delete("/api/attendance/centers/:id", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      await attendanceStorage.deleteCenter(parseInt(req.params.id));
      logAction(req.session.villageId!, req.session.userId!, "deleted", "attendance_center", req.params.id, {});
      res.json({ message: "Center deactivated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete center" });
    }
  });

  // ═══════════════════════════════════════════
  // Shift Log (Collector — QR scan + GPS)
  // ═══════════════════════════════════════════

  // Scan QR to start or end shift
  app.post("/api/attendance/scan-shift", requireAuth, requireRole(["collector"]), requireVillageAccess, async (req, res) => {
    try {
      const { qrToken, latitude, longitude } = req.body;
      if (!qrToken || latitude == null || longitude == null) {
        return res.status(400).json({ message: "QR token and GPS coordinates are required" });
      }

      // Get collector name from DB
      const collectorsData = await attendanceStorage.getCollectorsForVillage(req.session.villageId!);
      const collector = collectorsData.find(c => c.uid === req.session.userId);
      const collectorName = collector?.name || "Unknown";

      const result = await attendanceStorage.scanShift({
        qrToken,
        workerId: req.session.userId!,
        workerName: collectorName,
        villageId: req.session.villageId!,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });

      if (result.error === "too_far") {
        return res.status(403).json({
          message: `Too far from ${result.centerName}`,
          distance: result.distance,
          maxDistance: result.maxDistance,
          error: "too_far",
        });
      }

      if (result.error) {
        return res.status(400).json({ message: result.error });
      }

      logAction(req.session.villageId!, req.session.userId!, result.eventType!, "shift_log", req.session.userId!, {
        shiftNumber: result.shiftNumber,
        centerName: result.centerName,
        distance: result.distance,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to record shift" });
    }
  });

  // Get current shift state + attendance status for logged-in collector
  app.get("/api/attendance/my-shift", requireAuth, requireRole(["collector"]), requireVillageAccess, async (req, res) => {
    try {
      const istOffset = 5.5 * 60 * 60 * 1000;
      const nowIst = new Date(Date.now() + istOffset);
      const shiftDate = nowIst.toISOString().split("T")[0];

      // Get both shift state and attendance status
      const [state, attendance] = await Promise.all([
        attendanceStorage.getWorkerShiftState(req.session.userId!, shiftDate),
        attendanceStorage.getAttendanceForDate(req.session.villageId!, shiftDate),
      ]);

      const myAttendance = attendance.find(a => a.workerId === req.session.userId);

      res.json({
        shiftDate,
        ...state,
        attendanceStatus: myAttendance?.status || null,   // present | half_day | absent | null
        attendanceRemarks: myAttendance?.remarks || null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get shift state" });
    }
  });

  // ═══════════════════════════════════════════
  // Worker Attendance (Manager Only)
  // ═══════════════════════════════════════════

  // Mark attendance for a worker
  app.post("/api/attendance/mark", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const { workerId, workerName, attendanceDate, status, remarks } = req.body;
      if (!workerId || !workerName || !attendanceDate || !status) {
        return res.status(400).json({ message: "workerId, workerName, attendanceDate, and status are required" });
      }

      if (!["present", "half_day", "absent"].includes(status)) {
        return res.status(400).json({ message: "Status must be present, half_day, or absent" });
      }

      const result = await attendanceStorage.markAttendance({
        villageId: req.session.villageId!,
        workerId,
        workerName,
        attendanceDate,
        status,
        markedByUserId: req.session.userId!,
        remarks,
      });

      logAction(req.session.villageId!, req.session.userId!, "marked_attendance", "worker_attendance", workerId, {
        status,
        date: attendanceDate,
        workerName,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark attendance" });
    }
  });

  // Get daily attendance + shift logs for a date
  app.get("/api/attendance/daily", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const date = (req.query.date as string) || (() => {
        const istOffset = 5.5 * 60 * 60 * 1000;
        return new Date(Date.now() + istOffset).toISOString().split("T")[0];
      })();

      const [attendance, shiftLogs, collectors] = await Promise.all([
        attendanceStorage.getAttendanceForDate(req.session.villageId!, date),
        attendanceStorage.getShiftLogsForDate(req.session.villageId!, date),
        attendanceStorage.getCollectorsForVillage(req.session.villageId!),
      ]);

      // Group shift logs by worker
      const shiftsByWorker = new Map<string, any[]>();
      for (const log of shiftLogs) {
        if (!shiftsByWorker.has(log.workerId)) shiftsByWorker.set(log.workerId, []);
        shiftsByWorker.get(log.workerId)!.push(log);
      }

      // Build per-worker shift summary
      const workerShifts: Record<string, { shiftNumber: number; startedAt: string | null; endedAt: string | null }[]> = {};
      const workerIds = Array.from(shiftsByWorker.keys());
      for (const workerId of workerIds) {
        const logs = shiftsByWorker.get(workerId)!;
        const shiftsMap = new Map<number, { start?: any; end?: any }>();
        for (const log of logs) {
          if (!shiftsMap.has(log.shiftNumber)) shiftsMap.set(log.shiftNumber, {});
          const s = shiftsMap.get(log.shiftNumber)!;
          if (log.eventType === "shift_start") s.start = log;
          if (log.eventType === "shift_end") s.end = log;
        }
        workerShifts[workerId] = Array.from(shiftsMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([num, d]) => ({
            shiftNumber: num,
            startedAt: d.start?.markedAt || null,
            endedAt: d.end?.markedAt || null,
          }));
      }

      // Merge attendance + shifts into a unified worker list
      const attendanceMap = new Map(attendance.map(a => [a.workerId, a]));

      // Support workerType param: collector (default), helper, segregator
      const workerType = (req.query.workerType as string) || "collector";
      let workerList: { uid: string; name: string; workType?: string | null }[] = [];

      if (workerType === "collector") {
        workerList = collectors.map(c => ({ uid: c.uid, name: c.name }));
      } else {
        const staff = await staffStorage.getStaffByType(req.session.villageId!, workerType);
        workerList = staff.map(s => ({ uid: s.uid, name: s.name, workType: s.workType }));
      }

      const workers = workerList.map(c => ({
        workerId: c.uid,
        workerName: c.name,
        workType: (c as any).workType || null,
        attendance: attendanceMap.get(c.uid)?.status || null,
        attendanceRemarks: attendanceMap.get(c.uid)?.remarks || null,
        shifts: workerShifts[c.uid] || [],
      }));

      res.json({ date, workers, workerType });
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily attendance" });
    }
  });
}
