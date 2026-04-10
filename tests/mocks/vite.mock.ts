/**
 * Mock for server/vite.ts to avoid import.meta.dirname in Jest (CJS mode).
 * Tests only need the `log` export — setupVite and serveStatic are unused.
 */
export function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite() {}
export function serveStatic() {}
