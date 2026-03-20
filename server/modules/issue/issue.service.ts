import { storage } from "../../storage";
import { getCache, cacheKeys } from "../../cache";

/**
 * Create a new issue with validation.
 * Verbatim extraction from issue.routes.ts POST /api/issues
 */
export async function createIssue(data: {
    title: string;
    description: string;
    category: string;
    reportedBy: string;
    villageId: string;
    photoUrl?: string;
}) {
    const { title, description, category, reportedBy, villageId, photoUrl } = data;

    // Validate required fields
    if (!title || !description || !category) {
        throw new Error(JSON.stringify({
            type: 'validation',
            message: "Title, description, and category are required",
            missingFields: {
                title: !title,
                description: !description,
                category: !category
            }
        }));
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length === 0 || trimmedDescription.length === 0) {
        throw new Error("Title and description cannot be empty");
    }

    if (trimmedTitle.length < 3) {
        throw new Error("Title must be at least 3 characters long");
    }

    if (trimmedDescription.length < 10) {
        throw new Error("Description must be at least 10 characters long");
    }


    const issue = await storage.createIssue({
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        reportedBy,
        villageId,
        photoUrl: photoUrl || null,
        status: 'open',
    });


    return issue;
}

/**
 * Update issue status with cache invalidation.
 * Verbatim extraction from issue.routes.ts PATCH /api/issues/:id
 */
export async function updateIssueStatus(
    id: number,
    updates: {
        status: string;
        managerReply?: string;
        managerProofPhotoUrl?: string;
    },
    villageId?: string
) {
    const { status, managerReply, managerProofPhotoUrl } = updates;

    // If status is being changed to in_progress or resolved, require proof photo
    if ((status === 'in_progress' || status === 'resolved') && !managerProofPhotoUrl) {
        throw new Error("Proof photo is required when updating issue status to 'In Progress' or 'Resolved'");
    }

    const updateData = {
        status,
        managerReply,
        ...(managerProofPhotoUrl && { managerProofPhotoUrl }),
        updatedAt: new Date()
    };

    const issue = await storage.updateIssue(id, updateData);

    // Invalidate issues caches
    const cache = getCache();
    if (villageId) {
        await cache.delete(cacheKeys.issues(villageId));
        await cache.clear(`issues:${villageId}:*`); // Clear paginated caches

    }

    return issue;
}
