import { randomBytes } from "crypto";

// Generate cryptographically secure CSRF token
export const generateCsrfToken = (): string => {
    return randomBytes(32).toString('hex');
};

// CSRF protection middleware - validates token on state-changing requests
export const csrfProtection = (req: any, res: any, next: any) => {
    // Skip CSRF check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Skip CSRF for public endpoints that don't require auth
    const publicEndpoints = [
        '/api/website-feedback',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/contact',
        '/api/newsletter',
        '/api/auth/csrf-token'
    ];
    // Normalize path: use originalUrl (preserves /api prefix when mounted via app.use('/api', ...))
    // Strip query string and trailing slash for exact comparison
    const normalizedPath = (req.originalUrl || req.path).split('?')[0].replace(/\/$/, '');
    if (publicEndpoints.includes(normalizedPath)) {
        return next();
    }

    // Skip CSRF for unauthenticated requests (they can't do anything sensitive anyway)
    if (!req.session?.userId) {
        return next();
    }

    // Get token from header
    const headerToken = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (!headerToken || !sessionToken || headerToken !== sessionToken) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    next();
};
