import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import type { Express } from "express";
import type { Logger } from "winston";

const createRateLimit = (windowMs: number, max: number, message: string, logger: Logger) =>
    rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({ error: message });
        },
    });

export function configureRateLimiting(app: Express, logger: Logger) {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') return;

    // General API rate limiting
    app.use(
        "/api/",
        createRateLimit(
            15 * 60 * 1000,
            1000,
            "Too many requests, please try again later",
            logger,
        ),
    );

    // Stricter rate limiting for auth endpoints
    app.use(
        "/api/auth/login",
        createRateLimit(
            15 * 60 * 1000,
            5,
            "Too many login attempts, please try again later",
            logger,
        ),
    );
    app.use(
        "/api/auth/register",
        createRateLimit(
            60 * 60 * 1000,
            3,
            "Too many registration attempts, please try again later",
            logger,
        ),
    );

    // Upload rate limiting
    app.use(
        "/api/upload",
        createRateLimit(
            5 * 60 * 1000,
            20,
            "Too many upload requests, please try again later",
            logger,
        ),
    );

    // Attendance scan rate limiting (prevent QR abuse)
    app.use(
        "/api/attendance/scan-shift",
        createRateLimit(
            5 * 60 * 1000,
            20,
            "Too many scan attempts, please wait before trying again",
            logger,
        ),
    );

    // Change password rate limiting
    app.use(
        "/api/auth/change-password",
        createRateLimit(
            15 * 60 * 1000,
            5,
            "Too many password change attempts, please try again later",
            logger,
        ),
    );

    // Slow down repeated requests - configured for express-slow-down v2
    app.use(
        "/api/",
        slowDown({
            windowMs: 15 * 60 * 1000, // 15 minutes
            delayAfter: 100, // Allow 100 requests per windowMs without delay
            delayMs: () => 500, // Add 500ms delay per request after delayAfter (v2 syntax)
            maxDelayMs: 20000, // Maximum delay of 20 seconds
            validate: { delayMs: false }, // Suppress deprecation warning
        }),
    );
}
