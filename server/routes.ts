import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import multer from "multer";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { insertUserSchema, insertVillageSchema, insertHouseholdSchema, insertCollectorSchema, insertWasteCollectionSchema, insertIssueSchema, insertAnnouncementSchema, insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";
import { getQueueStats, scheduleReportGeneration } from "./jobs";
import { getCache, cacheKeys } from "./cache";

// Configure multer for file uploads with enhanced security
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file per request
    fieldSize: 1024 * 1024, // 1MB field size limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types for different upload types
    const allowedMimeTypes = {
      photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      voice: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'],
      document: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] // For manager proof photos
    };

    // Determine upload type from route
    const uploadType = req.route?.path?.includes('photo') ? 'photo' :
                      req.route?.path?.includes('voice') ? 'voice' : 'document';
    
    const allowed = allowedMimeTypes[uploadType] || allowedMimeTypes.photo;
    
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed types: ${allowed.join(', ')}`));
    }

    // Additional filename validation
    const allowedExtensions = /\.(jpg|jpeg|png|webp|mp3|wav|ogg|webm)$/i;
    if (!allowedExtensions.test(file.originalname)) {
      return cb(new Error('Invalid file extension'));
    }

    cb(null, true);
  }
});

// Extend express session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: string;
    villageId?: string;
    csrfToken?: string;
  }
}

// Generate cryptographically secure CSRF token
const generateCsrfToken = (): string => {
  return randomBytes(32).toString('hex');
};

// CSRF protection middleware - validates token on state-changing requests
const csrfProtection = (req: any, res: any, next: any) => {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for public endpoints that don't require auth
  const publicEndpoints = [
    '/api/website-feedback',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/contact',
    '/api/newsletter',
    '/api/auth/csrf-token'
  ];
  // Normalize path by removing trailing slash for exact comparison
  const normalizedPath = req.path.replace(/\/$/, '');
  if (publicEndpoints.includes(normalizedPath)) {
    return next();
  }

  // Skip CSRF for unauthenticated requests (they can't do anything sensitive anyway)
  if (!req.session?.userId) {
    return next();
  }

  // Get token from header
  const headerToken = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!headerToken || !sessionToken || headerToken !== sessionToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  next();
};

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

// Cross-village authorization middleware
const requireVillageAccess = (req: any, res: any, next: any) => {
  const requestedVillageId = req.params.villageId || req.body.villageId || req.query.villageId;
  const userVillageId = req.session?.villageId;
  const userRole = req.session?.role;

  // Admins can access all villages
  if (userRole === 'admin') {
    return next();
  }

  // Moderators can access their assigned villages (check will be done in storage layer)
  if (userRole === 'moderator') {
    return next();
  }

  // Other roles must match village
  if (requestedVillageId && userVillageId && requestedVillageId !== userVillageId) {
    return res.status(403).json({ message: "Access denied: Village mismatch" });
  }

  next();
};

// Input validation and sanitization middleware
const validateInput = (req: any, res: any, next: any) => {
  // Sanitize string inputs
  const sanitizeString = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>'"]/g, ''); // Basic XSS prevention
  };

  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for production');
  }

  // Initialize session store (Redis or memory fallback)
  let sessionStore: any = undefined;
  
  if (process.env.REDIS_URL) {
    try {
      const redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('❌ Redis session store: max retries exceeded');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis session store connected');
      });

      redisClient.on('error', (err: Error) => {
        console.error('❌ Redis session store error:', err.message);
      });

      // Connect synchronously-ish by starting connection
      redisClient.connect().catch((err: Error) => {
        console.error('❌ Redis session store connection failed:', err.message);
      });

      sessionStore = new RedisStore({ 
        client: redisClient,
        prefix: 'greenpath:sess:',
      });
      console.log('🟢 Using Redis session store');
    } catch (error) {
      console.warn('⚠️ Redis session store not available, falling back to memory store:', (error as Error).message);
    }
  }

  if (!sessionStore) {
    console.log('🟠 Using memory session store (not recommended for production)');
  }

  // Production-ready session configuration
  const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'greenpath.sid',
    rolling: true, // Reset expiry on each request
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours default
      sameSite: 'strict' as const // CSRF protection
    },
    ...(sessionStore && { store: sessionStore })
  };

  app.use(session(sessionConfig));

  // Apply input validation middleware to all routes except static assets
  app.use('/api', validateInput);

  // Apply CSRF protection to all API routes
  app.use('/api', csrfProtection);

  // Public API routes (no authentication required)
  // Website feedback submission with enhanced validation
  app.post('/api/website-feedback', async (req, res) => {
    try {
      const { name, email, feedbackType, message } = req.body;

      // Enhanced validation
      if (!name || !email || !feedbackType || !message) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Length validation
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
      }

      if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
      }

      const feedback = await storage.createWebsiteFeedback({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        feedbackType,
        message: message.trim(),
      });

      res.status(201).json({ 
        message: 'Feedback submitted successfully',
        id: feedback.id 
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Contact form submission with enhanced validation
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'Name, email, subject, and message are required' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Phone validation (if provided)
      if (phone && phone.trim() !== '') {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
          return res.status(400).json({ message: 'Invalid phone number format' });
        }
      }

      // Length validation
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
      }

      if (subject.length < 3 || subject.length > 200) {
        return res.status(400).json({ message: 'Subject must be between 3 and 200 characters' });
      }

      if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
      }

      const contact = await storage.createContactSubmission({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        subject: subject.trim(),
        message: message.trim(),
      });

      res.status(201).json({ 
        message: 'Message sent successfully',
        id: contact.id 
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Health check endpoints for load balancers and monitoring
  app.get('/api/health', async (req, res) => {
    const startTime = Date.now();

    try {
      // Only check database if explicitly requested with ?db=true
      const checkDb = req.query.db === 'true';
      let dbHealth = true;
      let dbStats = null;

      if (checkDb) {
        // Import database health check
        const { checkDatabaseHealth, getDatabaseStats } = await import('./db');
        
        // Check database connectivity
        dbHealth = await checkDatabaseHealth();
        dbStats = await getDatabaseStats();
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // System uptime
      const uptime = process.uptime();

      const healthData = {
        status: dbHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: checkDb ? {
          connected: dbHealth,
          stats: dbStats
        } : {
          connected: 'not_checked',
          stats: 'not_checked'
        },
        system: {
          uptime: Math.round(uptime),
          memory: memUsageMB,
          nodeVersion: process.version,
          platform: process.platform
        },
        services: {
          redis: !!process.env.REDIS_URL,
          cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
        }
      };

      res.status(dbHealth ? 200 : 503).json(healthData);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime
      });
    }
  });

  // Readiness probe for Kubernetes-style deployments
  app.get('/api/ready', async (req, res) => {
    try {
      const { checkDatabaseHealth } = await import('./db');
      const dbHealth = await checkDatabaseHealth();

      if (dbHealth) {
        res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ ready: false, reason: 'Database not ready' });
      }
    } catch (error) {
      res.status(503).json({ ready: false, reason: 'Service not ready' });
    }
  });

  // Liveness probe
  app.get('/api/alive', (req, res) => {
    res.status(200).json({ 
      alive: true, 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Performance metrics endpoint
  app.get('/api/metrics', requireAuth, async (req, res) => {
    try {
      const { getDatabaseStats } = await import('./db');
      const dbStats = await getDatabaseStats();
      const memUsage = process.memoryUsage();

      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: memUsage,
          cpu: process.cpuUsage(),
          nodeVersion: process.version
        },
        database: dbStats,
        environment: process.env.NODE_ENV
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });

  // Lazy initialization function for admin user
  // async function ensureAdminUser() {
  //   try {
  //     const adminUser = await storage.getUserByUserId('ADMIN');
  //     if (!adminUser) {
  //       await storage.createUser({
  //         userId: 'ADMIN',
  //         password: await bcrypt.hash('admin', 10),
  //         role: 'admin',
  //         name: 'Administrator',
  //         villageId: null,
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Failed to initialize admin user:', error);
  //   }
  // }

  // CSRF token endpoint - provides token for authenticated sessions
  app.get('/api/auth/csrf-token', (req, res) => {
    // Generate new CSRF token and store in session
    const token = generateCsrfToken();
    req.session.csrfToken = token;
    res.json({ csrfToken: token });
  });

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { userId, password } = req.body;

      // Initialize admin user only when someone attempts to login
      // await ensureAdminUser();

      const user = await storage.getUserByUserId(userId);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session to prevent session fixation attacks
      // This must succeed for security - we fail closed if it doesn't work
      const regenerateSession = () => new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Save session after setting values
      const saveSession = () => new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save failed:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Session regeneration must succeed - fail closed for security
      await regenerateSession();

      // Set session data after regeneration
      req.session.userId = user.userId;
      req.session.role = user.role;
      req.session.villageId = user.villageId ?? undefined;

      // Generate new CSRF token for the session
      const csrfToken = generateCsrfToken();
      req.session.csrfToken = csrfToken;

      // Explicitly save session to ensure data is persisted
      await saveSession();

      res.json({
        user: {
          userId: user.userId,
          role: user.role,
          name: user.name,
          villageId: user.villageId,
          isFirstLogin: user.isFirstLogin,
        },
        csrfToken
      });
    } catch (error) {
      console.error('Login error:', error);
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

  app.get('/api/auth/user', (req, res) => {
    // Check session first without hitting database
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only hit database if user is actually logged in
    storage.getUserByUserId(req.session.userId)
      .then(user => {
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
      })
      .catch(error => {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Failed to get user" });
      });
  });

  // Vehicle Management Routes
  app.post('/api/villages/:villageId/vehicles', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
    try {
      const { registrationNumber, name, collectorIds } = req.body;
      if (!registrationNumber || !name) {
        return res.status(400).json({ message: "Registration number and name are required" });
      }

      await storage.addVehicleToVillage(req.params.villageId, {
        registrationNumber,
        name,
        collectorIds: collectorIds || []
      });

      res.status(201).json({ message: "Vehicle added successfully" });
    } catch (error: any) {
      console.error("Add vehicle error:", error);
      res.status(500).json({ message: error.message || "Failed to add vehicle" });
    }
  });

  app.patch('/api/villages/:villageId/vehicles/:registrationNumber', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
    try {
      const { name, collectorIds } = req.body;
      await storage.updateVehicleInVillage(req.params.villageId, req.params.registrationNumber, {
          name,
        collectorIds: collectorIds || []
        });
      res.json({ message: "Vehicle updated successfully" });
    } catch (error: any) {
      console.error("Update vehicle error:", error);
      res.status(500).json({ message: error.message || "Failed to update vehicle" });
    }
  });

  app.delete('/api/villages/:villageId/vehicles/:registrationNumber', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
    try {
      await storage.removeVehicleFromVillage(req.params.villageId, req.params.registrationNumber);
      res.json({ message: "Vehicle removed successfully" });
    } catch (error: any) {
      console.error("Remove vehicle error:", error);
      res.status(500).json({ message: error.message || "Failed to remove vehicle" });
    }
  });

  app.patch('/api/collectors/:collectorId/vehicle', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const { registrationNumber } = req.body;
      const collectorId = parseInt(req.params.collectorId);
      
      await storage.updateCollectorVehicle(collectorId, registrationNumber);
      res.json({ message: "Collector vehicle updated successfully" });
    } catch (error: any) {
      console.error("Update collector vehicle error:", error);
      res.status(500).json({ message: error.message || "Failed to update collector vehicle" });
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

      // Extract just the numeric parts from all village IDs (e.g., 'V013' → 13)
      const maxIdNumber = villages.reduce((max, v) => {
        const num = parseInt(v.villageId?.slice(1) || "0");
        return num > max ? num : max;
      }, 0);

      // Assign the next unique ID
      const villageId = `V${String(maxIdNumber + 1).padStart(3, '0')}`;


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
        villages.slice(0, 50).map(async (village) => { // Limit to first 50 for performance
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

  // Paginated villages endpoint
  app.get('/api/villages/paginated', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const search = req.query.search as string;

      const result = await storage.getVillagesPaginated({ page, limit, search });
      
      // Get stats for the paginated results (parallel processing)
      const villagesWithStats = await Promise.all(
        result.data.map(async (village) => {
          const stats = await storage.getVillageStats(village.villageId);
          return { ...village, ...stats };
        })
      );

      res.json({
        ...result,
        data: villagesWithStats
      });
    } catch (error) {
      console.error("Get paginated villages error:", error);
      res.status(500).json({ message: "Failed to get villages" });
    }
  });

  app.get('/api/villages/:villageId', requireAuth, requireRole(['admin', 'manager', 'collector', 'generator','fieldworker']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const village = await storage.getVillageByVillageId(villageId);

      if (!village) {
        return res.status(404).json({ message: "Village not found" });
      }

      res.json(village);
    } catch (error) {
      console.error("Get village error:", error);
      res.status(500).json({ message: "Failed to get village" });
    }
  });

  // Get wards for a village
  app.get('/api/villages/:villageId/wards', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const wards = await storage.getWardsByVillage(villageId);
      res.json(wards);
    } catch (error) {
      console.error("Get wards error:", error);
      res.status(500).json({ message: "Failed to get wards" });
    }
  });

  // Add ward for a village
  app.post('/api/villages/:villageId/wards', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const { ward } = req.body;
      
      if (!ward || ward.trim() === '') {
        return res.status(400).json({ message: "Ward name is required" });
      }
      
      const updatedWards = await storage.addWardToVillage(villageId, ward.trim());
      
      res.json({ message: "Ward added successfully", wards: updatedWards });
    } catch (error: any) {
      console.error("Add ward error:", error);
      if (error.message === "Ward already exists") {
        return res.status(400).json({ message: "Ward already exists" });
      }
      res.status(500).json({ message: "Failed to add ward" });
    }
  });

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
      const { generateGeneratorCredentials, generateHouseholdQR } = await import('./qr-service');

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

  // Mark QR codes as printed
  app.post('/api/qr-codes/mark-printed', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { householdIds } = req.body;

      if (!Array.isArray(householdIds) || householdIds.length === 0) {
        return res.status(400).json({ message: 'Invalid household IDs' });
      }

      await storage.markQRCodesPrinted(householdIds);
      res.json({ message: 'QR codes marked as printed successfully' });
    } catch (error) {
      console.error('Error marking QR codes as printed:', error);
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

  // Paginated collectors endpoint
  app.get('/api/collectors/paginated', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const villageId = req.session.villageId || req.query.villageId as string;
      if (!villageId) {
        return res.status(400).json({ message: "Village ID required" });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const search = req.query.search as string;

      const result = await storage.getCollectorsByVillagePaginated(villageId, { page, limit, search });
      res.json(result);
    } catch (error) {
      console.error("Get paginated collectors error:", error);
      res.status(500).json({ message: "Failed to get collectors" });
    }
  });

  // Field Worker routes
  app.get('/api/fieldworkers', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const fieldworkers = await storage.getFieldWorkersByVillage(villageId);
      res.json(fieldworkers);
    } catch (error) {
      console.error("Get fieldworkers error:", error);
      res.status(500).json({ message: "Failed to get field workers" });
    }
  });

app.post(
  '/api/fieldworkers',
  requireAuth,
  requireRole(['manager']),
  async (req, res) => {
    try {
      const { name, phone } = req.body;
      const villageId = req.session.villageId!;

      // Get existing fieldworkers (same as before)
      const existingFieldWorkers = await storage.getFieldWorkersByVillage(villageId);

      /**
       * Find the highest FW number ever used
       * Example userId: V002-FW007 -> 7
       */
      let maxNumber = 0;

      for (const fw of existingFieldWorkers) {
        const match = fw.userId?.match(/FW(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }

      const nextNumber = maxNumber + 1;

      // Generate UID: V001-FW001, V001-FW002, etc.
      const uid = `${villageId}-FW${String(nextNumber).padStart(3, '0')}`;

      // Create user account for field worker
      const hashedPassword = await bcrypt.hash(uid, 10);

      const fieldworker = await storage.createUser({
        userId: uid,
        password: hashedPassword,
        role: 'fieldworker',
        name,
        phone,
        villageId,
      });

      res.status(201).json(fieldworker);
    } catch (error: any) {
      console.error('Create fieldworker error:', error);

      if (error.code === '23505') {
        return res.status(409).json({
          message: 'Fieldworker already exists. Please retry.',
        });
      }

      res.status(500).json({
        message: 'Failed to create field worker',
      });
    }
  }
);


  app.delete('/api/fieldworkers/:userId', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { userId } = req.params;
      const villageId = req.session.villageId!;

      // Verify the fieldworker belongs to the manager's village
      const user = await storage.getUserByUserId(userId);
      if (!user || user.villageId !== villageId || user.role !== 'fieldworker') {
        return res.status(404).json({ message: "Field worker not found" });
      }

      await storage.deleteFieldWorker(userId);
      res.json({ message: "Field worker deleted successfully" });
    } catch (error) {
      console.error("Delete fieldworker error:", error);
      res.status(500).json({ message: "Failed to delete field worker" });
    }
  });

  // Pre-mapped QR Code routes (for field worker mapping)
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

  app.get('/api/qr-codes/unmapped', requireAuth, requireRole(['manager', 'fieldworker']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const qrCodes = await storage.getUnmappedQRCodesByVillage(villageId);
      res.json(qrCodes);
    } catch (error) {
      console.error("Get unmapped QR codes error:", error);
      res.status(500).json({ message: "Failed to get unmapped QR codes" });
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

  // Field worker map household route
  app.post('/api/qr-codes/:uid/map', requireAuth, requireRole(['fieldworker']), async (req, res) => {
    try {
      const { uid } = req.params;
      const { headName, phone, houseNumber, ward, familySize, address } = req.body;
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
    } catch (error) {
      console.error("Map QR code error:", error);
      res.status(500).json({ message: "Failed to map QR code" });
    }
  });

  // Waste collection routes
  app.post('/api/waste-collections', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
    try {
      const { 
        householdUid, 
        segregationRating, 
        plasticRating, 
        observations, 
        remarks, 
        photoUrl, 
        voiceUrl, 
        status, 
        missedReason,
        collectionDate: clientCollectionDate
      } = req.body;

      const household = await storage.getHouseholdByUid(householdUid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const collector = await storage.getCollectorByUid(req.session.userId!);
      if (!collector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      // Check for existing collection today
      const collectionDate = clientCollectionDate ? new Date(clientCollectionDate) : new Date();
      const dateStr = collectionDate.toISOString().split('T')[0];
      const existingCollection = await storage.checkExistingCollection(household.id, collector.id, dateStr);
      
      if (existingCollection) {
        return res.status(409).json({ 
          message: "Collection already recorded for this household today",
          existingCollection 
        });
      }

      const collection = await storage.createWasteCollection({
        householdId: household.id,
        collectorId: collector.id,
        collectionDate,
        segregationRating,
        plasticRating,
        observations,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      });

      // Phase 4: Invalidate relevant caches
      const cache = getCache();
      await cache.delete(cacheKeys.adminStats());
      await cache.delete(cacheKeys.villageStats(household.villageId));
      await cache.delete(cacheKeys.dailyReport(household.villageId, new Date().toISOString().split('T')[0]));
      await cache.clear('report:*'); // Clear all report caches

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

  // Get household data for logged-in generator
  app.get('/api/generator/household', async (req, res) => {
    try {
      // Simple auth check
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Please log in" });
      }

      const userId = req.session.userId;
      console.log('Generator household request for:', userId);

      // Get user to verify they're a generator
      const user = await storage.getUserByUserId(userId);
      if (!user || user.role !== 'generator') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Find household by generator user ID
      const household = await storage.getHouseholdByGeneratorUserId(userId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      console.log('Found household:', household.uid, 'QR Code:', !!household.qrCodeUrl);
      res.json(household);
    } catch (error) {
      console.error('Get generator household error:', error);
      res.status(500).json({ message: "Server error" });
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

  // Manager proof photo upload for issue updates
  app.post('/api/upload/manager-proof', requireAuth, requireRole(['manager', 'admin']), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { uploadToCloudinary } = await import('./cloudinary');
      const fs = await import('fs');
      const buffer = fs.readFileSync(req.file.path);

      const result = await uploadToCloudinary(buffer, {
        folder: 'manager-proof-photos',
        resource_type: 'image'
      });

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (error) {
      console.error("Manager proof photo upload error:", error);
      res.status(500).json({ message: "Failed to upload manager proof photo" });
    }
  });

  // Issues routes
  app.post('/api/issues', requireAuth, requireRole(['generator','collector']), requireVillageAccess, async (req, res) => {
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

  app.get('/api/issues/paginated', requireAuth, async (req, res) => {
    try {
      const villageId = req.session.villageId!;

      if (!villageId) {
        return res.status(400).json({ message: "Village ID required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      const result = await storage.getIssuesByVillagePaginated(villageId, {
        page,
        limit,
        status
      });
      res.json(result);
    } catch (error) {
      console.error("Get paginated issues error:", error);
      res.status(500).json({ message: "Failed to get issues" });
    }
  });

  app.patch('/api/issues/:id', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, managerReply, managerProofPhotoUrl } = req.body;

      // If status is being changed to in_progress or resolved, require proof photo
      if ((status === 'in_progress' || status === 'resolved') && !managerProofPhotoUrl) {
        return res.status(400).json({ 
          message: "Proof photo is required when updating issue status to 'In Progress' or 'Resolved'" 
        });
      }

      const updates = {
        status,
        managerReply,
        ...(managerProofPhotoUrl && { managerProofPhotoUrl }),
        updatedAt: new Date()
      };

      const issue = await storage.updateIssue(parseInt(id), updates);
      
      // Invalidate issues caches
      const cache = getCache();
      const villageId = req.session.villageId;
      if (villageId) {
        await cache.delete(cacheKeys.issues(villageId));
        await cache.clear(`issues:${villageId}:*`); // Clear paginated caches
        await cache.delete(cacheKeys.villageDetails(villageId)); // Clear village details cache
      }
      
      res.json(issue);
    } catch (error) {
      console.error("Update issue error:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Announcements routes
  app.post('/api/announcements', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { message, targetAudience, villageId: requestVillageId, photoUrl } = req.body;
      const createdBy = req.session.userId!;
      const villageId = req.session.role === 'admin' ? (requestVillageId || null) : req.session.villageId!;

      const announcement = await storage.createAnnouncement({
        message,
        targetAudience,
        villageId,
        createdBy,
        photoUrl: photoUrl || null,
      });

      res.json(announcement);
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Admin route to get all announcements
  app.get('/api/admin/announcements', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Get all announcements error:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // Paginated announcements endpoint
  app.get('/api/admin/announcements/paginated', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const villageId = req.query.villageId as string;

      const result = await storage.getAllAnnouncementsPaginated({ page, limit, villageId });
      res.json(result);
    } catch (error) {
      console.error("Get paginated announcements error:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // Update announcement
  app.put('/api/announcements/:id', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const { message, targetAudience, photoUrl } = req.body;
      const userId = req.session.userId!;

      const updatedAnnouncement = await storage.updateAnnouncement(id, {
        message,
        targetAudience,
        photoUrl,
        updatedBy: userId,
      });

      res.json(updatedAnnouncement);
    } catch (error) {
      console.error("Update announcement error:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  // Delete announcement
  app.delete('/api/announcements/:id', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;

      await storage.deleteAnnouncement(id, userId);
      res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
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
      const { message, targetAudience, photoUrl } = req.body;

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
          photoUrl: photoUrl || null,
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

  // Paginated managers endpoint
  app.get('/api/managers/paginated', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const search = req.query.search as string;
      const villageId = req.query.villageId as string;

      const result = await storage.getManagersListPaginated({ page, limit, search, villageId });
      res.json(result);
    } catch (error) {
      console.error("Get paginated managers error:", error);
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

  // Update village settings (including image upload requirement)
  app.put('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const updates = req.body;

      const village = await storage.updateVillage(villageId, updates);

      res.json({ message: "Village updated successfully", village });
    } catch (error) {
      console.error("Update village error:", error);
      res.status(500).json({ message: "Failed to update village" });
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
      const { village } = req.query;

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

      // Get comprehensive analytics for moderator villages with village filter
      const selectedVillageId = village === 'all' ? undefined : village as string;
      const analytics = await storage.getModeratorSystemAnalytics(villageIds, selectedVillageId);

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
      const { message, targetAudience, photoUrl } = req.body;
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
          photoUrl: photoUrl || null,
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

  app.get('/api/villages/:villageId/details', requireAuth, requireRole(['admin']), requireVillageAccess, async (req, res) => {
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

      // Generate moderator ID safely
      const existingModerators = await storage.getModeratorsList();

      // Extract existing numbers from IDs like "MOD-001"
      const usedNumbers = existingModerators
        .map((mod) => {
          const match = mod.moderatorId.match(/MOD-(\d+)/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

      // Find the first available number
      let moderatorNumber = 1;
      for (const n of usedNumbers) {
        if (n === moderatorNumber) {
          moderatorNumber++;
        } else {
          break;
        }
      }

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

      // Get village assignments for each moderator (limited to first 50 for performance)
      const moderatorsWithVillages = await Promise.all(
        moderators.slice(0, 50).map(async (moderator) => {
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

  // Paginated moderators endpoint
  app.get('/api/moderators/paginated', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const search = req.query.search as string;

      const result = await storage.getModeratorsListPaginated({ page, limit, search });

      // Get village assignments for paginated results (parallel)
      const moderatorsWithVillages = await Promise.all(
        result.data.map(async (moderator) => {
          const villages = await storage.getModeratorVillages(moderator.moderatorId || moderator.userId);
          return { ...moderator, villages };
        })
      );

      res.json({
        ...result,
        data: moderatorsWithVillages
      });
    } catch (error) {
      console.error("Get paginated moderators error:", error);
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
  app.get('/api/collectors/stats/:villageId', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
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

  // New API routes for manager real-time management
  app.get('/api/waste-collections/village', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
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

  app.get('/api/waste-collections/village/paginated', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5000;
      const date = req.query.date as string;
      const collectorId = req.query.collectorId ? parseInt(req.query.collectorId as string) : undefined;
      const status = req.query.status as string;

      const result = await storage.getCollectionsByVillageWithDetailsPaginated(villageId, {
        page,
        limit,
        date,
        collectorId,
        status
      });

      res.json(result);
    } catch (error) {
      console.error("Get paginated village collections error:", error);
      res.status(500).json({ message: "Failed to get village collections" });
    }
  });

  app.put('/api/issues/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
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

  // Note: manifest.json and icon routes are handled in server/index.ts to avoid conflicts

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Admin routes for website feedback and contact submissions
  app.get('/api/admin/website-feedback', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const feedbacks = await storage.getWebsiteFeedbacks();
      res.json(feedbacks);
    } catch (error) {
      console.error('Error getting website feedback:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/contact-submissions', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const contacts = await storage.getContactSubmissions();
      res.json(contacts);
    } catch (error) {
      console.error('Error getting contact submissions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/queue-stats', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({ message: 'Queue stats not available' });
    }
  });

  app.post('/api/admin/schedule-report', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { type, villageId } = req.body;
      const job = await scheduleReportGeneration({
        type: type || 'daily',
        villageId,
        requestedBy: parseInt(req.session.userId || '0')
      });
      res.json({ jobId: job.id, status: 'queued' });
    } catch (error) {
      console.error('Error scheduling report:', error);
      res.status(500).json({ message: 'Failed to schedule report' });
    }
  });

  // Phase 3: Admin endpoints for manual stats management
  app.post('/api/admin/backfill-stats', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const recordsCreated = await storage.backfillHistoricalStats();
      
      // Clear all report and stats caches after backfill
      const cache = getCache();
      await cache.clear('stats:*');
      await cache.clear('report:*');
      
      res.json({ 
        message: `✅ Backfill completed: ${recordsCreated} monthly stats records created/updated`,
        recordsCreated 
      });
    } catch (error) {
      console.error('Admin backfill stats error:', error);
      res.status(500).json({ message: 'Failed to backfill historical stats' });
    }
  });

  app.post('/api/admin/update-current-stats', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const recordsUpdated = await storage.updateCurrentMonthStats();
      
      // Clear all stats caches after update
      const cache = getCache();
      await cache.clear('stats:*');
      await cache.clear('report:*');
      
      res.json({ 
        message: `✅ Current month stats updated: ${recordsUpdated} records updated`,
        recordsUpdated 
      });
    } catch (error) {
      console.error('Admin update current stats error:', error);
      res.status(500).json({ message: 'Failed to update current month stats' });
    }
  });

  // Legal compliance routes
  app.get('/api/legal/privacy-policy', (req, res) => {
    res.json({
      document: 'privacy-policy',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/privacy-policy`
    });
  });

  app.get('/api/legal/terms-of-service', (req, res) => {
    res.json({
      document: 'terms-of-service',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/terms-of-service`
    });
  });

  app.get('/api/legal/data-protection', (req, res) => {
    res.json({
      document: 'data-protection',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      compliance: ['DPDP Act 2023', 'IT Act 2000'],
      url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/data-protection`
    });
  });

  // Serve static files from public directory
  app.use(express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true
  }));

  const httpServer = createServer(app);
  return httpServer;
}