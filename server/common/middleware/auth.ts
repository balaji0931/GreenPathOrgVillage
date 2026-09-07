// Authentication middleware
// Checks req.user (populated by dualAuth for both Bearer and session)
// Falls back to req.session for backward compatibility with routes
// that haven't been migrated to dualAuth yet.
export const requireAuth = (req: any, res: any, next: any) => {
    const userId = req.user?.userId || req.session?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
};

export const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    const role = req.user?.role || req.session?.role;
    if (!role || !roles.includes(role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
