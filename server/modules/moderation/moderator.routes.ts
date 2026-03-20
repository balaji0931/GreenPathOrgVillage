import type { Express } from "express";
import { registerModeratorOperationsRoutes } from "./moderator-operations.routes";

export function registerModeratorRoutes(app: Express, requireAuth: any, requireRole: any) {
  registerModeratorOperationsRoutes(app, requireAuth, requireRole);
}
