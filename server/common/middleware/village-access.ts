// Cross-village authorization middleware
export const requireVillageAccess = (req: any, res: any, next: any) => {
    const requestedVillageId = req.params.villageId || req.body.villageId || req.query.villageId;
    const userVillageId = req.session?.villageId;
    const userRole = req.session?.role;

    // Admins can access all villages
    if (userRole === 'admin') {
        return next();
    }

    // Moderators can access their assigned villages (check will be done in storage layer)
    if (userRole === 'moderator') {
        return next();
    }

    // Other roles must match village
    if (requestedVillageId && userVillageId && requestedVillageId !== userVillageId) {
        return res.status(403).json({ message: "Access denied: Village mismatch" });
    }

    next();
};
