import '../setup/test-env';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import type { Express } from 'express';
import type { Server } from 'http';

let cachedApp: Express | null = null;
let cachedServer: Server | null = null;

/**
 * Creates the test Express app with full middleware and routes.
 * Uses MemoryStore for sessions (no Redis).
 * Uses MemoryCache for caching (no Redis).
 * Rate limiting is disabled via NODE_ENV=test guard.
 * Cloudinary is mocked via Jest moduleNameMapper.
 *
 * Returns the Express app for use with Supertest.
 * Does NOT call listen() — Supertest handles that internally.
 */
export async function getTestApp(): Promise<Express> {
    if (cachedApp) return cachedApp;

    const { app } = createApp();
    cachedServer = await registerRoutes(app);
    cachedApp = app;
    return app;
}

/**
 * Close the test server and clear the cache.
 * Call in globalTeardown or afterAll.
 */
export async function closeTestApp() {
    if (cachedServer) {
        cachedServer.close();
        cachedServer = null;
    }
    cachedApp = null;
}
