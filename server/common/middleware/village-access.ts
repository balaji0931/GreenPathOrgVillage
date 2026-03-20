import { isModeratorAssignedToVillage } from "../../modules/moderation/moderator.storage";

// Cross-village authorization middleware
export const requireVillageAccess = async (req: any, res: any, next: any) => {
    const requestedVillageId = req.params.villageId || req.body.villageId || req.query.villageId;
    const userVillageId = req.session?.villageId;
    const userRole = req.session?.role;
    const userId = req.session?.userId;

    // Admins can access all villages
    if (userRole === 'admin') {
        return next();
    }

    // Moderators must be assigned to the requested village
    if (userRole === 'moderator') {
        // If a specific village was requested, verify assignment
        if (requestedVillageId) {
            const assigned = await isModeratorAssignedToVillage(userId, requestedVillageId);
            if (!assigned) {
                return res.status(403).json({ message: "Access denied: Not assigned to this village" });
            }
        }
        // If no specific village requested, moderator routes handle their own scoping
        return next();
    }

    // Other roles must match village
    if (requestedVillageId && userVillageId && requestedVillageId !== userVillageId) {
        return res.status(403).json({ message: "Access denied: Village mismatch" });
    }

    next();
};
