/**
 * Mobile Authentication Routes for GreenPath
 *
 * Endpoints:
 *   POST /api/mobile/auth/login        — Login with userId + password
 *   POST /api/mobile/auth/refresh      — Refresh access token (rotates refresh token)
 *   GET  /api/mobile/auth/user         — Get current authenticated user info
 *   POST /api/mobile/auth/logout       — Logout (revoke refresh token)
 *   POST /api/mobile/auth/logout-all   — Logout all devices
 *
 * These routes are completely independent from the web session auth.
 * They do not use express-session for authentication — they use
 * Bearer tokens (access JWT) and server-stored refresh tokens (Redis).
 *
 * CSRF is NOT required for these endpoints because:
 * - Bearer tokens are not automatically attached by browsers (unlike cookies)
 * - CSRF attacks exploit automatic cookie attachment — Bearer tokens are immune
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { storage } from "../../storage";
import {
  signAccessToken,
  createRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from "./token.service";
import { requireMobileAuth } from "./mobile-auth.middleware";

export function registerMobileAuthRoutes(app: Express): void {
  /**
   * POST /api/mobile/auth/login
   *
   * Body: { userId, password, deviceId, deviceName }
   * Returns: { accessToken, refreshToken, expiresIn, user }
   */
  app.post("/api/mobile/auth/login", async (req: Request, res: Response) => {
    try {
      const { userId, password, deviceId, deviceName } = req.body;

      // Validate required fields
      if (!userId || !password) {
        return res
          .status(400)
          .json({ message: "userId and password are required" });
      }
      if (!deviceId) {
        return res.status(400).json({ message: "deviceId is required" });
      }

      // Look up user — reuses existing storage layer
      const user = await storage.getUserByUserId(userId);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password — same bcrypt comparison as web login
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate access token
      const accessResult = signAccessToken({
        userId: user.userId,
        role: user.role,
        villageId: user.villageId ?? null,
      });

      // Generate refresh token (stored hashed in Redis)
      const refreshToken = await createRefreshToken({
        userId: user.userId,
        role: user.role,
        villageId: user.villageId ?? null,
        deviceId,
        deviceName: deviceName || "Unknown Device",
      });

      res.json({
        accessToken: accessResult.token,
        refreshToken,
        expiresIn: accessResult.expiresIn,
        user: {
          userId: user.userId,
          role: user.role,
          name: user.name,
          villageId: user.villageId,
          isFirstLogin: user.isFirstLogin,
        },
      });
    } catch (error) {
      console.error("[MobileAuth] Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  /**
   * POST /api/mobile/auth/refresh
   *
   * Body: { refreshToken }
   * Returns: { accessToken, refreshToken, expiresIn }
   *
   * Two-step flow:
   *   1. Validate old refresh token → extract userId
   *   2. Load fresh user from DB (get current role/village)
   *   3. Rotate: consume old token, issue new pair with fresh data
   *
   * The old refresh token is invalidated (single-use rotation).
   * A new refresh token is returned and must replace the old one on the client.
   */
  app.post("/api/mobile/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res
          .status(400)
          .json({ message: "refreshToken is required" });
      }

      // Step 1: Validate the old refresh token (does not consume it)
      const tokenData = await validateRefreshToken(refreshToken);
      if (!tokenData) {
        return res
          .status(401)
          .json({ message: "Invalid or expired refresh token" });
      }

      // Step 2: Load fresh user data from DB
      const user = await storage.getUserByUserId(tokenData.userId);
      if (!user) {
        return res
          .status(401)
          .json({ message: "User account no longer exists" });
      }

      // Step 3: Rotate — consume old token, issue new pair
      const result = await rotateRefreshToken(
        refreshToken,
        {
          userId: user.userId,
          role: user.role,
          villageId: user.villageId ?? null,
        },
        tokenData.deviceId,
        tokenData.deviceName
      );

      if (!result) {
        return res
          .status(401)
          .json({ message: "Account has been revoked" });
      }

      res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      console.error("[MobileAuth] Refresh error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  /**
   * GET /api/mobile/auth/user
   *
   * Headers: Authorization: Bearer <accessToken>
   * Returns: { userId, role, name, villageId, isFirstLogin }
   */
  app.get(
    "/api/mobile/auth/user",
    requireMobileAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUserByUserId(req.session.userId!);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          userId: user.userId,
          role: user.role,
          name: user.name,
          villageId: user.villageId,
          isFirstLogin: user.isFirstLogin,
        });
      } catch (error) {
        console.error("[MobileAuth] Get user error:", error);
        res.status(500).json({ message: "Failed to get user" });
      }
    }
  );

  /**
   * POST /api/mobile/auth/logout
   *
   * Headers: Authorization: Bearer <accessToken>
   * Body: { refreshToken }
   *
   * Revokes the specified refresh token.
   */
  app.post(
    "/api/mobile/auth/logout",
    requireMobileAuth,
    async (req: Request, res: Response) => {
      try {
        const { refreshToken } = req.body;
        if (refreshToken) {
          await revokeRefreshToken(refreshToken);
        }
        res.json({ message: "Logged out successfully" });
      } catch (error) {
        console.error("[MobileAuth] Logout error:", error);
        res.status(500).json({ message: "Logout failed" });
      }
    }
  );

  /**
   * POST /api/mobile/auth/logout-all
   *
   * Headers: Authorization: Bearer <accessToken>
   *
   * Revokes ALL refresh tokens for the authenticated user.
   * All devices will be logged out within the access token expiry window (5 min).
   */
  app.post(
    "/api/mobile/auth/logout-all",
    requireMobileAuth,
    async (req: Request, res: Response) => {
      try {
        const count = await revokeAllUserTokens(req.session.userId!);
        res.json({
          message: "All devices logged out",
          devicesLoggedOut: count,
        });
      } catch (error) {
        console.error("[MobileAuth] Logout-all error:", error);
        res.status(500).json({ message: "Logout failed" });
      }
    }
  );
}
