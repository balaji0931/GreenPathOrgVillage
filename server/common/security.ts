import helmet from "helmet";
import type { Express } from "express";

export function configureSecurityHeaders(app: Express) {
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'", // Allow inline styles
                        "https://fonts.googleapis.com"
                    ],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: [
                        "'self'",
                        "data:",
                        "https:", // Allow all HTTPS images
                        "blob:"
                    ],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'", // Allow inline scripts
                        "'unsafe-eval'", // Allow eval for development
                        "https://checkout.razorpay.com",
                        "https://sdk.cashfree.com",
                        "https://jssdk.payu.in",
                    ],
                    connectSrc: [
                        "'self'",
                        "https:",
                        "wss:",
                        "ws:" // Allow websockets for development
                    ],
                    mediaSrc: [
                        "'self'",
                        "https:",
                        "blob:"
                    ],
                    workerSrc: ["'self'", "blob:"],
                    frameSrc: [
                        "'self'",
                        "https://api.razorpay.com",
                        "https://checkout.razorpay.com",
                        "https://sdk.cashfree.com",
                        "https://sandbox.cashfree.com",
                        "https://api.cashfree.com",
                        "https://jssdk.payu.in",
                        "https://secure.payu.in",
                        "https://test.payu.in",
                    ], // Allow gateway checkout iframes
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: [
                        "'self'",
                        "https://sandbox.cashfree.com",
                        "https://api.cashfree.com",
                        "https://jssdk.payu.in",
                        "https://secure.payu.in",
                        "https://test.payu.in",
                    ],
                },
            },
            crossOriginEmbedderPolicy: false, // Required for some PWA features
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },
        }),
    );
}
