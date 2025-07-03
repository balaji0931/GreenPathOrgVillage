# GreenPathOrg - Waste Management System

## Overview

GreenPathOrg is a comprehensive waste management system designed for villages to track waste collection, manage households, and coordinate between different user roles. The application serves as a digital platform connecting waste generators (households), collectors, managers, moderators, and administrators in an efficient waste management ecosystem.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Session-based authentication with express-session
- **File Storage**: Cloudinary for image/QR code storage
- **Password Hashing**: bcrypt for secure password storage

### Database Architecture
- **Primary Database**: PostgreSQL hosted on AWS RDS
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Connection pooling with pg library

## Key Components

### User Roles and Authentication
- **Admin**: System-wide management and village creation
- **Moderator**: manages allocated villages by the admin a lower level admin
- **Manager**: Village-level management and household coordination
- **Collector**: Waste collection operations and QR scanning
- **Generator**: Household waste management and issue reporting

### Core Entities
- **Villages**: Geographic waste management units
- **Users**: Role-based user accounts with hierarchical permissions
- **Households**: Waste generators with QR code identification
- **Collectors**: Waste collection personnel with route assignments
- **Waste Collections**: Track collection events and feedback
- **Issues**: Problem reporting and resolution system
- **Announcements**: Communication system for village updates

### QR Code System
- **Generation**: Server-side QR code creation for households
- **Storage**: Cloudinary integration for QR code image storage
- **Scanning**: Client-side QR scanner for collection verification

## Data Flow

### User Authentication Flow
1. User submits credentials via login form
2. Server validates against database using bcrypt
3. Session created and stored server-side
4. Client receives authentication status
5. Role-based dashboard routing

### Waste Collection Flow
1. Collector scans household QR code
2. System validates household and collector permissions
3. Collection event recorded with optional feedback
4. Household status updated in real-time
5. Manager dashboard reflects collection statistics

### Issue Reporting Flow
1. Generator reports issue through mobile interface
2. Issue stored with optional photo upload via Cloudinary
3. Manager receives notification of new issues
4. Admin can view system-wide issue analytics

## External Dependencies

### Cloud Services
- **Cloudinary**: Image storage and QR code hosting
- **AWS RDS**: PostgreSQL database hosting
- **Replit**: Development and deployment platform

### Key Libraries
- **Database**: Drizzle ORM, PostgreSQL driver, Neon serverless
- **Authentication**: bcrypt, express-session
- **File Upload**: multer for multipart form handling
- **QR Processing**: qrcode library for generation
- **UI Components**: Radix UI primitives via shadcn/ui
- **Charts**: Recharts for dashboard analytics

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Development Server**: Vite dev server with HMR
- **Database**: Direct PostgreSQL connection
- **Port Configuration**: 5000 (internal) mapped to 80 (external)

### Production Build
- **Frontend**: Vite build to `dist/public`
- **Backend**: esbuild bundle to `dist/index.js`
- **Deployment**: Replit autoscale deployment
- **Environment**: Production NODE_ENV with optimizations

### Configuration Management
- **Environment Variables**: DATABASE_URL, Cloudinary credentials
- **Session Security**: Configurable session secret
- **SSL**: Disabled for development, configurable for production

## Changelog
- June 21, 2025. Initial setup
- June 21, 2025. Database migration completed - switched from Replit database to Neon PostgreSQL, removed all test data, created single admin account (ADMIN/Admin123)
- June 21, 2025. Redesigned collector dashboard as mobile-first app with 3 tabs (Home, Scan, Profile), streamlined collection form with yes/no questions, ratings, checkboxes, and photo upload
- June 21, 2025. Fixed QR scanner to use real QR code detection with qr-scanner library, removed test buttons, added automatic QR detection with user feedback
- June 21, 2025. Redesigned collection form for uneducated collectors with emojis, bigger buttons, voice recording, required field validation, confirmation dialog, and date/time stamping
- June 21, 2025. Fixed QR scanning logic to properly parse household JSON data and search in local household list, resolved status update issues after form submission with forced cache invalidation and re-renders
- June 21, 2025. Implemented one-per-day collection restriction - prevents duplicate submissions and shows previous form details when trying to collect same household twice
- June 21, 2025. Fixed photo and voice recording uploads to Cloudinary, added voice_url column to database, completed file storage integration with existing credentials
- June 22, 2025. Removed all attendance-related functionality for segregators and collectors per user request, removed segregators feature entirely from manager dashboard, cleaned up UI and backend routes
- June 22, 2025. Added Collections and Issues management tabs to manager dashboard with comprehensive filtering, detailed view of collection records with ratings/photos/voice notes, and issue management with status updates and manager replies
- June 22, 2025. Fixed data mapping errors in Collections and Feedback tabs, added Reports tab with analytics dashboard showing collection trends, segregation rates, performance metrics, and filtering options (today/monthly/alltime)
- June 23, 2025. Completed comprehensive internationalization with full collection form translation in 5 languages (English, Hindi, Telugu, Tamil, Kannada), covering all form elements, navigation, and user interface components
- June 23, 2025. Enhanced PWA functionality with proper manifest configuration, service worker registration, and install button integration on login page for improved mobile app experience
- June 24, 2025. Fixed PWA installation issues - corrected service worker and manifest MIME types, added dedicated icon routes with proper image headers, resolved package generation errors, implemented working install button with manual installation fallbacks for all mobile devices
- June 24, 2025. Created proper green leaf app icons with PIL - replaced purple placeholder icons with professional green background and white leaf design for all PWA icon sizes, ensuring proper branding and visual identity
- June 29, 2025. **PRODUCTION READY** - Implemented comprehensive production optimizations including advanced security (Helmet.js, rate limiting, CORS), performance enhancements (compression, database pooling, caching), scalability features (Redis sessions, health monitoring), enhanced PWA with intelligent caching, performance monitoring hooks, production-ready database configuration with connection pooling and health checks, structured logging with Winston, graceful shutdown handling, and comprehensive health check endpoints for deployment monitoring
- July 3, 2025. **TWA OPTIMIZED** - Fixed TWA (Trusted Web Activity) app compatibility issues by removing duplicate icon routes, enhanced manifest.json with better TWA support, improved icon serving with proper CORS headers and content-length, added Digital Asset Links for Android app verification, enhanced HTML meta tags for better TWA integration, added PWA health check endpoint, and optimized caching strategies for mobile app experience

## User Preferences

Preferred communication style: Simple, everyday language.
Mobile-first design priority: Collector dashboard should look and feel like a mobile app with clean navigation and touch-friendly interfaces.
Form accessibility: Collection forms should be designed for uneducated users with emojis, large buttons, color coding, and voice recording options instead of text input.