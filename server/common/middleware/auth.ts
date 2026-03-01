// Authentication middleware
export const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
};

export const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.session?.role || !roles.includes(req.session.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
