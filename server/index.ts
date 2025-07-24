import dotenv from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import morgan from 'morgan';
import { createLogger, format, transports } from 'winston';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Load environment variables from .env file
dotenv.config();

// Create Winston logger for production
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'greenpath-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

const app = express();

// Trust proxy for accurate IP addresses when behind reverse proxy
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // Required for some PWA features
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || 'https:www.greenpathorg.social']
    : true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Rate limiting - different limits for different endpoints
const createRateLimit = (windowMs: number, max: number, message: string) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ error: message });
    }
  });

// General API rate limiting
app.use('/api/', createRateLimit(15 * 60 * 1000, 1000, 'Too many requests, please try again later'));

// Stricter rate limiting for auth endpoints
app.use('/api/auth/login', createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later'));
app.use('/api/auth/register', createRateLimit(60 * 60 * 1000, 3, 'Too many registration attempts, please try again later'));

// Upload rate limiting
app.use('/api/upload', createRateLimit(5 * 60 * 1000, 20, 'Too many upload requests, please try again later'));

// Slow down repeated requests
app.use('/api/', slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
}));

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
} else {
  app.use(morgan('dev'));
}

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '10mb' 
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log errors and slow requests in production
    if (path.startsWith("/api") && (res.statusCode >= 400 || duration > 5000)) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

// Import required modules at the top
import path from 'path';
import fs from 'fs';

// PWA routes - must be before registerRoutes to avoid conflicts
app.get("/sw.js", (_req, res) => {
  try {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const swPath = path.join(process.cwd(), "public", "sw.js");
    if (fs.existsSync(swPath)) {
      res.sendFile(swPath);
    } else {
      console.error("Service worker not found at:", swPath);
      res.status(404).send("// Service worker not found");
    }
  } catch (error) {
    console.error("SW route error:", error);
    res.status(500).send("// Service worker error");
  }
});

// Digital Asset Links route for Android app verification
app.get("/.well-known/assetlinks.json", (_req, res) => {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const assetLinksPath = path.join(process.cwd(), "public", ".well-known", "assetlinks.json");
    if (fs.existsSync(assetLinksPath)) {
      res.sendFile(assetLinksPath);
    } else {
      console.error("assetlinks.json not found at:", assetLinksPath);
      res.status(404).json({ error: "assetlinks.json not found" });
    }
  } catch (error) {
    console.error("assetlinks.json route error:", error);
    res.status(500).json({ error: "assetlinks.json error" });
  }
});

app.get("/manifest.json", (_req, res) => {
  try {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours for better TWA performance
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifestBuffer = fs.readFileSync(manifestPath);
      res.setHeader("Content-Length", manifestBuffer.length.toString());
      res.send(manifestBuffer);
    } else {
      console.error("Manifest not found at:", manifestPath);
      res.status(404).json({ error: "Manifest not found" });
    }
  } catch (error) {
    console.error("Manifest route error:", error);
    res.status(500).json({ error: "Manifest error" });
  }
});

// Serve icon files with correct MIME types - Enhanced for TWA compatibility
app.get("/icons/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const iconPath = path.join(process.cwd(), "public", "icons", filename);
    
    if (!fs.existsSync(iconPath)) {
      return res.status(404).json({ error: "Icon not found" });
    }

    // Enhanced headers for TWA and PWA compatibility
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    
    // Read file and set content length for better compatibility
    const iconBuffer = fs.readFileSync(iconPath);
    res.setHeader("Content-Length", iconBuffer.length.toString());
    
    res.send(iconBuffer);
  } catch (error) {
    console.error("Icon route error:", error);
    res.status(500).json({ error: "Icon error" });
  }
});

// Serve favicon.ico
app.get("/favicon.ico", (_req, res) => {
  try {
    const faviconPath = path.join(process.cwd(), "public", "icons", "icon-96x96.png");
    if (fs.existsSync(faviconPath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.sendFile(faviconPath);
    } else {
      res.status(204).end(); // No content
    }
  } catch (error) {
    console.error("Favicon error:", error);
    res.status(204).end();
  }
});

// PWA/TWA health check endpoint
app.get("/api/pwa/health", (_req, res) => {
  try {
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    const iconsPath = path.join(process.cwd(), "public", "icons");
    
    const manifestExists = fs.existsSync(manifestPath);
    const iconsExist = fs.existsSync(iconsPath);
    
    const iconFiles = fs.readdirSync(iconsPath).filter(file => file.endsWith('.png'));
    
    res.json({
      status: "healthy",
      manifest: {
        exists: manifestExists,
        path: "/manifest.json"
      },
      icons: {
        directory: iconsExist,
        count: iconFiles.length,
        files: iconFiles,
        basePath: "/icons/"
      },
      assetLinks: {
        path: "/.well-known/assetlinks.json"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("PWA health check error:", error);
    res.status(500).json({ 
      status: "error", 
      error: "PWA health check failed",
      timestamp: new Date().toISOString()
    });
  }
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log error details
    logger.error('Application Error', {
      error: {
        message: err.message,
        stack: err.stack,
        status: status
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Don't expose stack trace in production
    const errorResponse = process.env.NODE_ENV === 'production' 
      ? { message: status === 500 ? 'Internal Server Error' : message }
      : { message, stack: err.stack };

    res.status(status).json(errorResponse);
  });

  // Handle uncaught exceptions and unhandled promise rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
  });

  // Graceful shutdown handler
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Graceful shutdown initiated.`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
