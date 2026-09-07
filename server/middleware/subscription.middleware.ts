import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { subscriptions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  // Only intercept write methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Bypass paths that should always be allowed
  const bypassPaths = [
    "/auth/login",
    "/auth/logout",
    "/auth/register",
    "/auth/change-password"
  ];

  if (bypassPaths.some(path => req.path === path)) {
    return next();
  }

  // Admins are exempt from write blocks
  const role = (req as any).user?.role || (req as any).session?.role;

  if (role === 'admin') {
    return next();
  }

  const villageId = (req as any).user?.villageId || (req as any).session?.villageId;
  if (!villageId) {
    return next();
  }

  try {
    const allVillageSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.villageId, villageId),
      orderBy: [desc(subscriptions.createdAt)],
    });

    if (allVillageSubscriptions.length === 0) {
      // If there are no subscriptions at all, we block from writing until admin adds a sub.
      return res.status(403).json({ error: "SUBSCRIPTION_EXPIRED" });
    }

    const now = new Date();
    let activeSub = null;

    // Find the one that covers today including grace period
    for (const sub of allVillageSubscriptions) {
      const graceEnd = new Date(sub.endDate);
      graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays);

      if (now >= new Date(sub.startDate) && now <= graceEnd) {
        activeSub = sub;
        break;
      }
    }

    if (!activeSub) {
      // It means we are in Read-Only mode. No write access.
      return res.status(403).json({ error: "SUBSCRIPTION_EXPIRED" });
    }

    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    res.status(500).json({ error: "Internal server error verifying subscription." });
  }
}
