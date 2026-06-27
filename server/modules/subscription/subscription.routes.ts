import { Router } from "express";
import { db } from "../../db";
import { subscriptions, villages } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../../common/middleware/auth";

const router = Router();

// GET /api/subscriptions
// Admin only: Get all subscriptions
router.get("/", requireRole(["admin"]), async (req, res) => {
  try {
    const allSubscriptions = await db.select({
      id: subscriptions.id,
      villageId: subscriptions.villageId,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
      gracePeriodDays: subscriptions.gracePeriodDays,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      villageName: villages.name
    })
    .from(subscriptions)
    .leftJoin(villages, eq(subscriptions.villageId, villages.villageId))
    .orderBy(desc(subscriptions.createdAt));
    
    res.json(allSubscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

// GET /api/subscriptions/villages/:villageId
// Admin only: Get subscription history for a specific village
router.get("/villages/:villageId", requireRole(["admin"]), async (req, res) => {
  try {
    const { villageId } = req.params;
    const history = await db.query.subscriptions.findMany({
      where: eq(subscriptions.villageId, villageId),
      orderBy: [desc(subscriptions.createdAt)],
    });
    res.json(history);
  } catch (error) {
    console.error("Error fetching village subscription history:", error);
    res.status(500).json({ error: "Failed to fetch subscription history" });
  }
});

// GET /api/subscriptions/villages/:villageId/active
// Open to authenticated users: Get the currently active subscription
router.get("/villages/:villageId/active", async (req, res) => {
  try {
    const { villageId } = req.params;
    
    // Determine the current subscription. 
    // The date range applies to today. If multiple overlap, latest created takes precedence.
    const now = new Date();
    
    const allVillageSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.villageId, villageId),
      orderBy: [desc(subscriptions.createdAt)],
    });

    if (allVillageSubscriptions.length === 0) {
      return res.status(404).json({ error: "No subscriptions found" });
    }

    let activeSub = null;

    // Find the one that covers today including grace period
    for (const sub of allVillageSubscriptions) {
      const graceEnd = new Date(sub.endDate);
      graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays);
      
      // If it has started and hasn't passed grace period end
      if (now >= new Date(sub.startDate) && now <= graceEnd) {
        activeSub = sub;
        break;
      }
    }

    // If none are currently active, find the one that will start soonest, 
    // or if all are past, find the most recently ended one.
    if (!activeSub) {
      const futureSubs = allVillageSubscriptions.filter(s => new Date(s.startDate) > now);
      if (futureSubs.length > 0) {
        // Sort by start date ascending
        futureSubs.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        activeSub = futureSubs[0];
      } else {
        // All are in the past. Get the one with the latest end date.
        allVillageSubscriptions.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        activeSub = allVillageSubscriptions[0];
      }
    }

    res.json(activeSub);
  } catch (error) {
    console.error("Error fetching active subscription:", error);
    res.status(500).json({ error: "Failed to fetch active subscription" });
  }
});

// POST /api/subscriptions
// Admin only: Add a new subscription
router.post("/", requireRole(["admin"]), async (req, res) => {
  try {
    const { villageId, startDate, endDate, gracePeriodDays } = req.body;
    
    const start = new Date(startDate);
    const endWithGrace = new Date(endDate);
    endWithGrace.setDate(endWithGrace.getDate() + (gracePeriodDays || 30));

    const existingSubs = await db.query.subscriptions.findMany({
      where: eq(subscriptions.villageId, villageId)
    });

    const hasOverlap = existingSubs.some(sub => {
      const subStart = new Date(sub.startDate);
      const subEndWithGrace = new Date(sub.endDate);
      subEndWithGrace.setDate(subEndWithGrace.getDate() + sub.gracePeriodDays);
      return Math.max(start.getTime(), subStart.getTime()) <= Math.min(endWithGrace.getTime(), subEndWithGrace.getTime());
    });

    if (hasOverlap) {
      return res.status(400).json({ error: "This subscription overlaps with an existing subscription for this village." });
    }

    const [newSub] = await db.insert(subscriptions).values({
      villageId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      gracePeriodDays: gracePeriodDays || 30,
    }).returning();
    
    res.json(newSub);
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// PATCH /api/subscriptions/:id
// Admin only: Edit an existing subscription
router.patch("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, gracePeriodDays } = req.body;
    
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, parseInt(id))
    });

    if (!sub) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const now = new Date();
    const isStarted = now >= new Date(sub.startDate);
    const graceEnd = new Date(sub.endDate);
    graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays);
    const isEnded = now > graceEnd;

    const updateData: any = {};
    
    // Server-side enforcement of the rules
    if (!isStarted) {
      // Not started: allow everything except villageId
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (gracePeriodDays !== undefined) updateData.gracePeriodDays = gracePeriodDays;
    } else if (isStarted && !isEnded) {
      // Active or Grace: allow endDate and gracePeriodDays
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (gracePeriodDays !== undefined) updateData.gracePeriodDays = gracePeriodDays;
    } else {
      // Ended: read-only
      return res.status(403).json({ error: "Cannot edit an ended subscription. Please create a new one." });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields provided to update" });
    }

    const currentStartDate = updateData.startDate || sub.startDate;
    const currentEndDate = updateData.endDate || sub.endDate;
    const currentGraceDays = updateData.gracePeriodDays !== undefined ? updateData.gracePeriodDays : sub.gracePeriodDays;

    const start = new Date(currentStartDate);
    const endWithGraceOverlap = new Date(currentEndDate);
    endWithGraceOverlap.setDate(endWithGraceOverlap.getDate() + currentGraceDays);

    const existingSubs = await db.query.subscriptions.findMany({
      where: eq(subscriptions.villageId, sub.villageId)
    });

    const hasOverlap = existingSubs.some(existing => {
      if (existing.id === sub.id) return false;
      const subStart = new Date(existing.startDate);
      const subEndWithGrace = new Date(existing.endDate);
      subEndWithGrace.setDate(subEndWithGrace.getDate() + existing.gracePeriodDays);
      return Math.max(start.getTime(), subStart.getTime()) <= Math.min(endWithGraceOverlap.getTime(), subEndWithGrace.getTime());
    });

    if (hasOverlap) {
      return res.status(400).json({ error: "This subscription overlaps with an existing subscription for this village." });
    }

    updateData.updatedAt = new Date();

    const [updatedSub] = await db.update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, parseInt(id)))
      .returning();
      
    res.json(updatedSub);
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

export default router;
