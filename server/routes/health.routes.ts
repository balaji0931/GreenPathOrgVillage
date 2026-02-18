import type { Express } from "express";

export function registerHealthRoutes(app: Express, requireAuth: any) {
  // Health check endpoints for load balancers and monitoring
  app.get('/api/health', async (req, res) => {
    const startTime = Date.now();

    try {
      // Only check database if explicitly requested with ?db=true
      const checkDb = req.query.db === 'true';
      let dbHealth = true;
      let dbStats = null;

      if (checkDb) {
        // Import database health check
        const { checkDatabaseHealth, getDatabaseStats } = await import('../db');
        
        // Check database connectivity
        dbHealth = await checkDatabaseHealth();
        dbStats = await getDatabaseStats();
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // System uptime
      const uptime = process.uptime();

      const healthData = {
        status: dbHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: checkDb ? {
          connected: dbHealth,
          stats: dbStats
        } : {
          connected: 'not_checked',
          stats: 'not_checked'
        },
        system: {
          uptime: Math.round(uptime),
          memory: memUsageMB,
          nodeVersion: process.version,
          platform: process.platform
        },
        services: {
          redis: !!process.env.REDIS_URL,
          cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
        }
      };

      res.status(dbHealth ? 200 : 503).json(healthData);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Date.now() - startTime
      });
    }
  });

  // Readiness probe for Kubernetes-style deployments
  app.get('/api/ready', async (req, res) => {
    try {
      const { checkDatabaseHealth } = await import('../db');
      const dbHealth = await checkDatabaseHealth();

      if (dbHealth) {
        res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ ready: false, reason: 'Database not ready' });
      }
    } catch (error) {
      res.status(503).json({ ready: false, reason: 'Service not ready' });
    }
  });

  // Liveness probe
  app.get('/api/alive', (req, res) => {
    res.status(200).json({ 
      alive: true, 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Performance metrics endpoint
  app.get('/api/metrics', requireAuth, async (req, res) => {
    try {
      const { getDatabaseStats } = await import('../db');
      const dbStats = await getDatabaseStats();
      const memUsage = process.memoryUsage();

      const metrics = {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: memUsage,
          cpu: process.cpuUsage(),
          nodeVersion: process.version
        },
        database: dbStats,
        environment: process.env.NODE_ENV
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect metrics' });
    }
  });
}
