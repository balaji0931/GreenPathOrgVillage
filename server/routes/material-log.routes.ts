import type { Express } from "express";
import { storage } from "../storage";
import { insertDailyWasteLogSchema, insertCompostProductionLogSchema, insertDryWasteSaleSchema } from "@shared/schema";
import { z } from "zod";

export function registerMaterialLogRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any, upload: any) {
app.get('/api/material-log/daily-waste', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const { startDate, endDate } = req.query;

    const logs = await storage.getDailyWasteLogsByVillage(
      villageId,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json(logs);
  } catch (error) {
    console.error('Get daily waste logs error:', error);
    res.status(500).json({ message: 'Failed to fetch daily waste logs' });
  }
});

app.get('/api/material-log/daily-waste/:date', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const { date } = req.params;

    const log = await storage.getDailyWasteLogByDate(villageId, date);

    if (!log) {
      return res.status(404).json({ message: 'No log found for this date' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get daily waste log error:', error);
    res.status(500).json({ message: 'Failed to fetch daily waste log' });
  }
});

app.post('/api/material-log/daily-waste', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const userId = req.session.userId!;

    // Validate photo requirements
    const { wetWasteKg, dryWasteKg, rejectedWasteKg, sanitaryWasteKg,
      wetWastePhotoUrl, dryWastePhotoUrl, rejectedWastePhotoUrl, sanitaryWastePhotoUrl } = req.body;

    // if (parseFloat(wetWasteKg || '0') > 0 && !wetWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for wet waste when quantity > 0' });
    // }
    // if (parseFloat(dryWasteKg || '0') > 0 && !dryWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for dry waste when quantity > 0' });
    // }
    // if (parseFloat(rejectedWasteKg || '0') > 0 && !rejectedWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for rejected waste when quantity > 0' });
    // }
    // if (parseFloat(sanitaryWasteKg || '0') > 0 && !sanitaryWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for sanitary waste when quantity > 0' });
    // }

    // // Check if entry already exists for this date
    // const existing = await storage.getDailyWasteLogByDate(villageId, req.body.date);
    // if (existing) {
    //   return res.status(409).json({ message: 'An entry already exists for this date. Please edit the existing entry.' });
    // }

    const validatedData = insertDailyWasteLogSchema.parse({
      ...req.body,
      villageId,
      createdBy: userId
    });

    const log = await storage.createDailyWasteLog(validatedData);
    res.status(201).json(log);
  } catch (error) {
    console.error('Create daily waste log error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create daily waste log' });
  }
});

app.patch('/api/material-log/daily-waste/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate photo requirements
    const { wetWasteKg, dryWasteKg, rejectedWasteKg, sanitaryWasteKg,
      wetWastePhotoUrl, dryWastePhotoUrl, rejectedWastePhotoUrl, sanitaryWastePhotoUrl } = req.body;

    // if (parseFloat(wetWasteKg || '0') > 0 && !wetWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for wet waste when quantity > 0' });
    // }
    // if (parseFloat(dryWasteKg || '0') > 0 && !dryWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for dry waste when quantity > 0' });
    // }
    // if (parseFloat(rejectedWasteKg || '0') > 0 && !rejectedWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for rejected waste when quantity > 0' });
    // }
    // if (parseFloat(sanitaryWasteKg || '0') > 0 && !sanitaryWastePhotoUrl) {
    //   return res.status(400).json({ message: 'Photo required for sanitary waste when quantity > 0' });
    // }

    const log = await storage.updateDailyWasteLog(parseInt(id), req.body);
    res.json(log);
  } catch (error) {
    console.error('Update daily waste log error:', error);
    res.status(500).json({ message: 'Failed to update daily waste log' });
  }
});

app.delete('/api/material-log/daily-waste/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteDailyWasteLog(parseInt(id));
    res.json({ message: 'Daily waste log deleted successfully' });
  } catch (error) {
    console.error('Delete daily waste log error:', error);
    res.status(500).json({ message: 'Failed to delete daily waste log' });
  }
});

// Compost Production Log endpoints
app.get('/api/material-log/compost', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const { startDate, endDate } = req.query;

    const logs = await storage.getCompostProductionLogsByVillage(
      villageId,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json(logs);
  } catch (error) {
    console.error('Get compost logs error:', error);
    res.status(500).json({ message: 'Failed to fetch compost production logs' });
  }
});

app.get('/api/material-log/compost/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const log = await storage.getCompostProductionLogById(parseInt(id));

    if (!log) {
      return res.status(404).json({ message: 'Compost production log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get compost log error:', error);
    res.status(500).json({ message: 'Failed to fetch compost production log' });
  }
});

app.post('/api/material-log/compost', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const userId = req.session.userId!;

    // Validate mandatory photo
    if (!req.body.photoUrl) {
      return res.status(400).json({ message: 'Photo is required for compost production log' });
    }

    // Validate compost status
    const validStatuses = ['good', 'average', 'bad'];
    if (!validStatuses.includes(req.body.compostStatus?.toLowerCase())) {
      return res.status(400).json({ message: 'Compost status must be good, average, or bad' });
    }

    const validatedData = insertCompostProductionLogSchema.parse({
      ...req.body,
      compostStatus: req.body.compostStatus.toLowerCase(),
      villageId,
      createdBy: userId
    });

    const log = await storage.createCompostProductionLog(validatedData);
    res.status(201).json(log);
  } catch (error) {
    console.error('Create compost log error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create compost production log' });
  }
});

app.patch('/api/material-log/compost/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate mandatory photo if provided
    if (req.body.photoUrl === null || req.body.photoUrl === '') {
      return res.status(400).json({ message: 'Photo is required for compost production log' });
    }

    // Validate compost status if provided
    if (req.body.compostStatus) {
      const validStatuses = ['good', 'average', 'bad'];
      if (!validStatuses.includes(req.body.compostStatus?.toLowerCase())) {
        return res.status(400).json({ message: 'Compost status must be good, average, or bad' });
      }
      req.body.compostStatus = req.body.compostStatus.toLowerCase();
    }

    const log = await storage.updateCompostProductionLog(parseInt(id), req.body);
    res.json(log);
  } catch (error) {
    console.error('Update compost log error:', error);
    res.status(500).json({ message: 'Failed to update compost production log' });
  }
});

app.delete('/api/material-log/compost/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteCompostProductionLog(parseInt(id));
    res.json({ message: 'Compost production log deleted successfully' });
  } catch (error) {
    console.error('Delete compost log error:', error);
    res.status(500).json({ message: 'Failed to delete compost production log' });
  }
});

// Dry Waste Sales endpoints
app.get('/api/material-log/dry-waste-sales', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const { startDate, endDate } = req.query;

    const sales = await storage.getDryWasteSalesByVillage(
      villageId,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json(sales);
  } catch (error) {
    console.error('Get dry waste sales error:', error);
    res.status(500).json({ message: 'Failed to fetch dry waste sales' });
  }
});

app.get('/api/material-log/dry-waste-sales/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await storage.getDryWasteSaleById(parseInt(id));

    if (!sale) {
      return res.status(404).json({ message: 'Dry waste sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Get dry waste sale error:', error);
    res.status(500).json({ message: 'Failed to fetch dry waste sale' });
  }
});

app.post('/api/material-log/dry-waste-sales', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const villageId = req.session.villageId!;
    const userId = req.session.userId!;

    const { materials, ...saleData } = req.body;

    // Validate materials exist
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ message: 'At least one material entry is required' });
    }

    // Validate each material
    for (const material of materials) {
      if (!material.materialType || !material.quantityKg || !material.ratePerKg) {
        return res.status(400).json({ message: 'Each material must have materialType, quantityKg, and ratePerKg' });
      }
      if (parseFloat(material.quantityKg) <= 0 || parseFloat(material.ratePerKg) < 0) {
        return res.status(400).json({ message: 'Quantity must be positive and rate cannot be negative' });
      }
    }

    const validatedSaleData = insertDryWasteSaleSchema.parse({
      ...saleData,
      villageId,
      createdBy: userId
    });

    const validatedMaterials = materials.map((m: any) => ({
      materialType: m.materialType,
      quantityKg: m.quantityKg.toString(),
      ratePerKg: m.ratePerKg.toString(),
      amount: (parseFloat(m.quantityKg) * parseFloat(m.ratePerKg)).toFixed(2)
    }));

    const sale = await storage.createDryWasteSale(validatedSaleData, validatedMaterials);
    res.status(201).json(sale);
  } catch (error) {
    console.error('Create dry waste sale error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create dry waste sale' });
  }
});

app.patch('/api/material-log/dry-waste-sales/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { materials, ...saleData } = req.body;

    // Validate materials if provided
    if (materials) {
      if (!Array.isArray(materials) || materials.length === 0) {
        return res.status(400).json({ message: 'At least one material entry is required' });
      }

      for (const material of materials) {
        if (!material.materialType || !material.quantityKg || !material.ratePerKg) {
          return res.status(400).json({ message: 'Each material must have materialType, quantityKg, and ratePerKg' });
        }
        if (parseFloat(material.quantityKg) <= 0 || parseFloat(material.ratePerKg) < 0) {
          return res.status(400).json({ message: 'Quantity must be positive and rate cannot be negative' });
        }
      }
    }

    const validatedMaterials = materials?.map((m: any) => ({
      materialType: m.materialType,
      quantityKg: m.quantityKg.toString(),
      ratePerKg: m.ratePerKg.toString(),
      amount: (parseFloat(m.quantityKg) * parseFloat(m.ratePerKg)).toFixed(2)
    }));

    const sale = await storage.updateDryWasteSale(parseInt(id), saleData, validatedMaterials);
    res.json(sale);
  } catch (error) {
    console.error('Update dry waste sale error:', error);
    res.status(500).json({ message: 'Failed to update dry waste sale' });
  }
});

app.delete('/api/material-log/dry-waste-sales/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteDryWasteSale(parseInt(id));
    res.json({ message: 'Dry waste sale deleted successfully' });
  } catch (error) {
    console.error('Delete dry waste sale error:', error);
    res.status(500).json({ message: 'Failed to delete dry waste sale' });
  }
});

// Image upload endpoint for Material & Output Log photos
app.post('/api/material-log/upload-photo', requireAuth, requireRole(['manager']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const cloudinary = await import('cloudinary').then(m => m.v2);
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'material-output-logs',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' }
      ]
    });

    // Clean up temp file
    const fs = await import('fs');
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Material log photo upload error:', error);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
});

}
