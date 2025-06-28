import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import multer from "multer";
import session from "express-session";
import { insertUserSchema, insertVillageSchema, insertHouseholdSchema, insertCollectorSchema, insertWasteCollectionSchema, insertIssueSchema, insertAnnouncementSchema, insertAttendanceSchema, insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import { readFileSync } from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Extend express session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: string;
    villageId?: string;
  }
}

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.session?.role || !roles.includes(req.session.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Initialize admin user if not exists
  const adminUser = await storage.getUserByUserId('admin');
  if (!adminUser) {
    await storage.createUser({
      userId: 'admin',
      password: await bcrypt.hash('admin', 10),
      role: 'admin',
      name: 'Administrator',
      villageId: null,
    });
  }

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { userId, password } = req.body;

      const user = await storage.getUserByUserId(userId);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.userId;
      req.session.role = user.role;
      req.session.villageId = user.villageId ?? undefined;

      res.json({
        user: {
          userId: user.userId,
          role: user.role,
          name: user.name,
          villageId: user.villageId,
          isFirstLogin: user.isFirstLogin,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserByUserId(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        userId: user.userId,
        role: user.role,
        name: user.name,
        villageId: user.villageId,
        isFirstLogin: user.isFirstLogin,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { newPassword } = req.body;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await storage.updateUserPassword(req.session.userId!, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Village routes
  app.post('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageName, managerName, managerPhone } = req.body;

      // Generate village ID
      const villages = await storage.getVillages();
      const villageId = `V${String(villages.length + 1).padStart(3, '0')}`;

      // Create village
      const village = await storage.createVillage({
        villageId,
        name: villageName,
      });

      // Create manager
      const managerId = `${villageId}-M1`;
      const hashedPassword = await bcrypt.hash(managerId, 10);

      const manager = await storage.createUser({
        userId: managerId,
        password: hashedPassword,
        role: 'manager',
        name: managerName,
        phone: managerPhone,
        villageId,
      });

      res.json({ 
        village, 
        manager: {
          ...manager,
          credentials: {
            userId: managerId,
            password: managerId
          }
        }
      });
    } catch (error) {
      console.error("Create village error:", error);
      res.status(500).json({ message: "Failed to create village" });
    }
  });

  app.get('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const villages = await storage.getVillages();
      const villagesWithStats = await Promise.all(
        villages.map(async (village) => {
          const stats = await storage.getVillageStats(village.villageId);
          return { ...village, ...stats };
        })
      );
      res.json(villagesWithStats);
    } catch (error) {
      console.error("Get villages error:", error);
      res.status(500).json({ message: "Failed to get villages" });
    }
  });

  // Household routes
  app.post('/api/households', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { headName, phone, houseNumber, familySize, address } = req.body;
      const villageId = req.session.villageId!;

      // Generate unique UID with better logic
      const existingHouseholds = await storage.getHouseholdsByVillage(villageId);
      let uid;
      let counter = 1;

      // Keep trying until we find a unique UID
      do {
        uid = `${villageId}-H${String(counter).padStart(3, '0')}`;
        const existing = await storage.getHouseholdByUid(uid);
        if (!existing) break;
        counter++;
      } while (counter <= 999);

      if (counter > 999) {
        return res.status(400).json({ message: "Maximum households reached for this village" });
      }

      // Generate generator credentials
      const { generateGeneratorCredentials, generateHouseholdQR } = await import('./qr-service');
      const { userId: generatorUserId, password: generatorPassword, hashedPassword } = 
        generateGeneratorCredentials(uid);

      // Create household first
      const household = await storage.createHousehold({
        uid,
        villageId,
        headName,
        phone,
        houseNumber,
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

  app.get('/api/households', requireAuth, requireRole(['manager', 'collector']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const households = await storage.getHouseholdsByVillage(villageId);
      res.json(households);
    } catch (error) {
      console.error("Get households error:", error);
      res.status(500).json({ message: "Failed to get households" });
    }
  });

  // Get single household by UID (for QR scanning)
  app.get('/api/households/:uid', requireAuth, requireRole(['manager', 'collector']), async (req, res) => {
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
  app.post('/api/households/bulk', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { households: householdsData } = req.body;
      const villageId = req.session.villageId!;

      if (!Array.isArray(householdsData) || householdsData.length === 0) {
        return res.status(400).json({ message: 'Invalid households data' });
      }

      const createdHouseholds = [];
      const { generateGeneratorCredentials, generateHouseholdQR } = await import('./qr-service');

      for (const householdData of householdsData) {
        try {
          // Generate unique UID for household with better logic
          const existingHouseholds = await storage.getHouseholdsByVillage(villageId);
          let uid;
          let counter = existingHouseholds.length + createdHouseholds.length + 1;

          // Keep trying until we find a unique UID
          do {
            uid = `${villageId}-H${String(counter).padStart(3, '0')}`;
            const existing = await storage.getHouseholdByUid(uid);
            if (!existing) break;
            counter++;
          } while (counter <= 999);

          if (counter > 999) {
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

      const { generateHouseholdQR } = await import('./qr-service');
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

      const { generateBulkQRCodesPDF } = await import('./qr-service');
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

  // Collector routes
  app.post('/api/collectors', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { name, phone } = req.body;
      const villageId = req.session.villageId!;

      // Generate UID
      const existingCollectors = await storage.getCollectorsByVillage(villageId);
      const uid = `${villageId}-C${existingCollectors.length + 1}`;

      // Create collector
      const collector = await storage.createCollector({
        uid,
        villageId,
        name,
        phone,
      });

      // Create user account for collector
      const hashedPassword = await bcrypt.hash(uid, 10);
      await storage.createUser({
        userId: uid,
        password: hashedPassword,
        role: 'collector',
        name,
        phone,
        villageId,
      });

      res.json(collector);
    } catch (error) {
      console.error("Create collector error:", error);
      res.status(500).json({ message: "Failed to create collector" });
    }
  });

  app.get('/api/collectors', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const collectors = await storage.getCollectorsByVillage(villageId);
      res.json(collectors);
    } catch (error) {
      console.error("Get collectors error:", error);
      res.status(500).json({ message: "Failed to get collectors" });
    }
  });

  // Waste collection routes
  app.post('/api/waste-collections', requireAuth, requireRole(['collector']), async (req, res) => {
    try {
      const { householdUid, segregationRating, plasticRating, observations, remarks, photoUrl, voiceUrl, status, missedReason } = req.body;

      const household = await storage.getHouseholdByUid(householdUid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const collector = await storage.getCollectorByUid(req.session.userId!);
      if (!collector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      const collection = await storage.createWasteCollection({
        householdId: household.id,
        collectorId: collector.id,
        segregationRating,
        plasticRating,
        observations,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
      });

      res.json(collection);
    } catch (error) {
      console.error("Create waste collection error:", error);
      res.status(500).json({ message: "Failed to create waste collection" });
    }
  });

  app.get('/api/waste-collections/household/:uid', requireAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      const household = await storage.getHouseholdByUid(uid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const collections = await storage.getCollectionsByHousehold(household.id);
      res.json(collections);
    } catch (error) {
      console.error("Get household collections error:", error);
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  // Get collections for generator's household
  app.get('/api/waste-collections/household', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const generatorUserId = req.session.userId!;
      const household = await storage.getHouseholdByGeneratorUserId(generatorUserId);

      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const collections = await storage.getCollectionsByHousehold(household.id);
      res.json(collections);
    } catch (error) {
      console.error("Get generator household collections error:", error);
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  app.get('/api/waste-collections/collector', requireAuth, requireRole(['collector']), async (req, res) => {
    try {
      const collectorUid = req.session.userId!;
      const collector = await storage.getCollectorByUid(collectorUid);

      if (!collector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      const collections = await storage.getCollectionsByCollector(collector.id);
      res.json(collections);
    } catch (error) {
      console.error("Get collector collections error:", error);
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  // File upload routes
  app.post('/api/upload/photo', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { uploadToCloudinary } = await import('./cloudinary');
      const fs = await import('fs');
      const buffer = fs.readFileSync(req.file.path);

      const result = await uploadToCloudinary(buffer, {
        folder: 'collection-photos',
        resource_type: 'image'
      });

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.post('/api/upload/voice', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { uploadToCloudinary } = await import('./cloudinary');
      const fs = await import('fs');
      const buffer = fs.readFileSync(req.file.path);

      const result = await uploadToCloudinary(buffer, {
        folder: 'voice-recordings',
        resource_type: 'auto'
      });

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (error) {
      console.error("Voice upload error:", error);
      res.status(500).json({ message: "Failed to upload voice recording" });
    }
  });

  // Issues routes
  app.post('/api/issues', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const { title, description, category, photoUrl } = req.body;
      const reportedBy = req.session.userId!;
      const villageId = req.session.villageId!;

      // Validate required fields
      if (!title || !description || !category) {
        return res.status(400).json({ 
          message: "Title, description, and category are required",
          missingFields: {
            title: !title,
            description: !description, 
            category: !category
          }
        });
      }

      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      if (trimmedTitle.length === 0 || trimmedDescription.length === 0) {
        return res.status(400).json({ message: "Title and description cannot be empty" });
      }

      if (trimmedTitle.length < 3) {
        return res.status(400).json({ message: "Title must be at least 3 characters long" });
      }

      if (trimmedDescription.length < 10) {
        return res.status(400).json({ message: "Description must be at least 10 characters long" });
      }

      console.log('Creating issue:', { 
        title: trimmedTitle, 
        description: trimmedDescription, 
        category, 
        reportedBy, 
        villageId, 
        photoUrl: photoUrl || 'none' 
      });

      const issue = await storage.createIssue({
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        reportedBy,
        villageId,
        photoUrl: photoUrl || null,
        status: 'open',
      });

      console.log('Issue created successfully with ID:', issue.id);

      res.status(201).json({
        ...issue,
        message: "Issue reported successfully"
      });
    } catch (error) {
      console.error("Create issue error:", error);
      res.status(500).json({ 
        message: "Failed to create issue", 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.get('/api/issues', requireAuth, async (req, res) => {
    try {
      const villageId = req.session.villageId!;

      if (!villageId) {
        return res.status(400).json({ message: "Village ID required" });
      }

      const issues = await storage.getIssuesByVillage(villageId);
      res.json(issues);
    } catch (error) {
      console.error("Get issues error:", error);
      res.status(500).json({ message: "Failed to get issues" });
    }
  });

  app.patch('/api/issues/:id', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const issue = await storage.updateIssue(parseInt(id), updates);
      res.json(issue);
    } catch (error) {
      console.error("Update issue error:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Announcements routes
  app.post('/api/announcements', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { message, targetAudience } = req.body;
      const createdBy = req.session.userId!;
      const villageId = req.session.role === 'admin' ? null : req.session.villageId!;

      const announcement = await storage.createAnnouncement({
        message,
        targetAudience,
        villageId,
        createdBy,
      });

      res.json(announcement);
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.get('/api/announcements', requireAuth, async (req, res) => {
    try {
      let announcements: any[] = [];

      if (req.session.villageId) {
        // Get village-specific announcements
        announcements = await storage.getAnnouncementsByVillage(req.session.villageId);
      }

      // Get global announcements
      const globalAnnouncements = await storage.getGlobalAnnouncements();
      announcements = [...announcements, ...globalAnnouncements];

      // Filter by target audience
      const filteredAnnouncements = announcements.filter(announcement => {
        if (announcement.targetAudience === 'all') return true;
        if (announcement.targetAudience === 'managers' && req.session.role === 'manager') return true;
        if (announcement.targetAudience === 'generators' && req.session.role === 'generator') return true;
        return false;
      });

      res.json(filteredAnnouncements);
    } catch (error) {
      console.error("Get announcements error:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // Manager stats route
  app.get('/api/manager/stats', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const stats = await storage.getVillageStats(villageId);
      res.json(stats);
    } catch (error) {
      console.error("Get manager stats error:", error);
      res.status(500).json({ message: "Failed to get village stats" });
    }
  });

  // Collector assignment routes
  app.post('/api/collector-assignments', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { collectorId, householdId } = req.body;
      const assignedBy = req.session.userId!;

      const assignment = await storage.assignCollectorToHouseholds({
        collectorId,
        householdId,
        assignedBy,
      });

      res.json(assignment);
    } catch (error) {
      console.error("Assign collector error:", error);
      res.status(500).json({ message: "Failed to assign collector" });
    }
  });

  app.get('/api/collector-assignments/:collectorId', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { collectorId } = req.params;
      const assignments = await storage.getCollectorAssignments(parseInt(collectorId));
      res.json(assignments);
    } catch (error) {
      console.error("Get collector assignments error:", error);
      res.status(500).json({ message: "Failed to get collector assignments" });
    }
  });

  // Stats routes
  app.get('/api/stats/admin', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  app.get('/api/stats/moderator', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);

      let totalHouseholds = 0;
      let totalCollectors = 0;
      let totalOpenIssues = 0;
      let totalCollectionsToday = 0;

      for (const village of villages) {
        const stats = await storage.getVillageStats(village.villageId);
        totalHouseholds += stats.totalHouseholds;
        totalCollectors += stats.totalCollectors;
        totalOpenIssues += stats.openIssues;
        totalCollectionsToday += stats.collectionsToday;
      }

      res.json({
        totalVillages: villages.length,
        totalHouseholds,
        totalCollectors,
        totalOpenIssues,
        totalCollectionsToday,
        assignedVillages: villages,
      });
    } catch (error) {
      console.error("Get moderator stats error:", error);
      res.status(500).json({ message: "Failed to get moderator stats" });
    }
  });

  // Get moderator villages
  app.get('/api/moderator/villages', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);
      res.json(villages);
    } catch (error) {
      console.error('Get moderator villages error:', error);
      res.status(500).json({ message: "Failed to get villages" });
    }
  });

  // Get moderator stats (only for assigned villages)
  app.get('/api/moderator/stats', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);
      const villageIds = villages.map(v => v.villageId);

      const stats = await storage.getModeratorStats(villageIds);
      res.json(stats);
    } catch (error) {
      console.error('Get moderator stats error:', error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get reports for moderator villages only
  app.get('/api/moderator/reports', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);
      const villageIds = villages.map(v => v.villageId);

      const { startDate, endDate } = req.query;

      const reports = await storage.getModeratorReports(villageIds, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(reports);
    } catch (error) {
      console.error('Get moderator reports error:', error);
      res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // Create announcement for moderator villages only
  app.post('/api/moderator/announcements', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const { message, targetAudience } = req.body;

      if (!message || !targetAudience) {
        return res.status(400).json({ message: "Message and target audience are required" });
      }

      // Get villages assigned to this moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);

      if (assignedVillages.length === 0) {
        return res.status(400).json({ message: "No villages assigned to moderator" });
      }

      // Create announcements for each assigned village
      const announcements = [];
      for (const village of assignedVillages) {
        const announcement = await storage.createAnnouncement({
          message,
          targetAudience,
          villageId: village.villageId,
          createdBy: moderatorId,
        });
        announcements.push(announcement);
      }

      res.json({ 
        message: `Announcements created successfully for ${announcements.length} villages`, 
        announcements,
        villageCount: announcements.length
      });
    } catch (error) {
      console.error('Create moderator announcement error:', error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Get issues for moderator villages only
  app.get('/api/moderator/issues', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);
      const villageIds = villages.map(v => v.villageId);

      const issues = await storage.getModeratorIssues(villageIds);
      res.json(issues);
    } catch (error) {
      console.error('Get moderator issues error:', error);
      res.status(500).json({ message: "Failed to get issues" });
    }
  });

  // Get collectors for moderator villages only
  app.get('/api/moderator/collectors', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);
      const villageIds = villages.map(v => v.villageId);

      const collectors = await storage.getModeratorCollectors(villageIds);
      res.json(collectors);
    } catch (error) {
      console.error('Get moderator collectors error:', error);
      res.status(500).json({ message: "Failed to get collectors" });
    }
  });

  // Get households for moderator villages only
  app.get('/api/moderator/households', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);
      const villageIds = villages.map(v => v.villageId);

      const households = await storage.getModeratorHouseholds(villageIds);
      res.json(households);
    } catch (error) {
      console.error('Get moderator households error:', error);
      res.status(500).json({ message: "Failed to get households" });
    }
  });

  app.get('/api/stats/village', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const stats = await storage.getVillageStats(villageId);
      res.json(stats);
    } catch (error) {
      console.error("Get village stats error:", error);
      res.status(500).json({ message: "Failed to get village stats" });
    }
  });

  // File upload routes
  app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Admin management routes
  app.get('/api/managers', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const managers = await storage.getManagersList();
      res.json(managers);
    } catch (error) {
      console.error("Get managers error:", error);
      res.status(500).json({ message: "Failed to get managers" });
    }
  });

  app.put('/api/managers/:managerId/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { managerId } = req.params;
      const newPassword = managerId; // Reset to manager ID
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await storage.updateUserPassword(managerId, hashedPassword);

      res.json({ message: "Password reset successfully", newPassword });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.delete('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      await storage.deleteVillage(villageId);

      res.json({ message: "Village deleted successfully" });
    } catch (error) {
      console.error("Delete village error:", error);
      res.status(500).json({ message: "Failed to delete village" });
    }
  });

  app.put('/api/profile', requireAuth, async (req, res) => {
    try {
      const { name, currentPassword, newPassword } = req.body;
      const userId = req.session.userId!;

      const user = await storage.getUserByUserId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (newPassword) {
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(userId, hashedPassword);
      }

      if (name && name !== user.name) {
        await storage.updateUser(userId, { name });
      }

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/reports', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { village, role, startDate, endDate } = req.query;
      const reportData = await storage.generateReport({
        village: village === 'all' ? undefined : village as string,
        role: role === 'all' ? undefined : role as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(reportData);
    } catch (error) {
      console.error("Generate report error:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get('/api/analytics/system', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { village } = req.query;
      const analytics = await storage.getSystemAnalytics(village as string);
      res.json(analytics);
    } catch (error) {
      console.error("Get system analytics error:", error);
      res.status(500).json({ message: "Failed to get system analytics" });
    }
  });

  app.get('/api/analytics/daily', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { village, date } = req.query;
      const dailyData = await storage.getDailyReportData(
        village as string,
        date as string
      );
      res.json(dailyData);
    } catch (error) {
      console.error("Get daily analytics error:", error);
      res.status(500).json({ message: "Failed to get daily analytics" });
    }
  });

  // Moderator-specific API endpoints
  app.get('/api/moderator/reports', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const { role, startDate, endDate } = req.query;

      // Get villages assigned to this moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const villageIds = assignedVillages.map(v => v.villageId);

      if (villageIds.length === 0) {
        return res.json({ villages: [], users: [], collections: [], issues: [] });
      }

      const reportData = await storage.getModeratorReports(villageIds, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(reportData);
    } catch (error) {
      console.error("Generate moderator report error:", error);
      res.status(500).json({ message: "Failed to generate moderator report" });
    }
  });

  app.get('/api/moderator/analytics/system', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;

      // Get villages assigned to this moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const villageIds = assignedVillages.map(v => v.villageId);

      if (villageIds.length === 0) {
        return res.json({ 
          totalCollections: 0, 
          avgRating: 0, 
          villageStats: [],
          totalCollectionsThisWeek: 0,
          averageSegregationRating: 0,
          topPerformingVillages: [],
          collectionTrends: [],
          segregationRateDistribution: [],
          totalVillages: 0,
          totalHouseholds: 0,
          totalCollectors: 0,
          totalCollectionsToday: 0
        });
      }

      // Get comprehensive analytics for moderator villages
      const analytics = await storage.getModeratorSystemAnalytics(villageIds);
      
      // Return the full analytics object directly as it contains all needed data
      const fullAnalytics = {
        ...analytics,
        // Ensure all required fields are present
        totalCollectionsThisWeek: analytics.totalCollectionsThisWeek,
        averageSegregationRating: analytics.averageSegregationRating,
        topPerformingVillages: analytics.topPerformingVillages,
        collectionTrends: analytics.collectionTrends,
        segregationRateDistribution: analytics.segregationRateDistribution
      };

      res.json(fullAnalytics);
    } catch (error) {
      console.error("Get moderator system analytics error:", error);
      res.status(500).json({ message: "Failed to get moderator system analytics" });
    }
  });

  app.get('/api/moderator/analytics/daily', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const { date } = req.query;

      // Get villages assigned to this moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const villageIds = assignedVillages.map(v => v.villageId);

      if (villageIds.length === 0) {
        return res.json({ totalHouses: 0, collected: 0, remaining: 0, avgSegregationRating: 0 });
      }

      const dailyData = await storage.getModeratorDailyReportData(villageIds, date as string);
      res.json(dailyData);
    } catch (error) {
      console.error("Get moderator daily analytics error:", error);
      res.status(500).json({ message: "Failed to get moderator daily analytics" });
    }
  });

  app.post('/api/moderator/announcements', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { message, targetAudience } = req.body;
      const moderatorId = req.session.userId!;

      if (!message || !targetAudience) {
        return res.status(400).json({ message: "Message and target audience are required" });
      }

      // Get villages assigned to this moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);

      if (assignedVillages.length === 0) {
        return res.status(400).json({ message: "No villages assigned to moderator" });
      }

      // Create announcements for each assigned village
      const announcements = [];
      for (const village of assignedVillages) {
        const announcement = await storage.createAnnouncement({
          message,
          targetAudience,
          villageId: village.villageId,
          createdBy: moderatorId,
        });
        announcements.push(announcement);
      }

      res.json({ 
        message: `Announcements created successfully for ${announcements.length} villages`, 
        announcements,
        villageCount: announcements.length
      });
    } catch (error) {
      console.error("Create moderator announcement error:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.get('/api/moderator/village/:villageId/details', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const moderatorId = req.session.userId!;

      // Verify that this village is assigned to the moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this village" });
      }

      const details = await storage.getVillageDetails(villageId);
      
      // Add recent collections data for village performance charts
      const recentCollections = await storage.getRecentCollectionsByVillage(villageId, 7);
      details.recentCollections = recentCollections;
      
      res.json(details);
    } catch (error) {
      console.error("Get moderator village details error:", error);
      res.status(500).json({ message: "Failed to get village details" });
    }
  });

  app.get('/api/moderator/village/:villageId/managers', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const moderatorId = req.session.userId!;

      // Verify that this village is assigned to the moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this village" });
      }

      const managers = await storage.getManagersByVillage(villageId);
      res.json(managers);
    } catch (error) {
      console.error("Get village managers error:", error);
      res.status(500).json({ message: "Failed to get village managers" });
    }
  });

  // Add general moderator managers endpoint
  app.get('/api/moderator/managers', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      
      const allManagers = [];
      for (const village of assignedVillages) {
        const managers = await storage.getManagersByVillage(village.villageId);
        allManagers.push(...managers.map(manager => ({
          ...manager,
          villageName: village.name
        })));
      }
      
      res.json(allManagers);
    } catch (error) {
      console.error("Get moderator managers error:", error);
      res.status(500).json({ message: "Failed to get managers" });
    }
  });

  // Add manager to village for moderator
  app.post('/api/moderator/village/:villageId/managers', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const { managerName, managerPhone } = req.body;
      const moderatorId = req.session.userId!;

      // Verify that this village is assigned to the moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this village" });
      }

      const manager = await storage.addManagerToVillage({
        villageId,
        managerName,
        managerPhone,
      });

      res.json({
        manager: {
          ...manager,
          credentials: {
            userId: manager.userId,
            password: manager.userId // Password is same as userId
          }
        }
      });
    } catch (error) {
      console.error("Add manager error:", error);
      res.status(500).json({ message: "Failed to add manager" });
    }
  });

  // Reset manager password for moderator
  app.put('/api/moderator/managers/:managerId/reset-password', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { managerId } = req.params;
      const moderatorId = req.session.userId!;

      // Get manager details to check village access
      const manager = await storage.getUserByUserId(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(404).json({ message: "Manager not found" });
      }

      // Verify moderator has access to this manager's village
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === manager.villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this manager" });
      }

      const newPassword = managerId; // Reset to manager ID
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(managerId, hashedPassword);

      res.json({ message: "Password reset successfully", newPassword });
    } catch (error) {
      console.error("Reset manager password error:", error);
      res.status(500).json({ message: "Failed to reset manager password" });
    }
  });

  // Delete manager for moderator
  app.delete('/api/moderator/managers/:managerId', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { managerId } = req.params;
      const moderatorId = req.session.userId!;

      // Get manager details to check village access
      const manager = await storage.getUserByUserId(managerId);
      if (!manager || manager.role !== 'manager') {
        return res.status(404).json({ message: "Manager not found" });
      }

      // Verify moderator has access to this manager's village
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === manager.villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this manager" });
      }

      await storage.deleteUser(managerId);
      res.json({ message: "Manager deleted successfully" });
    } catch (error) {
      console.error("Delete manager error:", error);
      res.status(500).json({ message: "Failed to delete manager" });
    }
  });

  app.get('/api/moderator/village/:villageId/issues', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const moderatorId = req.session.userId!;

      // Verify that this village is assigned to the moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this village" });
      }

      const issues = await storage.getIssuesByVillage(villageId);
      res.json(issues);
    } catch (error) {
      console.error("Get village issues error:", error);
      res.status(500).json({ message: "Failed to get village issues" });
    }
  });

  app.patch('/api/moderator/issues/:id', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const moderatorId = req.session.userId!;

      // Get the issue to verify village access
      const issue = await storage.getIssueById(parseInt(id));
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Verify that this village is assigned to the moderator
      const assignedVillages = await storage.getModeratorVillages(moderatorId);
      const isAssigned = assignedVillages.some(v => v.villageId === issue.villageId);

      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied to this village" });
      }

      const updatedIssue = await storage.updateIssue(parseInt(id), updates);
      res.json(updatedIssue);
    } catch (error) {
      console.error("Update issue error:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.get('/api/villages/:villageId/details', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const details = await storage.getVillageDetails(villageId);
      res.json(details);
    } catch (error) {
      console.error("Get village details error:", error);
      res.status(500).json({ message: "Failed to get village details" });
    }
  });

  app.post('/api/villages/:villageId/managers', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const { managerName, managerPhone } = req.body;

      const manager = await storage.addManagerToVillage({
        villageId,
        managerName,
        managerPhone,
      });

      res.json({
        manager: {
          ...manager,
          credentials: {
            userId: manager.userId,
            password: manager.userId // Password is same as userId
          }
        }
      });
    } catch (error) {
      console.error("Add manager error:", error);
      res.status(500).json({ message: "Failed to add manager" });
    }
  });

  app.delete('/api/managers/:managerId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { managerId } = req.params;
      await storage.deleteUser(managerId);
      res.json({ message: "Manager deleted successfully" });
    } catch (error) {
      console.error("Delete manager error:", error);
      res.status(500).json({ message: "Failed to delete manager" });
    }
  });

  app.put('/api/managers/:managerId/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { managerId } = req.params;
      const newPassword = managerId; // Reset to userId
      await storage.updateUserPassword(managerId, newPassword);
      res.json({ newPassword });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Moderator routes
  app.post('/api/moderators', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { name, phone, email, villageIds = [] } = req.body;
      const createdBy = req.session.userId!;

      // Generate moderator ID
      const existingModerators = await storage.getModeratorsList();
      const moderatorNumber = existingModerators.length + 1;
      const moderatorId = `MOD-${String(moderatorNumber).padStart(3, '0')}`;

      // Create moderator
      const moderator = await storage.createModerator({
        moderatorId,
        name,
        phone,
        email,
        createdBy,
      });

      // Assign villages if provided
      for (const villageId of villageIds) {
        await storage.assignVillageToModerator({
          moderatorId,
          villageId,
          assignedBy: createdBy,
        });
      }

      res.json({
        moderator,
        credentials: {
          userId: moderatorId,
          password: moderatorId,
        },
      });
    } catch (error) {
      console.error("Create moderator error:", error);
      res.status(500).json({ message: "Failed to create moderator" });
    }
  });

  app.get('/api/moderators', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const moderators = await storage.getModeratorsList();

      // Get village assignments for each moderator
      const moderatorsWithVillages = await Promise.all(
        moderators.map(async (moderator) => {
          const villages = await storage.getModeratorVillages(moderator.moderatorId);
          return { ...moderator, villages };
        })
      );

      res.json(moderatorsWithVillages);
    } catch (error) {
      console.error("Get moderators error:", error);
      res.status(500).json({ message: "Failed to get moderators" });
    }
  });

  app.put('/api/moderators/:moderatorId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const updates = req.body;

      const moderator = await storage.updateModerator(moderatorId, updates);
      res.json(moderator);
    } catch (error) {
      console.error("Update moderator error:", error);
      res.status(500).json({ message: "Failed to update moderator" });
    }
  });

  app.delete('/api/moderators/:moderatorId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      await storage.deleteModerator(moderatorId);
      res.json({ message: "Moderator deleted successfully" });
    } catch (error) {
      console.error("Delete moderator error:", error);
      res.status(500).json({ message: "Failed to delete moderator" });
    }
  });

  app.post('/api/moderators/:moderatorId/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const { villageId } = req.body;
      const assignedBy = req.session.userId!;

      const assignment = await storage.assignVillageToModerator({
        moderatorId,
        villageId,
        assignedBy,
      });

      res.json(assignment);
    } catch (error) {
      console.error("Assign village to moderator error:", error);
      res.status(500).json({ message: "Failed to assign village to moderator" });
    }
  });

  app.delete('/api/moderators/:moderatorId/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId, villageId } = req.params;
      await storage.removeVillageFromModerator(moderatorId, villageId);
      res.json({ message: "Village removed from moderator successfully" });
    } catch (error) {
      console.error("Remove village from moderator error:", error);
      res.status(500).json({ message: "Failed to remove village from moderator" });
    }
  });

  app.get('/api/moderators/:moderatorId/villages', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const villages = await storage.getModeratorVillages(moderatorId);
      res.json(villages);
    } catch (error) {
      console.error("Get moderator villages error:", error);
      res.status(500).json({ message: "Failed to get moderator villages" });
    }
  });

  app.put('/api/moderators/:moderatorId/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const newPassword = moderatorId; // Reset to moderator ID
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(moderatorId, hashedPassword);
      res.json({ newPassword });
    } catch (error) {
      console.error("Reset moderator password error:", error);
      res.status(500).json({ message: "Failed to reset moderator password" });
    }
  });

  // Enhanced collector management routes
  app.get('/api/collectors/stats/:villageId', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const collectors = await storage.getCollectorsByVillage(villageId);

      const collectorStats = await Promise.all(
        collectors.map(async (collector) => {
          const stats = await storage.getCollectorStats(collector.id);
          return {
            id: collector.id,
            name: collector.name,
            ...stats,
          };
        })
      );

      res.json(collectorStats);
    } catch (error) {
      console.error("Get collector stats error:", error);
      res.status(500).json({ message: "Failed to get collector stats" });
    }
  });

  // Detailed attendance routes
  app.post('/api/attendance/detailed', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const attendanceData = req.body;
      const attendance = await storage.markDetailedAttendance(attendanceData);
      res.json(attendance);
    } catch (error) {
      console.error("Mark detailed attendance error:", error);
      res.status(500).json({ message: "Failed to mark detailed attendance" });
    }
  });

  app.get('/api/attendance/detailed/:villageId/:date', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { villageId, date } = req.params;

      // Parse date more safely
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const parsedDate = new Date(date + 'T00:00:00.000Z');

      // Validate date
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const attendance = await storage.getDetailedAttendanceByVillageAndDate(villageId, parsedDate);
      res.json(attendance);
    } catch (error) {
      console.error("Get detailed attendance error:", error);
      res.status(500).json({ message: "Failed to get detailed attendance" });
    }
  });

  // Collector complaint routes
  app.post('/api/complaints', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const { collectorId, complaint } = req.body;
      const user = await storage.getUserByUserId(req.session.userId!);
      const household = await storage.getHouseholdByGeneratorUserId(req.session.userId!);

      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const newComplaint = await storage.createCollectorComplaint({
        collectorId,
        householdId: household.id,
        complaint,
      });

      res.json(newComplaint);
    } catch (error) {
      console.error("Create complaint error:", error);
      res.status(500).json({ message: "Failed to create complaint" });
    }
  });

  app.get('/api/complaints/:villageId', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const complaints = await storage.getComplaintsByVillage(villageId);
      res.json(complaints);
    } catch (error) {
      console.error("Get complaints error:", error);
      res.status(500).json({ message: "Failed to get complaints" });
    }
  });

  // New API routes for manager real-time management
  app.get('/api/waste-collections/village', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { date, householdId } = req.query;

      const collections = await storage.getCollectionsByVillageWithDetails(
        villageId,
        date as string,
        householdId ? parseInt(householdId as string) : undefined
      );

      res.json(collections);
    } catch (error) {
      console.error("Get village collections error:", error);
      res.status(500).json({ message: "Failed to get village collections" });
    }
  });

  app.put('/api/issues/:id', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, managerReply } = req.body;

      const updatedIssue = await storage.updateIssue(parseInt(id), {
        status,
        managerReply,
        updatedAt: new Date(),
      });

      res.json(updatedIssue);
    } catch (error) {
      console.error("Update issue error:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.put('/api/complaints/:complaintId/resolve', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { complaintId } = req.params;
      const { managerResponse } = req.body;

      await storage.resolveCollectorComplaint(parseInt(complaintId), managerResponse);

      res.json({ message: "Complaint resolved successfully" });
    } catch (error) {
      console.error("Resolve complaint error:", error);
      res.status(500).json({ message: "Failed to resolve complaint" });
    }
  });

  // Feedback routes
  app.post('/api/feedback', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const { collectionId, rating, remarks } = req.body;
      const generatedBy = req.session.userId!;

      // Validate the collection belongs to this generator's household
      const collection = await storage.getCollectionById(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      const household = await storage.getHouseholdByGeneratorUserId(generatedBy);
      if (!household || collection.householdId !== household.id) {
        return res.status(403).json({ message: "Unauthorized to provide feedback for this collection" });
      }

      // Get collector from the collection (collectorId is the actual ID, not UID)
      const collector = await storage.getCollectorsByVillage(household.villageId);
      const targetCollector = collector.find(c => c.id === collection.collectorId);
      if (!targetCollector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      // Check if feedback already exists for this household-collector pair
      const existingFeedback = await storage.getFeedbackByHouseholdAndCollector(household.id, targetCollector.id);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback already submitted for this collector" });
      }

      const feedbackData = await storage.createFeedback({
        fromHouseholdId: household.id,
        toCollectorId: targetCollector.id,
        rating,
        remarks: remarks || null,
      });

      res.json(feedbackData);
    } catch (error) {
      console.error("Create feedback error:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get('/api/feedback/village', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { date } = req.query;

      const feedback = await storage.getFeedbackByVillageWithFilters(villageId, date as string);
      res.json(feedback);
    } catch (error) {
      console.error("Get village feedback error:", error);
      res.status(500).json({ message: "Failed to get village feedback" });
    }
  });

  // Serve manifest.json
  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(path.resolve("public/manifest.json"));
  });

  // Serve PWA icons
  app.get("/icons/:iconName", (req, res) => {
    const iconName = req.params.iconName;
    const iconPath = path.resolve(`public/icons/${iconName}`);

    try {
      const iconBuffer = readFileSync(iconPath);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Length", iconBuffer.length.toString());
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(iconBuffer);
    } catch (error) {
      console.error(`Icon not found: ${iconPath}`);
      res.status(404).json({ error: "Icon not found" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Serve static files from public directory
  app.use(express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true
  }));

  const httpServer = createServer(app);
  return httpServer;
}