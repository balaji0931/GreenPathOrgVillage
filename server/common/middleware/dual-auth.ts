/**
 * Dual Authentication Middleware for GreenPath
 *
 * Supports BOTH session-based auth (web) AND Bearer token auth (mobile).
 * Populates req.user with a clean identity object — never mutates req.session
 * to avoid creating orphaned sessions for mobile clients.
 *
 * Middleware pipeline order:
 *   1. express-session (cookie parsing)
 *   2. dualAuth (resolves identity → req.user)
 *   3. csrfProtection (enforced for session auth, skipped for Bearer)
 *   4. requireWriteAccess, requireAuth, requireRole, requireVillageAccess
 *   5. Route controller
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, isUserRevoked } from "../../modules/mobile-auth/token.service";

// ── Request Identity ────────────────────────────────────────────

export interface RequestIdentity {
  userId: string;
  role: string;
  villageId: string | null;
  authType: "session" | "bearer";
}

// Extend Express Request to include our clean identity
declare global {
  namespace Express {
    interface Request {
      user?: RequestIdentity;
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Fallback for proxies (Nginx/Apache) that strip the standard Authorization header
  const customHeader = req.headers['x-mobile-token'];
  if (typeof customHeader === 'string') {
    return customHeader;
  }

  return null;
}

/**
 * For Bearer-authenticated requests, copy identity into req.session
 * IN MEMORY so that existing route handlers (which read req.session.userId,
 * req.session.villageId, etc.) continue to work without modification.
 *
 * CRITICAL: Override req.session.save to prevent express-session from
 * persisting this session to the store. Mobile clients don't use cookies,
 * so there's no reason to create a server-side session record.
 * This prevents orphaned session creation.
 */
function bridgeSessionForBearer(req: Request, identity: { userId: string; role: string; villageId: string | null }): void {
  if (req.session) {
    req.session.userId = identity.userId;
    req.session.role = identity.role;
    req.session.villageId = identity.villageId ?? undefined;

    // Prevent session persistence — no-op save
    req.session.save = function(this: any, cb?: (err?: any) => void) {
      if (cb) cb();
      return this;
    } as any;
  }
}

// ── Dual Auth Middleware ────────────────────────────────────────

/**
 * Resolves request identity from either Bearer token or session cookie.
 * Bearer takes precedence when both are present (deterministic behavior).
 *
 * Does NOT reject unauthenticated requests — that's requireAuth's job.
 * This middleware only populates req.user if valid credentials are found.
 */
export function dualAuth(req: Request, res: Response, next: NextFunction): void {
  // Priority 1: Bearer token (mobile clients)
  const bearerToken = extractBearerToken(req);
  if (bearerToken) {
    const decoded = verifyAccessToken(bearerToken);
    if (decoded) {
      // For write operations, check per-write revocation
      const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
      if (writeMethods.includes(req.method)) {
        isUserRevoked(decoded.userId)
          .then((revoked) => {
            if (revoked) {
              res.status(403).json({ message: "Account has been revoked" });
              return;
            }
            req.user = {
              userId: decoded.userId,
              role: decoded.role,
              villageId: decoded.villageId,
              authType: "bearer",
            };
            bridgeSessionForBearer(req, decoded);
            next();
          })
          .catch((err) => {
            console.error("[DualAuth] Revocation check error:", err);
            res.status(503).json({ message: "Authentication service temporarily unavailable" });
          });
        return;
      }

      // GET/HEAD/OPTIONS — no revocation check needed
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        villageId: decoded.villageId,
        authType: "bearer",
      };
      bridgeSessionForBearer(req, decoded);
      return next();
    }

    // Bearer token present but invalid/expired → reject immediately
    // (Don't fall through to session — explicit Bearer means mobile client)
    res.status(401).json({ message: "Invalid or expired access token" });
    return;
  }

  // Priority 2: Session cookie (web clients)
  if (req.session?.userId) {
    req.user = {
      userId: req.session.userId,
      role: req.session.role || "",
      villageId: req.session.villageId || null,
      authType: "session",
    };
  }

  // If neither auth method found, req.user remains undefined.
  // requireAuth middleware will block if authentication is required.
  next();
}
