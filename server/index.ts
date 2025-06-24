import dotenv from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

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
      console.log("Serving service worker from:", swPath);
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

app.get("/manifest.json", (_req, res) => {
  try {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      res.sendFile(manifestPath);
    } else {
      res.status(404).json({ error: "Manifest not found" });
    }
  } catch (error) {
    console.error("Manifest route error:", error);
    res.status(500).json({ error: "Manifest error" });
  }
});

// Serve icon files with correct MIME types
app.get("/icons/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const iconPath = path.join(process.cwd(), "public", "icons", filename);
    
    if (!fs.existsSync(iconPath)) {
      return res.status(404).send("Icon not found");
    }

    // Set correct MIME type based on file extension
    if (filename.endsWith('.png')) {
      res.setHeader("Content-Type", "image/png");
    } else if (filename.endsWith('.svg')) {
      res.setHeader("Content-Type", "image/svg+xml");
    } else if (filename.endsWith('.ico')) {
      res.setHeader("Content-Type", "image/x-icon");
    }
    
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.sendFile(iconPath);
  } catch (error) {
    console.error("Icon route error:", error);
    res.status(500).send("Icon error");
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

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
