import type { Express } from "express";
import { storage } from "../../storage";

export function registerAdminRoutes(app: Express, requireAuth: any, requireRole: any) {
  app.get('/api/admin/website-feedback', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const feedbacks = await storage.getWebsiteFeedbacks();
      res.json(feedbacks);
    } catch (error) {
      console.error('Error getting website feedback:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/admin/contact-submissions', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const contacts = await storage.getContactSubmissions();
      res.json(contacts);
    } catch (error) {
      console.error('Error getting contact submissions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}
