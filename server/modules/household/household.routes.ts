import type { Express } from "express";
import { storage } from "../../storage";
import {
  createHouseholdWithQR,
  createBulkHouseholds,
  generateQRCodesForExisting,
  generateQRCodesPDF,
} from "./household.service";

export function registerHouseholdRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Household routes
  app.post('/api/households', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { headName, phone, houseNumber, familySize, address, ward } = req.body;
      const villageId = req.session.villageId!;

      const result = await createHouseholdWithQR({
        villageId,
        headName,
        phone,
        houseNumber,
        familySize,
        address,
        ward,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Create household error:", error);
      if (error.message === "Maximum households reached for this village") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create household" });
    }
  });

  app.get('/api/households', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const households = await storage.getHouseholdsByVillage(villageId);
      res.json(households);
    } catch (error) {
      console.error("Get households error:", error);
      res.status(500).json({ message: "Failed to get households" });
    }
  });

  app.get('/api/households/paginated', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1500;
      const search = req.query.search as string;
      const ward = req.query.ward as string;
      const status = req.query.status as string;

      const result = await storage.getHouseholdsByVillagePaginated(villageId, {
        page,
        limit,
        search,
        ward,
        status
      });
      res.json(result);
    } catch (error) {
      console.error("Get paginated households error:", error);
      res.status(500).json({ message: "Failed to get households" });
    }
  });

  // Get single household by UID (for QR scanning)
  app.get('/api/households/:uid', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const { uid } = req.params;
      const household = await storage.getHouseholdByUid(uid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      console.error("Get household by UID error:", error);
      res.status(500).json({ message: "Failed to get household" });
    }
  });

  // Bulk household creation with QR codes
  app.post('/api/households/bulk', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { households: householdsData } = req.body;
      const villageId = req.session.villageId!;

      const createdHouseholds = await createBulkHouseholds(villageId, householdsData);

      res.status(201).json(createdHouseholds);
    } catch (error: any) {
      console.error('Error creating bulk households:', error);
      if (error.message === 'Invalid households data') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Generate QR codes for existing households
  app.post('/api/qr-codes/generate', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { householdIds } = req.body;
      const villageId = req.session.villageId!;

      const updatedHouseholds = await generateQRCodesForExisting(villageId, householdIds);

      res.json({
        message: 'QR codes generated successfully',
        households: updatedHouseholds
      });
    } catch (error: any) {
      console.error('Error generating QR codes:', error);
      if (error.message === 'Invalid household IDs') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Download QR codes as PDF
  app.post('/api/qr-codes/download-pdf', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { householdIds } = req.body;
      const villageId = req.session.villageId!;

      const pdfBuffer = await generateQRCodesPDF(villageId, householdIds);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="household-qr-codes-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.end(pdfBuffer, 'binary');
    } catch (error: any) {
      console.error('Error downloading QR codes PDF:', error);
      if (error.message === 'Invalid household IDs' || error.message === 'No households with QR codes found') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  app.delete('/api/households/:id', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteHousehold(id);
      res.json({ message: "Household and related records deleted successfully" });
    } catch (error: any) {
      console.error("Delete household error:", error);
      res.status(500).json({ message: error.message || "Failed to delete household" });
    }
  });
}
