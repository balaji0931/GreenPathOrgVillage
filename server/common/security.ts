import helmet from "helmet";
import type { Express } from "express";

export function configureSecurityHeaders(app: Express) {
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'", // Allow inline styles
                        "https://fonts.googleapis.com"
                    ],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: [
                        "'self'",
                        "data:",
                        "https:", // Allow all HTTPS images
                        "blob:"
                    ],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'", // Allow inline scripts
                        "'unsafe-eval'" // Allow eval for development
                    ],
                    connectSrc: [
                        "'self'",
                        "https:",
                        "wss:",
                        "ws:" // Allow websockets for development
                    ],
                    mediaSrc: [
                        "'self'",
                        "https:",
                        "blob:"
                    ],
                    workerSrc: ["'self'", "blob:"],
                    frameSrc: ["'self'"], // Allow same-origin frames
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                },
            },
            crossOriginEmbedderPolicy: false, // Required for some PWA features
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },
        }),
    );
}
