import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer from "multer";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";

import { registerPublicRoutes } from "./modules/website/public.routes";
import { registerAuthRoutes } from "./modules/auth/auth.routes";
import { registerLegalRoutes } from "./modules/legal/legal.routes";
import { registerVehicleRoutes } from "./modules/vehicle/vehicle.routes";
import { registerVillageRoutes } from "./modules/village/village.routes";
import { registerHouseholdRoutes } from "./modules/household/household.routes";
import { registerCollectorRoutes } from "./modules/collector/collector.routes";
import { registerFieldWorkerRoutes } from "./modules/fieldwork/fieldworker.routes";
import { registerWasteCollectionRoutes } from "./modules/waste-collection/waste-collection.routes";
import { registerUploadRoutes } from "./modules/upload/upload.routes";
import { registerIssueRoutes } from "./modules/issue/issue.routes";
import { registerAnnouncementRoutes } from "./modules/announcement/announcement.routes";
import { registerAdminRoutes } from "./modules/admin/admin.routes";
import { registerQRCodeRoutes } from "./modules/fieldwork/qr-code.routes";
import { registerStatsRoutes } from "./modules/analytics/stats.routes";
import { registerModeratorRoutes } from "./modules/moderation/moderator.routes";
import { registerAdminUsersRoutes } from "./modules/admin/admin-users.routes";
import { registerProfileRoutes } from "./modules/profile/profile.routes";
import { registerMaterialLogRoutes } from "./modules/material-log/material-log.routes";
import { registerFeedbackRoutes } from "./modules/feedback/feedback.routes";
import { registerPaymentRoutes } from "./modules/payment/payment.routes";
import { registerAuditRoutes } from "./modules/audit/audit.routes";
import { registerExportRoutes } from "./modules/export/export.routes";
import { registerAttendanceRoutes } from "./modules/attendance/attendance.routes";
import { registerBehaviourRoutes } from "./modules/behaviour/behaviour.routes";
import { checkAndRunDailyRefresh } from "./modules/behaviour/behaviour.storage";
import { registerStaffRoutes } from "./modules/staff/staff.routes";
import { registerPushRoutes } from "./modules/push/push.routes";

// Configure multer for file uploads with enhanced security
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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

import { generateCsrfToken, csrfProtection } from "./common/middleware/csrf";
import { requireAuth, requireRole } from "./common/middleware/auth";
import { requireVillageAccess } from "./common/middleware/village-access";
import { validateInput } from "./common/middleware/validate-input";

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
  registerPublicRoutes(app);


  // Auth & session routes
  registerAuthRoutes(app, requireAuth, generateCsrfToken);

  // Vehicle Management Routes
  registerVehicleRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Village routes
  registerVillageRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Household routes
  registerHouseholdRoutes(app, requireAuth, requireRole, requireVillageAccess);


  // Collector routes
  registerCollectorRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Field Worker routes
  registerFieldWorkerRoutes(app, requireAuth, requireRole, requireVillageAccess);



  // Pre-mapped QR Code routes (for field worker mapping)
  // QR Code routes
  registerQRCodeRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Waste collection routes
  registerWasteCollectionRoutes(app, requireAuth, requireRole, requireVillageAccess);
  // File upload routes
  registerUploadRoutes(app, requireAuth, requireRole, upload);

  // Issues routes
  registerIssueRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Announcements routes
  registerAnnouncementRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Manager stats route
  // Stats routes
  registerStatsRoutes(app, requireAuth, requireRole);

  // Get moderator villages
  // Moderator routes
  registerModeratorRoutes(app, requireAuth, requireRole);



  // Admin management routes
  // Admin user management routes
  registerAdminUsersRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Profile routes
  registerProfileRoutes(app, requireAuth);

  // Material log routes (Daily Waste, Compost, Dry Waste Sales)
  registerMaterialLogRoutes(app, requireAuth, requireRole, requireVillageAccess, upload);

  // Payment Ledger routes (Phase A1)
  registerPaymentRoutes(app, requireAuth, requireRole, requireVillageAccess);
  registerAttendanceRoutes(app, requireAuth, requireRole, requireVillageAccess);
  registerBehaviourRoutes(app, requireAuth, requireRole, requireVillageAccess);
  registerStaffRoutes(app);

  // Push notification routes (proximity alerts)
  registerPushRoutes(app, requireAuth, requireRole);

  // Start nightly behaviour stats refresh guard
  // Runs on server start + every hour; only refreshes once per day (IST)
  checkAndRunDailyRefresh().catch((e) => console.error("[BehaviourStats] Initial refresh failed:", e));
  setInterval(() => {
    checkAndRunDailyRefresh().catch((e) => console.error("[BehaviourStats] Hourly check failed:", e));
  }, 60 * 60 * 1000);


  // Moderator-specific API endpoints





  // Moderator routes




  // Feedback routes
  registerFeedbackRoutes(app, requireAuth, requireRole);

  // Feedback and admin routes
  registerAdminRoutes(app, requireAuth, requireRole);

  // Audit log routes (A6)
  registerAuditRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // CSV Export routes (P0)
  registerExportRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Note: manifest.json and icon routes are handled in server/index.ts to avoid conflicts

  // Serve uploaded files — AUTHENTICATED
  app.use('/uploads', (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }, express.static('uploads'));


  // Legal compliance routes
  registerLegalRoutes(app);

  // Serve static files from public directory
  app.use(express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true
  }));

  const httpServer = createServer(app);
  return httpServer;
}
