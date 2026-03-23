import type { Express } from "express";
import { registerDailyWasteLogRoutes } from "./daily-waste-log.routes";
import { registerCompostLogRoutes } from "./compost-log.routes";
import { registerDryWasteSalesRoutes } from "./dry-waste-sales.routes";
import { registerCollectorWasteLogRoutes } from "./collector-waste-log.routes";

export function registerMaterialLogRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any, upload: any) {
  registerDailyWasteLogRoutes(app, requireAuth, requireRole, requireVillageAccess);
  registerCompostLogRoutes(app, requireAuth, requireRole, requireVillageAccess);
  registerDryWasteSalesRoutes(app, requireAuth, requireRole, requireVillageAccess, upload);
  registerCollectorWasteLogRoutes(app, requireAuth, requireRole, requireVillageAccess);
}
