import { storage } from "../../storage";

/**
 * Submit feedback from a generator for a collection.
 * Verbatim extraction from feedback.routes.ts POST /api/feedback
 */
export async function submitFeedback(data: {
    generatorUserId: string;
    collectionId: number;
    rating: number;
    remarks?: string;
}) {
    const { generatorUserId, collectionId, rating, remarks } = data;

    // Validate the collection belongs to this generator's household
    const collection = await storage.getCollectionById(collectionId);
    if (!collection) {
        throw new Error("Collection not found");
    }

    const household = await storage.getHouseholdByGeneratorUserId(generatorUserId);
    if (!household || collection.householdId !== household.id) {
        throw new Error("Unauthorized to provide feedback for this collection");
    }

    // Get collector from the collection (collectorId is the actual ID, not UID)
    const collector = await storage.getCollectorsByVillage(household.villageId);
    const targetCollector = collector.find(c => c.id === collection.collectorId);
    if (!targetCollector) {
        throw new Error("Collector not found");
    }

    // Check if feedback already exists for this household-collector pair
    const existingFeedback = await storage.getFeedbackByHouseholdAndCollector(household.id, targetCollector.id);
    if (existingFeedback) {
        throw new Error("Feedback already submitted for this collector");
    }

    const feedbackData = await storage.createFeedback({
        fromHouseholdId: household.id,
        toCollectorId: targetCollector.id,
        rating,
        remarks: remarks || null,
    });

    return feedbackData;
}
