import type { Express } from "express";
import { registerModeratorAnalyticsRoutes } from "./moderator-analytics.routes";
import { registerModeratorOperationsRoutes } from "./moderator-operations.routes";

export function registerModeratorRoutes(app: Express, requireAuth: any, requireRole: any) {
  registerModeratorOperationsRoutes(app, requireAuth, requireRole);
  registerModeratorAnalyticsRoutes(app, requireAuth, requireRole);
}
