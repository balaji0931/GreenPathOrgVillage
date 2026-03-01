// Input validation and sanitization middleware
export const validateInput = (req: any, res: any, next: any) => {
    // Sanitize string inputs
    const sanitizeString = (str: string) => {
        if (typeof str !== 'string') return str;
        return str.trim().replace(/[<>'"]/g, ''); // Basic XSS prevention
    };

    // Recursively sanitize object
    const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
            return sanitizeString(obj);
        } else if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        } else if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const key in obj) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };

    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    next();
};
