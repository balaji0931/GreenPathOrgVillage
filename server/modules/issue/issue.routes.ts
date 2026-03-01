import type { Express } from "express";
import { storage } from "../../storage";
import { createIssue, updateIssueStatus } from "./issue.service";

export function registerIssueRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Issues routes
  app.post('/api/issues', requireAuth, requireRole(['generator', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const { title, description, category, photoUrl } = req.body;
      const reportedBy = req.session.userId!;
      const villageId = req.session.villageId!;

      const issue = await createIssue({
        title,
        description,
        category,
        reportedBy,
        villageId,
        photoUrl,
      });

      res.status(201).json({
        ...issue,
        message: "Issue reported successfully"
      });
    } catch (error: any) {
      const err = error as Error;
      console.error("Create issue error:", err);

      // Handle structured validation errors
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.type === 'validation') {
          return res.status(400).json({
            message: parsed.message,
            missingFields: parsed.missingFields
          });
        }
      } catch {
        // Not JSON, treat as plain error message
      }

      // Handle plain validation errors
      if (err.message.includes("cannot be empty") ||
        err.message.includes("must be at least")) {
        return res.status(400).json({ message: err.message });
      }

      res.status(500).json({
        message: "Failed to create issue",
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  app.get('/api/issues', requireAuth, async (req, res) => {
    try {
      const villageId = req.session.villageId!;

      if (!villageId) {
        return res.status(400).json({ message: "Village ID required" });
      }

      const issues = await storage.getIssuesByVillage(villageId);
      res.json(issues);
    } catch (error) {
      console.error("Get issues error:", error);
      res.status(500).json({ message: "Failed to get issues" });
    }
  });

  app.get('/api/issues/paginated', requireAuth, async (req, res) => {
    try {
      const villageId = req.session.villageId!;

      if (!villageId) {
        return res.status(400).json({ message: "Village ID required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      const result = await storage.getIssuesByVillagePaginated(villageId, {
        page,
        limit,
        status
      });
      res.json(result);
    } catch (error) {
      console.error("Get paginated issues error:", error);
      res.status(500).json({ message: "Failed to get issues" });
    }
  });

  app.patch('/api/issues/:id', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, managerReply, managerProofPhotoUrl } = req.body;
      const villageId = req.session.villageId;

      const issue = await updateIssueStatus(
        parseInt(id),
        { status, managerReply, managerProofPhotoUrl },
        villageId
      );

      res.json(issue);
    } catch (error: any) {
      console.error("Update issue error:", error);
      if (error.message.includes("Proof photo is required")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.put('/api/issues/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, managerReply } = req.body;

      const updatedIssue = await storage.updateIssue(parseInt(id), {
        status,
        managerReply,
        updatedAt: new Date(),
      });

      res.json(updatedIssue);
    } catch (error) {
      console.error("Update issue error:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

}
