import type { Express } from "express";
import { storage } from "../../storage";

export function registerPublicRoutes(app: Express) {
  // Public API routes (no authentication required)
  // Website feedback submission with enhanced validation
  app.post('/api/website-feedback', async (req, res) => {
    try {
      const { name, email, feedbackType, message } = req.body;

      // Enhanced validation
      if (!name || !email || !feedbackType || !message) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Length validation
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
      }

      if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
      }

      const feedback = await storage.createWebsiteFeedback({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        feedbackType,
        message: message.trim(),
      });

      res.status(201).json({ 
        message: 'Feedback submitted successfully',
        id: feedback.id 
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Contact form submission with enhanced validation
  app.post('/api/contact', async (req, res) => {
    try {
      // Handle both old and new field names for backward compatibility/flexibility
      const { 
        name, contactName, 
        email, 
        phone, 
        subject, 
        organizationName, orgName,
        organizationType, orgType,
        estimatedHouseholds, households,
        state,
        message 
      } = req.body;

      const finalName = name || contactName;
      const finalOrgName = organizationName || orgName;
      const finalOrgType = organizationType || orgType;
      const finalHouseholds = estimatedHouseholds || households;

      if (!finalName || !email || !message) {
        return res.status(400).json({ message: 'Name, email, and message are required' });
      }
      
      if (subject && subject.trim().length < 3) {
        return res.status(400).json({ message: 'Subject must be at least 3 characters long' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Phone validation (if provided)
      if (phone && phone.trim() !== '') {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
          return res.status(400).json({ message: 'Invalid phone number format' });
        }
      }

      const contact = await storage.createContactSubmission({
        name: finalName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        subject: subject ? subject.trim() : "Inquiry from GreenPath Website",
        organizationName: finalOrgName ? finalOrgName.trim() : null,
        organizationType: finalOrgType ? finalOrgType.trim() : null,
        estimatedHouseholds: finalHouseholds ? String(finalHouseholds).trim() : null,
        state: state ? state.trim() : null,
        message: message.trim(),
      });

      res.status(201).json({ 
        message: 'Message sent successfully',
        id: contact.id 
      });
    } catch (error) {
      console.error("Contact Form Error:", error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}
