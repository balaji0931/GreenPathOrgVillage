import path from "path";
import fs from "fs";
import type { Express } from "express";

export function registerPwaRoutes(app: Express) {
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
            const assetLinksPath = path.join(
                process.cwd(),
                "public",
                ".well-known",
                "assetlinks.json",
            );
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
            res.setHeader(
                "Access-Control-Allow-Headers",
                "Origin, X-Requested-With, Content-Type, Accept",
            );
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
            const faviconPath = path.join(
                process.cwd(),
                "public",
                "icons",
                "icon-96x96.png",
            );
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
}
