import type { Express } from "express";
import { storage } from "../storage";

export function registerAdminRoutes(app: Express, requireAuth: any, requireRole: any) {
  // Feedback routes
  app.post('/api/feedback', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const { collectionId, rating, remarks } = req.body;
      const generatedBy = req.session.userId!;

      // Validate the collection belongs to this generator's household
      const collection = await storage.getCollectionById(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      const household = await storage.getHouseholdByGeneratorUserId(generatedBy);
      if (!household || collection.householdId !== household.id) {
        return res.status(403).json({ message: "Unauthorized to provide feedback for this collection" });
      }

      // Get collector from the collection (collectorId is the actual ID, not UID)
      const collector = await storage.getCollectorsByVillage(household.villageId);
      const targetCollector = collector.find(c => c.id === collection.collectorId);
      if (!targetCollector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      // Check if feedback already exists for this household-collector pair
      const existingFeedback = await storage.getFeedbackByHouseholdAndCollector(household.id, targetCollector.id);
      if (existingFeedback) {
        return res.status(400).json({ message: "Feedback already submitted for this collector" });
      }

      const feedbackData = await storage.createFeedback({
        fromHouseholdId: household.id,
        toCollectorId: targetCollector.id,
        rating,
        remarks: remarks || null,
      });

      res.json(feedbackData);
    } catch (error) {
      console.error("Create feedback error:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get('/api/feedback/village', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { date } = req.query;

      const feedback = await storage.getFeedbackByVillageWithFilters(villageId, date as string);
      res.json(feedback);
    } catch (error) {
      console.error("Get village feedback error:", error);
      res.status(500).json({ message: "Failed to get village feedback" });
    }
  });

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
