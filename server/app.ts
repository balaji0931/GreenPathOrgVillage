import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import morgan from "morgan";
import { createLogger, format, transports } from "winston";
import { initializeCache } from "./cache";
import { configureSecurityHeaders } from "./common/security";
import { configureCors } from "./common/cors";
import { configureRateLimiting } from "./common/rate-limit";
import { registerPwaRoutes } from "./common/pwa-routes";
import { log } from "./vite";

// Load environment variables from .env file
dotenv.config();

// Initialize caching layer (Redis with fallback to memory)
initializeCache();

// Create Winston logger for production
const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
    ),
    defaultMeta: { service: "greenpath-api" },
    transports: [
        new transports.Console({
            format: format.combine(format.colorize(), format.simple()),
        }),
    ],
});

export function createApp() {
    const app = express();

    // Trust proxy for accurate IP addresses when behind reverse proxy
    app.set("trust proxy", 1);

    app.use((req, res, next) => {
        const host = req.headers.host?.replace(/^www\./, "");

        if (host === "greenpathorg.social") {
            return res.redirect(
                301,
                "https://greenpathindia.in" + req.originalUrl
            );
        }

        next();
    });

    // HTTPS enforcement in production - redirect HTTP to HTTPS
    if (process.env.NODE_ENV === "production") {
        app.use((req, res, next) => {
            // Check X-Forwarded-Proto header (set by reverse proxies like Replit/Cloudflare)
            if (req.headers['x-forwarded-proto'] !== 'https' && req.hostname !== 'localhost') {
                return res.redirect(301, `https://${req.hostname}${req.url}`);
            }
            next();
        });
    }

    // Security headers with Helmet
    configureSecurityHeaders(app);

    // CORS configuration
    configureCors(app);

    // Compression middleware
    app.use(
        compression({
            level: 6,
            threshold: 1024,
            filter: (req, res) => {
                if (req.headers["x-no-compression"]) {
                    return false;
                }
                return compression.filter(req, res);
            },
        }),
    );

    // Rate limiting
    configureRateLimiting(app, logger);

    // Request logging
    if (process.env.NODE_ENV === "production") {
        app.use(
            morgan("combined", {
                stream: { write: (message) => logger.info(message.trim()) },
            }),
        );
    } else if (process.env.NODE_ENV !== "test") {
        app.use(morgan("dev"));
    }

    // Body parsing with size limits
    app.use(
        express.json({
            limit: "1mb",
            verify: (req, res, buf) => {
                // Store raw body for webhook verification if needed
                (req as any).rawBody = buf;
            },
        }),
    );
    app.use(
        express.urlencoded({
            extended: false,
            limit: "1mb",
        }),
    );

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

    // PWA routes - must be before registerRoutes to avoid conflicts
    registerPwaRoutes(app);

    return { app, logger };
}
