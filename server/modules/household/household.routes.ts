import type { Express } from "express";
import { storage } from "../../storage";

export function registerHouseholdRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Household routes
  app.post('/api/households', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { headName, phone, houseNumber, familySize, address, ward } = req.body;
      const villageId = req.session.villageId!;

      // Generate unique UID by checking max from both households and qr_codes tables
      let maxNum = await storage.getMaxHouseNumber(villageId);
      let counter = maxNum + 1;
      let uid = `${villageId}-H${String(counter).padStart(4, '0')}`;

      // Retry loop to handle race conditions
      while (counter <= 9999) {
        const existingHousehold = await storage.getHouseholdByUid(uid);
        const existingQR = await storage.getQRCodeByUid(uid);
        if (!existingHousehold && !existingQR) break;
        counter++;
        uid = `${villageId}-H${String(counter).padStart(4, '0')}`;
      }

      if (counter > 9999) {
        return res.status(400).json({ message: "Maximum households reached for this village" });
      }

      // Generate generator credentials
      const { generateGeneratorCredentials, generateHouseholdQR } = await import('../fieldwork/qr-service');
      const { userId: generatorUserId, password: generatorPassword, hashedPassword } =
        generateGeneratorCredentials(uid);

      // Create household first
      const household = await storage.createHousehold({
        uid,
        villageId,
        headName,
        phone,
        houseNumber,
        ward: ward || 'Ward-1',
        familySize,
        address,
        generatorUserId,
        generatorPassword: hashedPassword,
      });

      // Generate QR code
      const { qrCodeUrl, qrCodePublicId } = await generateHouseholdQR({
        uid,
        headName,
        houseNumber,
        villageId,
        generatorUserId,
      });

      // Update household with QR code info
      await storage.updateHousehold(household.id, {
        qrCodeUrl,
        qrCodePublicId,
      });

      // Create generator user account
      await storage.createUser({
        userId: generatorUserId,
        password: hashedPassword,
        role: 'generator',
        villageId,
        name: `Generator - ${headName}`,
        phone,
        isFirstLogin: true,
      });

      res.json({
        household: { ...household, qrCodeUrl, qrCodePublicId },
        generatorCredentials: {
          userId: generatorUserId,
          password: generatorPassword,
        },
      });
    } catch (error) {
      console.error("Create household error:", error);
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

      if (!Array.isArray(householdsData) || householdsData.length === 0) {
        return res.status(400).json({ message: 'Invalid households data' });
      }

      const createdHouseholds = [];
      const { generateGeneratorCredentials, generateHouseholdQR } = await import('../fieldwork/qr-service');

      // Get max house number at the start (from both tables)
      let currentMaxNum = await storage.getMaxHouseNumber(villageId);

      for (const householdData of householdsData) {
        try {
          // Generate unique UID by incrementing from max with uniqueness check
          currentMaxNum++;
          let counter = currentMaxNum;
          let uid = `${villageId}-H${String(counter).padStart(4, '0')}`;

          // Ensure UID is actually unique (handles race conditions)
          while (counter <= 9999) {
            const existingHousehold = await storage.getHouseholdByUid(uid);
            const existingQR = await storage.getQRCodeByUid(uid);
            if (!existingHousehold && !existingQR) break;
            counter++;
            uid = `${villageId}-H${String(counter).padStart(4, '0')}`;
          }
          currentMaxNum = counter; // Update for next iteration

          if (counter > 9999) {
            console.error(`Maximum households reached for village ${villageId}`);
            continue; // Skip this household
          }

          // Generate generator credentials
          const { userId: generatorUserId, password: generatorPassword, hashedPassword } =
            generateGeneratorCredentials(uid);

          // Create household
          const household = await storage.createHousehold({
            uid,
            villageId,
            headName: householdData.headName,
            houseNumber: householdData.houseNumber,
            phone: householdData.phone,
            ward: householdData.ward || 'Ward-1',
            familySize: householdData.familySize || 1,
            address: householdData.address || '',
            generatorUserId,
            generatorPassword: hashedPassword,
          });

          // Generate QR code
          const { qrCodeUrl, qrCodePublicId } = await generateHouseholdQR({
            uid,
            headName: household.headName,
            houseNumber: household.houseNumber || '',
            villageId,
            generatorUserId,
          });

          // Update household with QR code URL
          const updatedHousehold = await storage.updateHousehold(household.id, {
            qrCodeUrl,
            qrCodePublicId,
          });

          // Create generator user account
          await storage.createUser({
            userId: generatorUserId,
            password: hashedPassword,
            role: 'generator',
            villageId,
            name: `Generator - ${household.headName}`,
            phone: household.phone,
            isFirstLogin: true,
          });

          createdHouseholds.push({
            ...updatedHousehold,
            generatorCredentials: {
              userId: generatorUserId,
              password: generatorPassword,
            }
          });
        } catch (error: any) {
          console.error(`Error creating household ${householdData.headName}:`, error);
          // Continue with next household instead of failing entire batch
        }
      }

      res.status(201).json(createdHouseholds);
    } catch (error) {
      console.error('Error creating bulk households:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Generate QR codes for existing households
  app.post('/api/qr-codes/generate', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { householdIds } = req.body;
      const villageId = req.session.villageId!;

      if (!Array.isArray(householdIds) || householdIds.length === 0) {
        return res.status(400).json({ message: 'Invalid household IDs' });
      }

      const { generateHouseholdQR } = await import('../fieldwork/qr-service');
      const updatedHouseholds = [];

      for (const householdId of householdIds) {
        const household = await storage.getHouseholdsByVillage(villageId);
        const targetHousehold = household.find(h => h.id === householdId);

        if (!targetHousehold) {
          continue;
        }

        // Skip if QR code already exists
        if (targetHousehold.qrCodeUrl) {
          continue;
        }

        // Generate QR code
        const { qrCodeUrl, qrCodePublicId } = await generateHouseholdQR({
          uid: targetHousehold.uid,
          headName: targetHousehold.headName,
          houseNumber: targetHousehold.houseNumber || '',
          villageId: targetHousehold.villageId,
          generatorUserId: targetHousehold.generatorUserId || '',
        });

        // Update household with QR code
        const updated = await storage.updateHousehold(householdId, {
          qrCodeUrl,
          qrCodePublicId,
        });

        updatedHouseholds.push(updated);
      }

      res.json({
        message: 'QR codes generated successfully',
        households: updatedHouseholds
      });
    } catch (error) {
      console.error('Error generating QR codes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Download QR codes as PDF
  app.post('/api/qr-codes/download-pdf', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { householdIds } = req.body;
      const villageId = req.session.villageId!;

      if (!Array.isArray(householdIds) || householdIds.length === 0) {
        return res.status(400).json({ message: 'Invalid household IDs' });
      }

      const households = await storage.getHouseholdsByVillage(villageId);
      const selectedHouseholds = households.filter(h =>
        householdIds.includes(h.id) && h.qrCodeUrl
      ).map(h => ({
        uid: h.uid,
        headName: h.headName,
        houseNumber: h.houseNumber || '',
        villageId: h.villageId,
        qrCodeUrl: h.qrCodeUrl || ''
      }));

      if (selectedHouseholds.length === 0) {
        return res.status(400).json({ message: 'No households with QR codes found' });
      }

      const { generateBulkQRCodesPDF } = await import('../fieldwork/qr-service');
      const pdfBuffer = await generateBulkQRCodesPDF(selectedHouseholds);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="household-qr-codes-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.end(pdfBuffer, 'binary');
    } catch (error) {
      console.error('Error downloading QR codes PDF:', error);
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
