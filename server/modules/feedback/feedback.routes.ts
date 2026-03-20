import type { Express } from "express";
import { storage } from "../../storage";
import { submitFeedback } from "./feedback.service";

export function registerFeedbackRoutes(app: Express, requireAuth: any, requireRole: any) {
    // Feedback routes
    app.post('/api/feedback', requireAuth, requireRole(['generator']), async (req, res) => {
        try {
            const { collectionId, rating, remarks } = req.body;
            const generatedBy = req.session.userId!;

            const feedbackData = await submitFeedback({
                generatorUserId: generatedBy,
                collectionId,
                rating,
                remarks,
            });

            res.json(feedbackData);
        } catch (error: any) {
            if (error.message === "Collection not found" || error.message === "Collector not found") {
                return res.status(404).json({ message: error.message });
            }
            if (error.message === "Unauthorized to provide feedback for this collection") {
                return res.status(403).json({ message: error.message });
            }
            if (error.message === "Feedback already submitted for this collector") {
                return res.status(400).json({ message: error.message });
            }
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
            res.status(500).json({ message: "Failed to get village feedback" });
        }
    });
}
