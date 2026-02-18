import type { Express } from "express";

export function registerHealthRoutes(app: Express, requireAuth: any) {




  // Liveness probe
  app.get('/api/alive', (req, res) => {
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });


}
