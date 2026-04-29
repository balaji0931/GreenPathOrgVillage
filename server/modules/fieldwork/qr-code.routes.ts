import type { Express } from "express";
import { storage } from "../../storage";
import {
  createBatchQRCodes,
  validateQRAccess,
  mapQRToHousehold,
  generateBatchPDF,
} from "./qr-code.service";
import { logAction } from "../audit/audit.storage";

export function registerQRCodeRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  app.post('/api/qr-codes/batch', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { quantity } = req.body;
      const villageId = req.session.villageId!;

      const result = await createBatchQRCodes(villageId, quantity);

      logAction(villageId, req.session.userId!, 'created', 'qr_batch', result.batchId, {
        quantity,
      });

      res.json(result);
    } catch (error: any) {
      if (error.message === "Quantity must be between 1 and 500") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create QR codes" });
    }
  });

  app.get('/api/qr-codes', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const qrCodes = await storage.getQRCodesByVillage(villageId);
      res.json(qrCodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get QR codes" });
    }
  });



  app.get('/api/qr-codes/batch/:batchId/pdf', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { batchId } = req.params;

      const pdfBuffer = await generateBatchPDF(batchId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${batchId}-qr-codes.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      if (error.message === "Batch not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // On-demand QR image generation - replaces Cloudinary URLs
  app.get('/api/qr-codes/:uid/image', requireAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      const { generateQRBuffer, toFullUid } = await import('./qr-service');
      const fullUid = toFullUid(uid);

      // Verify village access - prevent cross-village QR image requests
      const qrCode = await storage.getQRCodeByUid(fullUid);
      if (!qrCode) {
        // Also check households table (for directly-created households)
        const household = await storage.getHouseholdByUid(uid.replace(/^GEN-/, ''));
        if (!household || household.villageId !== req.session.villageId) {
          return res.status(404).json({ message: "QR code not found" });
        }
      } else if (qrCode.villageId !== req.session.villageId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const buffer = await generateQRBuffer(fullUid);
      res.setHeader('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR image" });
    }
  });

  // Field worker QR code lookup route
  app.get('/api/qr-codes/:uid', requireAuth, requireRole(['fieldworker', 'manager']), requireVillageAccess, async (req, res) => {
    try {
      const { uid } = req.params;
      const villageId = req.session.villageId!;

      const qrCode = await validateQRAccess(uid, villageId);

      res.json(qrCode);
    } catch (error: any) {
      if (error.message === "QR code not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to get QR code" });
    }
  });

  app.post('/api/qr-codes/:uid/map', requireAuth, requireRole(['fieldworker']), requireVillageAccess, async (req, res) => {
    try {
      const { uid } = req.params;
      const { headName, phone, houseNumber, ward, familySize, address, latitude, longitude, householdType } = req.body;
      const villageId = req.session.villageId!;

      const result = await mapQRToHousehold(uid, villageId, {
        headName,
        phone,
        houseNumber,
        ward,
        familySize,
        address,
        latitude,
        longitude,
        householdType,
      });

      logAction(villageId, req.session.userId!, 'mapped', 'qr_mapping', uid, {
        headName,
        ward,
      });

      res.json(result);
    } catch (error: any) {
      if (error.message === "QR code not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Access denied") {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "QR code is already mapped to a household") {
        return res.status(400).json({ message: error.message });
      }
      console.error("QR MAP ERROR:", error); res.status(500).json({ message: "Failed to map QR code" });
    }
  });
}
