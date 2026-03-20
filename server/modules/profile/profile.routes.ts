import type { Express } from "express";
import { storage } from "../../storage";
import bcrypt from "bcrypt";
import { logAction } from "../audit/audit.storage";

export function registerProfileRoutes(app: Express, requireAuth: any) {
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const userId = req.session.userId!;

    const user = await storage.getUserByUserId(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS) || 10);
      await storage.updateUserPassword(userId, hashedPassword);
    }

    if (name && name !== user.name) {
      await storage.updateUser(userId, { name });
    }

    res.json({ message: "Profile updated successfully" });

    // Audit log (fire-and-forget, after response)
    if (newPassword) {
      logAction(req.session.villageId, userId, 'reset_password', 'user', userId, { self: true });
    }
    if (name && name !== user.name) {
      logAction(req.session.villageId, userId, 'updated', 'user', userId, { field: 'name' });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});
}
