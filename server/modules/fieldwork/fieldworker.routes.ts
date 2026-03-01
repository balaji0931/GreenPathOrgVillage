import type { Express } from "express";
import { storage } from "../../storage";
import bcrypt from "bcrypt";

export function registerFieldWorkerRoutes(app: Express, requireAuth: any, requireRole: any) {
  // Field Worker routes
  app.get('/api/fieldworkers', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const fieldworkers = await storage.getFieldWorkersByVillage(villageId);
      res.json(fieldworkers);
    } catch (error) {
      console.error("Get fieldworkers error:", error);
      res.status(500).json({ message: "Failed to get field workers" });
    }
  });

  app.post(
    '/api/fieldworkers',
    requireAuth,
    requireRole(['manager']),
    async (req, res) => {
      try {
        const { name, phone } = req.body;
        const villageId = req.session.villageId!;

        // Get existing fieldworkers (same as before)
        const existingFieldWorkers = await storage.getFieldWorkersByVillage(villageId);

        /**
         * Find the highest FW number ever used
         * Example userId: V002-FW007 -> 7
         */
        let maxNumber = 0;

        for (const fw of existingFieldWorkers) {
          const match = fw.userId?.match(/FW(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }

        const nextNumber = maxNumber + 1;

        // Generate UID: V001-FW001, V001-FW002, etc.
        const uid = `${villageId}-FW${String(nextNumber).padStart(3, '0')}`;

        // Create user account for field worker
        const hashedPassword = await bcrypt.hash(uid, 10);

        const fieldworker = await storage.createUser({
          userId: uid,
          password: hashedPassword,
          role: 'fieldworker',
          name,
          phone,
          villageId,
        });

        res.status(201).json(fieldworker);
      } catch (error: any) {
        console.error('Create fieldworker error:', error);

        if (error.code === '23505') {
          return res.status(409).json({
            message: 'Fieldworker already exists. Please retry.',
          });
        }

        res.status(500).json({
          message: 'Failed to create field worker',
        });
      }
    }
  );


  app.delete('/api/fieldworkers/:userId', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { userId } = req.params;
      const villageId = req.session.villageId!;

      // Verify the fieldworker belongs to the manager's village
      const user = await storage.getUserByUserId(userId);
      if (!user || user.villageId !== villageId || user.role !== 'fieldworker') {
        return res.status(404).json({ message: "Field worker not found" });
      }

      await storage.deleteFieldWorker(userId);
      res.json({ message: "Field worker deleted successfully" });
    } catch (error) {
      console.error("Delete fieldworker error:", error);
      res.status(500).json({ message: "Failed to delete field worker" });
    }
  });
}
