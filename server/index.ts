import { createApp } from "./app";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startOrderExpiryWorker, stopOrderExpiryWorker } from "./workers/order-expiry";
import type { Request, Response, NextFunction } from "express";

const { app, logger } = createApp();

(async () => {
  const server = await registerRoutes(app);

  // Start background workers
  startOrderExpiryWorker();

  // Enhanced error handling middleware - Security hardened
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    // Create error ID for tracking
    const errorId = Math.random().toString(36).substring(2, 15);

    // Log error details securely (remove sensitive information in production)
    const logData = {
      errorId,
      error: {
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        status: status,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString()
      },
    };

    // Log based on severity
    if (status >= 500) {
      logger.error("Server Error", logData);
    } else if (status >= 400) {
      logger.warn("Client Error", logData);
    }

    // Secure error response - don't expose internal details in production
    const errorResponse = process.env.NODE_ENV === "production"
      ? {
        error: status === 404 ? "Not Found" :
          status === 403 ? "Forbidden" :
            status === 401 ? "Unauthorized" :
              "Internal Server Error",
        status,
        errorId // For support purposes only
      }
      : {
        error: err.message || "Internal Server Error",
        status,
        errorId,
        ...(err.stack && { stack: err.stack })
      };

    res.status(status).json(errorResponse);
  });

  // Handle uncaught exceptions and unhandled promise rejections
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", { promise, reason });
    process.exit(1);
  });

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Graceful shutdown initiated.`);

    // Stop background workers
    stopOrderExpiryWorker();

    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Port configuration from environment
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(
    {
      port,
      // host: "0.0.0.0",
      // reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      log("Production Node version:", process.version);
    },
  );
})();
