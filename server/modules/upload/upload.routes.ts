import type { Express } from "express";
import type { Multer } from "multer";

export function registerUploadRoutes(app: Express, requireAuth: any, requireRole: any, upload: Multer) {
  // File upload routes
  app.post('/api/upload/photo', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { uploadToCloudinary } = await import('./cloudinary');
      const fs = await import('fs');
      const buffer = fs.readFileSync(req.file.path);

      const result = await uploadToCloudinary(buffer, {
        folder: 'collection-photos',
        resource_type: 'image'
      });

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.post('/api/upload/voice', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { uploadToCloudinary } = await import('./cloudinary');
      const fs = await import('fs');
      const buffer = fs.readFileSync(req.file.path);

      const result = await uploadToCloudinary(buffer, {
        folder: 'voice-recordings',
        resource_type: 'auto'
      });

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (error) {
      console.error("Voice upload error:", error);
      res.status(500).json({ message: "Failed to upload voice recording" });
    }
  });

  // Manager proof photo upload for issue updates
  app.post('/api/upload/manager-proof', requireAuth, requireRole(['manager', 'admin']), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { uploadToCloudinary } = await import('./cloudinary');
      const fs = await import('fs');
      const buffer = fs.readFileSync(req.file.path);

      const result = await uploadToCloudinary(buffer, {
        folder: 'manager-proof-photos',
        resource_type: 'image'
      });

      // Clean up temporary file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (error) {
      console.error("Manager proof photo upload error:", error);
      res.status(500).json({ message: "Failed to upload manager proof photo" });
    }
  });

  // File upload routes
  app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });
}
