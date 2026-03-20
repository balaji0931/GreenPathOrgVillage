import type { Express } from "express";
import { storage } from "../../storage";
import bcrypt from "bcrypt";

export function registerAuthRoutes(app: Express, requireAuth: any, generateCsrfToken: () => string) {
  // CSRF token endpoint - provides token for authenticated sessions
  app.get('/api/auth/csrf-token', (req, res) => {
    // Generate new CSRF token and store in session
    const token = generateCsrfToken();
    req.session.csrfToken = token;
    res.json({ csrfToken: token });
  });

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { userId, password } = req.body;

      // Initialize admin user only when someone attempts to login
      // await ensureAdminUser();

      const user = await storage.getUserByUserId(userId);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session to prevent session fixation attacks
      // This must succeed for security - we fail closed if it doesn't work
      const regenerateSession = () => new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Save session after setting values
      const saveSession = () => new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Session regeneration must succeed - fail closed for security
      await regenerateSession();

      // Set session data after regeneration
      req.session.userId = user.userId;
      req.session.role = user.role;
      req.session.villageId = user.villageId ?? undefined;

      // Generate new CSRF token for the session
      const csrfToken = generateCsrfToken();
      req.session.csrfToken = csrfToken;

      // Explicitly save session to ensure data is persisted
      await saveSession();

      res.json({
        user: {
          userId: user.userId,
          role: user.role,
          name: user.name,
          villageId: user.villageId,
          isFirstLogin: user.isFirstLogin,
        },
        csrfToken
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', (req, res) => {
    // Check session first without hitting database
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only hit database if user is actually logged in
    storage.getUserByUserId(req.session.userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          userId: user.userId,
          role: user.role,
          name: user.name,
          villageId: user.villageId,
          isFirstLogin: user.isFirstLogin,
        });
      })
      .catch(error => {
        res.status(500).json({ message: "Failed to get user" });
      });
  });

  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { newPassword } = req.body;

      // Server-side password validation
      if (!newPassword || typeof newPassword !== 'string') {
        return res.status(400).json({ message: "New password is required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS) || 10);

      await storage.updateUserPassword(req.session.userId!, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}
