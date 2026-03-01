import cors from "cors";
import type { Express } from "express";

const getAllowedOrigins = () => {
    if (process.env.NODE_ENV === "production") {
        const origins = [];
        if (process.env.CLIENT_URL) {
            origins.push(process.env.CLIENT_URL);
        }
        if (process.env.ALLOWED_ORIGINS) {
            origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()));
        }
        if (origins.length === 0) {
            throw new Error('CLIENT_URL or ALLOWED_ORIGINS must be set in production');
        }
        return origins;
    }
    return true; // Allow all origins in development
};

export function configureCors(app: Express) {
    const corsOptions = {
        origin: getAllowedOrigins(),
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token" // For CSRF protection
        ],
        exposedHeaders: ["X-Total-Count"], // For pagination
        maxAge: 86400, // Cache preflight responses for 24 hours
    };
    app.use(cors(corsOptions));
}
