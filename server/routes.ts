import type { Express} from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer from "multer";
import session from "express-session";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { randomBytes } from "crypto";

import { registerPublicRoutes } from "./routes/public.routes";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerLegalRoutes } from "./routes/legal.routes";
import { registerVehicleRoutes } from "./routes/vehicle.routes";
import { registerVillageRoutes } from "./routes/village.routes";
import { registerHouseholdRoutes } from "./routes/household.routes";
import { registerCollectorRoutes } from "./routes/collector.routes";
import { registerFieldWorkerRoutes } from "./routes/fieldworker.routes";
import { registerWasteCollectionRoutes } from "./routes/waste-collection.routes";
import { registerUploadRoutes } from "./routes/upload.routes";
import { registerIssueRoutes } from "./routes/issue.routes";
import { registerAnnouncementRoutes } from "./routes/announcement.routes";
import { registerAdminRoutes } from "./routes/admin.routes";
import { registerQRCodeRoutes } from "./routes/qr-code.routes";
import { registerStatsRoutes } from "./routes/stats.routes";
import { registerModeratorRoutes } from "./routes/moderator.routes";
import { registerAdminUsersRoutes } from "./routes/admin-users.routes";
import { registerProfileRoutes } from "./routes/profile.routes";

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
  registerFieldWorkerRoutes(app, requireAuth, requireRole);



  // Pre-mapped QR Code routes (for field worker mapping)
  // QR Code routes
  registerQRCodeRoutes(app, requireAuth, requireRole);

  // Waste collection routes
  registerWasteCollectionRoutes(app, requireAuth, requireRole, requireVillageAccess);
  // File upload routes
  registerUploadRoutes(app, requireAuth, requireRole, upload);

  // Issues routes
  registerIssueRoutes(app, requireAuth, requireRole, requireVillageAccess);

  // Announcements routes
  registerAnnouncementRoutes(app, requireAuth, requireRole);

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


  // Moderator-specific API endpoints





  // Moderator routes




  // Feedback and admin routes
  registerAdminRoutes(app, requireAuth, requireRole);

  // Note: manifest.json and icon routes are handled in server/index.ts to avoid conflicts

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));


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
