import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';
import { getEtherealAccountInfo } from '../config/mailer';
import { z } from 'zod';

export const scheduleSingleSchema = z.object({
  body: z.object({
    recipient: z.string().email('Invalid recipient email address'),
    subject: z.string().min(1, 'Subject cannot be empty'),
    body: z.string().min(1, 'Email body cannot be empty'),
    sender: z.string().optional(),
    scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid scheduledAt ISO date string',
    }),
  }),
});

export const scheduleBatchSchema = z.object({
  body: z.object({
    recipients: z.array(z.string().email('Invalid email in recipients')).min(1, 'Must provide at least one recipient'),
    subject: z.string().min(1, 'Subject cannot be empty'),
    body: z.string().min(1, 'Email body cannot be empty'),
    sender: z.string().optional(),
    scheduledStartTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid scheduledStartTime ISO date string',
    }),
    delayBetweenEmailsMs: z.number().min(500).optional(),
  }),
});

export class EmailController {
  static async scheduleSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const email = await EmailService.scheduleEmail(req.body);
      res.status(201).json({
        success: true,
        message: 'Email scheduled successfully',
        data: email,
      });
    } catch (error) {
      next(error);
    }
  }

  static async scheduleBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.scheduleBatch(req.body);
      res.status(201).json({
        success: true,
        message: `Successfully scheduled batch of ${result.totalScheduled} emails`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduled(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const search = (req.query.search as string) || '';

      const result = await EmailService.getScheduledEmails(page, limit, search);
      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSent(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const search = (req.query.search as string) || '';

      const result = await EmailService.getSentEmails(page, limit, search);
      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await EmailService.cancelEmail(id);
      res.json({
        success: true,
        message: 'Email schedule cancelled',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await EmailService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEtherealInfo(req: Request, res: Response) {
    const info = getEtherealAccountInfo();
    res.json({
      success: true,
      data: info,
    });
  }
}
