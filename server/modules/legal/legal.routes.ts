import type { Express } from "express";

export function registerLegalRoutes(app: Express) {
  // Legal compliance routes
  app.get('/api/legal/privacy-policy', (req, res) => {
    res.json({
      document: 'privacy-policy',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/privacy-policy`
    });
  });

  app.get('/api/legal/terms-of-service', (req, res) => {
    res.json({
      document: 'terms-of-service',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/terms-of-service`
    });
  });

  app.get('/api/legal/data-protection', (req, res) => {
    res.json({
      document: 'data-protection',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      compliance: ['DPDP Act 2023', 'IT Act 2000'],
      url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/data-protection`
    });
  });
}
