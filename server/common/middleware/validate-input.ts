// Input validation middleware — reject unsafe input with 400 (validate on input, encode on output)
export const validateInput = (req: any, res: any, next: any) => {
    // Dangerous patterns: HTML tags, event handlers, script injection
    const DANGEROUS_PATTERN = /<|>|javascript:|onerror\s*=|onload\s*=/i;

    // Check if a string contains dangerous content
    const isDangerous = (value: string): boolean => {
        if (typeof value !== 'string') return false;
        return DANGEROUS_PATTERN.test(value);
    };

    // Recursively check all string values in an object
    const checkObject = (obj: any): boolean => {
        if (typeof obj === 'string') {
            return isDangerous(obj);
        } else if (Array.isArray(obj)) {
            return obj.some(checkObject);
        } else if (obj && typeof obj === 'object') {
            return Object.values(obj).some(checkObject);
        }
        return false;
    };

    // Validate request body
    if (req.body && typeof req.body === 'object') {
        if (checkObject(req.body)) {
            return res.status(400).json({ message: "Invalid input" });
        }
    }

    // Validate query parameters
    if (req.query && typeof req.query === 'object') {
        if (checkObject(req.query)) {
            return res.status(400).json({ message: "Invalid input" });
        }
    }

    next();
};
