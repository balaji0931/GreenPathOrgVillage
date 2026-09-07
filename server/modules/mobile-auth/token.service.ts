/**
 * Token Service for GreenPath Mobile Authentication
 *
 * Manages JWT access tokens and server-stored refresh tokens.
 *
 * Access tokens: 5-minute, stateless JWT (identity only)
 * Refresh tokens: 30-day, single-use, hashed in Redis, rotated on every use
 *
 * Redis key structure:
 *   greenpath:mobile:refresh:{sha256(token)}  → refresh token metadata
 *   greenpath:mobile:rotated:{sha256(token)}  → recently rotated tokens (replay detection)
 *   greenpath:mobile:revoked:{userId}          → user revocation flag (per-write check)
 */
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { createClient } from "redis";

// ── Types ──────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  role: string;
  villageId: string | null;
  type: "access";
}

interface RefreshTokenData {
  userId: string;
  role: string;
  villageId: string | null;
  deviceId: string;
  deviceName: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ── Constants ──────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = "5m";
const ACCESS_TOKEN_EXPIRY_SECONDS = 300;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_EXPIRY_SECONDS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
// Keep record of rotated tokens for 7 days (for replay detection)
const ROTATED_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const REDIS_PREFIX_REFRESH = "greenpath:mobile:refresh:";
const REDIS_PREFIX_ROTATED = "greenpath:mobile:rotated:";
const REDIS_PREFIX_REVOKED = "greenpath:mobile:revoked:";

// ── Token Store Interface & Implementations ────────────────────

export interface TokenStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setEx(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

class MemoryTokenStore implements TokenStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, { value });
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const now = Date.now();
    const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : pattern;
    const matched: string[] = [];
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (pattern.endsWith("*") ? key.startsWith(prefix) : key === pattern) {
        matched.push(key);
      }
    }
    return matched;
  }
}

class RedisTokenStore implements TokenStore {
  constructor(private client: ReturnType<typeof createClient>) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setEx(key, seconds, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}

let activeStore: TokenStore | null = null;
const memoryFallback = new MemoryTokenStore();

async function getTokenStore(): Promise<TokenStore> {
  if (activeStore) return activeStore;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("🟠 Using memory store for mobile auth tokens (REDIS_URL not set)");
    activeStore = memoryFallback;
    return activeStore;
  }

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 5) return false;
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on("error", (err: Error) => {
      console.error("[MobileAuth] Redis error:", err.message);
    });

    await client.connect();
    console.log("✅ Mobile auth Redis store connected");
    activeStore = new RedisTokenStore(client);
    return activeStore;
  } catch (err: any) {
    console.warn(
      `🟠 Failed to connect to Redis (${err.message}). Falling back to memory store for mobile auth.`
    );
    activeStore = memoryFallback;
    return activeStore;
  }
}

// ── Helpers ────────────────────────────────────────────────────

function getSecret(): string {
  const secret = process.env.MOBILE_AUTH_SECRET;
  if (!secret) {
    throw new Error("MOBILE_AUTH_SECRET environment variable is required");
  }
  return secret;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRefreshTokenString(): string {
  return randomBytes(48).toString("hex"); // 96-char random string
}

// ── Access Token Operations ────────────────────────────────────

export function signAccessToken(payload: {
  userId: string;
  role: string;
  villageId: string | null;
}): { token: string; expiresIn: number } {
  const tokenPayload: AccessTokenPayload = {
    userId: payload.userId,
    role: payload.role,
    villageId: payload.villageId,
    type: "access",
  };

  const token = jwt.sign(tokenPayload, getSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "greenpath-mobile",
    subject: payload.userId,
  });

  return { token, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS };
}

export function verifyAccessToken(
  token: string
): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      issuer: "greenpath-mobile",
    }) as AccessTokenPayload & jwt.JwtPayload;

    if (decoded.type !== "access") return null;

    return {
      userId: decoded.userId,
      role: decoded.role,
      villageId: decoded.villageId,
      type: "access",
    };
  } catch {
    return null;
  }
}

// ── Refresh Token Operations ───────────────────────────────────

export async function createRefreshToken(payload: {
  userId: string;
  role: string;
  villageId: string | null;
  deviceId: string;
  deviceName: string;
}): Promise<string> {
  const redis = await getTokenStore();
  const refreshToken = generateRefreshTokenString();
  const tokenHash = hashToken(refreshToken);

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000
  );

  const data: RefreshTokenData = {
    userId: payload.userId,
    role: payload.role,
    villageId: payload.villageId,
    deviceId: payload.deviceId,
    deviceName: payload.deviceName,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastUsedAt: now.toISOString(),
  };

  await redis.setEx(
    REDIS_PREFIX_REFRESH + tokenHash,
    REFRESH_TOKEN_EXPIRY_SECONDS,
    JSON.stringify(data)
  );

  return refreshToken;
}

/**
 * Validate a refresh token without consuming it.
 * Returns the stored data (userId, deviceId, etc.) if valid.
 * Returns null and handles replay detection if invalid.
 *
 * This is step 1 of the refresh flow:
 *   1. validateRefreshToken → get userId
 *   2. Load fresh user from DB using userId
 *   3. rotateRefreshToken → consume old token, issue new pair
 */
export async function validateRefreshToken(
  refreshToken: string
): Promise<{ userId: string; deviceId: string; deviceName: string } | null> {
  const redis = await getTokenStore();
  const tokenHash = hashToken(refreshToken);
  const key = REDIS_PREFIX_REFRESH + tokenHash;

  const raw = await redis.get(key);
  if (!raw) {
    // Token not found — could be replayed (already rotated)
    const rotatedRaw = await redis.get(REDIS_PREFIX_ROTATED + tokenHash);
    if (rotatedRaw) {
      // Replay detected! Revoke ALL tokens for this user
      const rotatedData = JSON.parse(rotatedRaw) as { userId: string };
      await revokeAllUserTokens(rotatedData.userId);
      console.warn(
        `[MobileAuth] Refresh token replay detected for user ${rotatedData.userId}. All tokens revoked.`
      );
    }
    return null;
  }

  const data: RefreshTokenData = JSON.parse(raw);
  return {
    userId: data.userId,
    deviceId: data.deviceId,
    deviceName: data.deviceName,
  };
}

/**
 * Consume an old refresh token and issue a new token pair.
 * This is step 2 of the refresh flow (called after loading fresh user from DB).
 *
 * The old token is deleted and a "rotated" marker is set for replay detection.
 * Returns null if the user is revoked.
 */
export async function rotateRefreshToken(
  oldRefreshToken: string,
  freshUser: { userId: string; role: string; villageId: string | null },
  deviceId: string,
  deviceName: string
): Promise<TokenPair | null> {
  const redis = await getTokenStore();
  const oldHash = hashToken(oldRefreshToken);
  const key = REDIS_PREFIX_REFRESH + oldHash;

  // Delete the old token (single-use consumption).
  // Atomic check: if deleted === 0, another concurrent request already consumed it.
  const deleted = await redis.del(key);
  if (deleted === 0) {
    return null;
  }

  // Mark old token as rotated (for replay detection)
  await redis.setEx(
    REDIS_PREFIX_ROTATED + oldHash,
    ROTATED_TOKEN_TTL_SECONDS,
    JSON.stringify({ userId: freshUser.userId, rotatedAt: new Date().toISOString() })
  );

  // Check if user is revoked
  const revoked = await redis.get(REDIS_PREFIX_REVOKED + freshUser.userId);
  if (revoked) {
    return null;
  }

  // Generate new token pair using fresh user data from DB
  const accessResult = signAccessToken({
    userId: freshUser.userId,
    role: freshUser.role,
    villageId: freshUser.villageId,
  });

  const newRefreshToken = await createRefreshToken({
    userId: freshUser.userId,
    role: freshUser.role,
    villageId: freshUser.villageId,
    deviceId,
    deviceName,
  });

  return {
    accessToken: accessResult.token,
    refreshToken: newRefreshToken,
    expiresIn: accessResult.expiresIn,
  };
}

/**
 * Revoke a single refresh token (logout from one device).
 */
export async function revokeRefreshToken(
  refreshToken: string
): Promise<boolean> {
  const redis = await getTokenStore();
  const tokenHash = hashToken(refreshToken);
  const deleted = await redis.del(REDIS_PREFIX_REFRESH + tokenHash);
  return deleted > 0;
}

/**
 * Revoke all refresh tokens for a user (logout all devices).
 * Scans Redis for all tokens belonging to this user.
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  const redis = await getTokenStore();
  let deletedCount = 0;

  // Find all refresh tokens for this user.
  // Note: keys() is acceptable here because this is a rare admin operation
  // (revocation/logout-all), not a hot path. The greenpath:mobile:refresh:*
  // namespace is isolated from other Redis data.
  const keys = await redis.keys(REDIS_PREFIX_REFRESH + "*");

  for (const key of keys) {
    const raw = await redis.get(key);
    if (raw) {
      try {
        const data: RefreshTokenData = JSON.parse(raw);
        if (data.userId === userId) {
          await redis.del(key);
          deletedCount++;
        }
      } catch {
        // Skip malformed entries
      }
    }
  }

  return deletedCount;
}

// ── User Revocation (per-write check) ──────────────────────────

/**
 * Mark a user as revoked. All write operations will be blocked immediately.
 * The revocation flag has no TTL — it must be explicitly cleared.
 */
export async function revokeUser(userId: string): Promise<void> {
  const redis = await getTokenStore();
  await redis.set(REDIS_PREFIX_REVOKED + userId, "1");
  // Also revoke all refresh tokens
  await revokeAllUserTokens(userId);
}

/**
 * Remove revocation flag (e.g., when re-enabling a user account).
 */
export async function unrevokeUser(userId: string): Promise<void> {
  const redis = await getTokenStore();
  await redis.del(REDIS_PREFIX_REVOKED + userId);
}

/**
 * Check if a user is revoked. Used by per-write middleware.
 * Returns true if the user's writes should be blocked.
 */
export async function isUserRevoked(userId: string): Promise<boolean> {
  const redis = await getTokenStore();
  const result = await redis.get(REDIS_PREFIX_REVOKED + userId);
  return result !== null;
}

/**
 * Generate a complete token pair for a user (used on login).
 */
export function generateTokenPair(
  user: { userId: string; role: string; villageId: string | null },
  deviceId: string,
  deviceName: string
): { accessToken: string; expiresIn: number; refreshTokenPromise: Promise<string> } {
  const accessResult = signAccessToken(user);
  const refreshTokenPromise = createRefreshToken({
    ...user,
    deviceId,
    deviceName,
  });

  return {
    accessToken: accessResult.token,
    expiresIn: accessResult.expiresIn,
    refreshTokenPromise,
  };
}
