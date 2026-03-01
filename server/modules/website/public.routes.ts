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
      console.error('Error submitting feedback:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Contact form submission with enhanced validation
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'Name, email, subject, and message are required' });
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

      // Length validation
      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
      }

      if (subject.length < 3 || subject.length > 200) {
        return res.status(400).json({ message: 'Subject must be between 3 and 200 characters' });
      }

      if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
      }

      const contact = await storage.createContactSubmission({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        subject: subject.trim(),
        message: message.trim(),
      });

      res.status(201).json({ 
        message: 'Message sent successfully',
        id: contact.id 
      });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}
