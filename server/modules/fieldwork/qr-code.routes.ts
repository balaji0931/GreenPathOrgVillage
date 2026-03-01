import type { Express } from "express";
import { storage } from "../../storage";

export function registerQRCodeRoutes(app: Express, requireAuth: any, requireRole: any) {
  app.post('/api/qr-codes/batch', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { quantity } = req.body;
      const villageId = req.session.villageId!;

      if (!quantity || quantity < 1 || quantity > 500) {
        return res.status(400).json({ message: "Quantity must be between 1 and 500" });
      }

      // Get next batch ID and UIDs
      const batchId = await storage.getNextBatchId(villageId);
      const uids = await storage.getNextQRCodeUid(villageId, quantity);

      // Import the QR generation function
      const { generatePreMappedQR } = await import('./qr-service');

      // Generate QR codes and upload to Cloudinary
      const qrCodeRecords = [];
      for (const uid of uids) {
        const { qrCodeUrl, qrCodePublicId } = await generatePreMappedQR(uid, villageId);
        qrCodeRecords.push({
          uid,
          qrCodeUrl,
          qrCodePublicId,
          villageId,
          batchId,
          status: 'notMapped',
        });
      }

      // Save to database
      const savedQRCodes = await storage.createBatchQRCodes(qrCodeRecords);

      res.json({
        batchId,
        count: savedQRCodes.length,
        qrCodes: savedQRCodes,
      });
    } catch (error) {
      console.error("Create batch QR codes error:", error);
      res.status(500).json({ message: "Failed to create QR codes" });
    }
  });

  app.get('/api/qr-codes', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const qrCodes = await storage.getQRCodesByVillage(villageId);
      res.json(qrCodes);
    } catch (error) {
      console.error("Get QR codes error:", error);
      res.status(500).json({ message: "Failed to get QR codes" });
    }
  });



  app.get('/api/qr-codes/batch/:batchId/pdf', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { batchId } = req.params;
      const qrCodes = await storage.getQRCodesByBatch(batchId);

      if (qrCodes.length === 0) {
        return res.status(404).json({ message: "Batch not found" });
      }

      const { generatePreMappedQRCodesPDF } = await import('./qr-service');
      const pdfBuffer = await generatePreMappedQRCodesPDF(qrCodes);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${batchId}-qr-codes.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate batch PDF error:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Field worker QR code lookup route
  app.get('/api/qr-codes/:uid', requireAuth, requireRole(['fieldworker', 'manager']), async (req, res) => {
    try {
      const { uid } = req.params;
      const villageId = req.session.villageId!;

      const { toFullUid } = await import('./qr-service');
      const fullUid = toFullUid(uid);

      const qrCode = await storage.getQRCodeByUid(fullUid);
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }

      // Ensure the QR belongs to fieldworker's village
      if (qrCode.villageId !== villageId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(qrCode);
    } catch (error) {
      console.error("Get QR code error:", error);
      res.status(500).json({ message: "Failed to get QR code" });
    }
  });

  app.post('/api/qr-codes/:uid/map', requireAuth, requireRole(['fieldworker']), async (req, res) => {
    try {
      const { uid } = req.params;
      const { headName, phone, houseNumber, ward, familySize, address, latitude, longitude } = req.body;
      const villageId = req.session.villageId!;

      const { toFullUid, generateGeneratorCredentials } = await import('./qr-service');
      const fullUid = toFullUid(uid);

      // Get the QR code
      const qrCode = await storage.getQRCodeByUid(fullUid);
      if (!qrCode) {
        return res.status(404).json({ message: "QR code not found" });
      }

      // Ensure QR belongs to fieldworker's village
      if (qrCode.villageId !== villageId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if already mapped
      if (qrCode.status === 'mapped') {
        return res.status(400).json({ message: "QR code is already mapped to a household" });
      }

      // The household UID is the same as the full QR UID (GEN-V001-H0001)
      const householdUid = fullUid.replace('GEN-', '');

      // Generate generator credentials (uses the full UID)
      const { userId: generatorUserId, hashedPassword } = generateGeneratorCredentials(householdUid);

      // Create household with qrPrinted = true (since they already have the physical QR)
      const household = await storage.createHousehold({
        uid: householdUid,
        villageId,
        headName,
        phone,
        houseNumber,
        ward: ward || 'Ward-1',
        familySize: familySize || 1,
        address,
        latitude,
        longitude,
        status: 'active',
        qrCodeUrl: qrCode.qrCodeUrl,
        qrCodePublicId: qrCode.qrCodePublicId,
        qrPrinted: true,
        generatorUserId,
        generatorPassword: generatorUserId,
      });

      // Create generator user account
      await storage.createUser({
        userId: generatorUserId,
        password: hashedPassword,
        role: 'generator',
        name: headName,
        phone,
        villageId,
      });

      // Update QR code status to mapped
      await storage.updateQRCodeStatus(fullUid, 'mapped', household.id);

      res.json({
        household,
        credentials: {
          userId: generatorUserId,
          password: generatorUserId,
        },
      });
    } catch (error: any) {
      console.error("Map QR code error:", error);
      res.status(500).json({ message: "Failed to map QR code" });
    }
  });
}
