import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.GATEWAY_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("GATEWAY_ENCRYPTION_KEY environment variable is required for gateway config encryption");
  }
  // Key must be 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("GATEWAY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return keyBuffer;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Output format: iv:tag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt ciphertext produced by encrypt().
 * Input format: iv:tag:ciphertext (all hex-encoded)
 */
export function decrypt(ciphertext: string): string {
  const key = getMasterKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format — expected iv:tag:ciphertext");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a SHA-256 hash of the encrypted config — used for billing cycle snapshots.
 * Does NOT decrypt; hashes the ciphertext directly.
 */
export function hashConfig(encryptedConfigJson: string): string {
  return crypto.createHash("sha256").update(encryptedConfigJson).digest("hex").slice(0, 16);
}

/**
 * Encrypt a config JSON object. Convenience wrapper around encrypt().
 */
export function encryptConfig(config: Record<string, any>): string {
  return encrypt(JSON.stringify(config));
}

/**
 * Decrypt to a config JSON object. Convenience wrapper around decrypt().
 */
export function decryptConfig<T = Record<string, any>>(encryptedData: string): T {
  return JSON.parse(decrypt(encryptedData)) as T;
}

/**
 * Generate a new master key (for initial setup). Prints to console.
 * Run: npx tsx -e "import { generateMasterKey } from './server/utils/crypto'; generateMasterKey();"
 */
export function generateMasterKey(): string {
  const key = crypto.randomBytes(32).toString("hex");
  // Only print when run directly as CLI script — never in server process
  if (require.main === module) {
    process.stdout.write(`GATEWAY_ENCRYPTION_KEY=${key}\n`);
  }
  return key;
}
