import type { Express } from "express";
import { storage } from "../../storage";

export function registerAnnouncementRoutes(app: Express, requireAuth: any, requireRole: any) {
// Announcements routes
app.post('/api/announcements', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { message, targetAudience, villageId: requestVillageId, photoUrl } = req.body;
    const createdBy = req.session.userId!;
    const villageId = req.session.role === 'admin' ? (requestVillageId || null) : req.session.villageId!;

    const announcement = await storage.createAnnouncement({
      message,
      targetAudience,
      villageId,
      createdBy,
      photoUrl: photoUrl || null,
    });

    res.json(announcement);
  } catch (error) {
    console.error("Create announcement error:", error);
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

// Admin route to get all announcements
app.get('/api/admin/announcements', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const announcements = await storage.getAllAnnouncements();
    res.json(announcements);
  } catch (error) {
    console.error("Get all announcements error:", error);
    res.status(500).json({ message: "Failed to get announcements" });
  }
});

// Paginated announcements endpoint
app.get('/api/admin/announcements/paginated', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const villageId = req.query.villageId as string;

    const result = await storage.getAllAnnouncementsPaginated({ page, limit, villageId });
    res.json(result);
  } catch (error) {
    console.error("Get paginated announcements error:", error);
    res.status(500).json({ message: "Failed to get announcements" });
  }
});

// Update announcement
app.put('/api/announcements/:id', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { message, targetAudience, photoUrl } = req.body;
    const userId = req.session.userId!;

    const updatedAnnouncement = await storage.updateAnnouncement(id, {
      message,
      targetAudience,
      photoUrl,
      updatedBy: userId,
    });

    res.json(updatedAnnouncement);
  } catch (error) {
    console.error("Update announcement error:", error);
    res.status(500).json({ message: "Failed to update announcement" });
  }
});

// Delete announcement
app.delete('/api/announcements/:id', requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId!;

    await storage.deleteAnnouncement(id, userId);
    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

app.get('/api/announcements', requireAuth, async (req, res) => {
  try {
    let announcements: any[] = [];

    if (req.session.villageId) {
      // Get village-specific announcements
      announcements = await storage.getAnnouncementsByVillage(req.session.villageId);
    }

    // Get global announcements
    const globalAnnouncements = await storage.getGlobalAnnouncements();
    announcements = [...announcements, ...globalAnnouncements];

    // Filter by target audience
    const filteredAnnouncements = announcements.filter(announcement => {
      if (announcement.targetAudience === 'all') return true;
      if (announcement.targetAudience === 'managers' && req.session.role === 'manager') return true;
      if (announcement.targetAudience === 'generators' && req.session.role === 'generator') return true;
      return false;
    });

    res.json(filteredAnnouncements);
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({ message: "Failed to get announcements" });
  }
});
}
