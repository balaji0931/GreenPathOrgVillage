import type { Express } from "express";
import { storage } from "../storage";
import { getCache, cacheKeys } from "../cache";

export function registerIssueRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
// Issues routes
app.post('/api/issues', requireAuth, requireRole(['generator', 'collector']), requireVillageAccess, async (req, res) => {
  try {
    const { title, description, category, photoUrl } = req.body;
    const reportedBy = req.session.userId!;
    const villageId = req.session.villageId!;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        message: "Title, description, and category are required",
        missingFields: {
          title: !title,
          description: !description,
          category: !category
        }
      });
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length === 0 || trimmedDescription.length === 0) {
      return res.status(400).json({ message: "Title and description cannot be empty" });
    }

    if (trimmedTitle.length < 3) {
      return res.status(400).json({ message: "Title must be at least 3 characters long" });
    }

    if (trimmedDescription.length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters long" });
    }

    console.log('Creating issue:', {
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      reportedBy,
      villageId,
      photoUrl: photoUrl || 'none'
    });

    const issue = await storage.createIssue({
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      reportedBy,
      villageId,
      photoUrl: photoUrl || null,
      status: 'open',
    });

    console.log('Issue created successfully with ID:', issue.id);

    res.status(201).json({
      ...issue,
      message: "Issue reported successfully"
    });
  } catch (error) {
    console.error("Create issue error:", error);
    res.status(500).json({
      message: "Failed to create issue",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // If status is being changed to in_progress or resolved, require proof photo
    if ((status === 'in_progress' || status === 'resolved') && !managerProofPhotoUrl) {
      return res.status(400).json({
        message: "Proof photo is required when updating issue status to 'In Progress' or 'Resolved'"
      });
    }

    const updates = {
      status,
      managerReply,
      ...(managerProofPhotoUrl && { managerProofPhotoUrl }),
      updatedAt: new Date()
    };

    const issue = await storage.updateIssue(parseInt(id), updates);

    // Invalidate issues caches
    const cache = getCache();
    const villageId = req.session.villageId;
    if (villageId) {
      await cache.delete(cacheKeys.issues(villageId));
      await cache.clear(`issues:${villageId}:*`); // Clear paginated caches
      await cache.delete(cacheKeys.villageDetails(villageId)); // Clear village details cache
    }

    res.json(issue);
  } catch (error) {
    console.error("Update issue error:", error);
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
