import type { Express } from "express";
import { storage } from "../../storage";
import { insertDryWasteSaleSchema } from "@shared/schema";
import { z } from "zod";

export function registerDryWasteSalesRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any, upload: any) {
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
                saleId: 0, // Will be set by storage after sale is created
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
