/**
 * Mobile Authentication Middleware for GreenPath
 *
 * Provides Bearer-token authentication for Android clients.
 * Populates req.session with identity from JWT so that all
 * existing authorization middleware (requireRole, requireVillageAccess,
 * requireWriteAccess) works unchanged.
 *
 * Per-write revocation: POST/PUT/PATCH/DELETE requests check Redis
 * for user revocation before proceeding.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, isUserRevoked } from "./token.service";

/**
 * Extract Bearer token from Authorization header.
 * Falls back to X-Mobile-Token custom header for proxies
 * (like Render) that may strip the standard Authorization header.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Fallback for proxies that strip the standard Authorization header
  const customHeader = req.headers['x-mobile-token'];
  if (typeof customHeader === 'string') {
    return customHeader;
  }

  return null;
}

/**
 * Mobile Bearer Authentication Middleware
 *
 * For use on mobile-only endpoints (e.g., /api/mobile/auth/user).
 * Verifies the access token and populates req.session with identity.
 *
 * For write operations (POST/PUT/PATCH/DELETE), also checks Redis
 * for user revocation to ensure immediate lockout.
 */
export function requireMobileAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ message: "Authorization required" });
    return;
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    res.status(401).json({ message: "Invalid or expired access token" });
    return;
  }

  // Check per-write revocation for state-changing methods
  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (writeMethods.includes(req.method)) {
    isUserRevoked(decoded.userId)
      .then((revoked) => {
        if (revoked) {
          res.status(403).json({ message: "Account has been revoked" });
          return;
        }

        // Populate session with identity from JWT
        populateSession(req, decoded);
        next();
      })
      .catch((err) => {
        console.error("[MobileAuth] Revocation check error:", err);
        // Fail open on Redis errors for reads, fail closed for writes
        res
          .status(503)
          .json({ message: "Authentication service temporarily unavailable" });
      });
  } else {
    // GET/HEAD/OPTIONS — no revocation check, JWT signature only
    populateSession(req, decoded);
    next();
  }
}

/**
 * Populate req.session with identity from JWT payload.
 * This makes all existing authorization middleware work unchanged.
 */
function populateSession(
  req: Request,
  decoded: { userId: string; role: string; villageId: string | null }
): void {
  // Ensure session object exists (express-session creates it,
  // but we need to populate it for downstream middleware)
  if (!req.session) {
    // This shouldn't happen with express-session configured,
    // but guard defensively
    (req as any).session = {} as any;
  }
  req.session.userId = decoded.userId;
  req.session.role = decoded.role;
  req.session.villageId = decoded.villageId ?? undefined;
}
