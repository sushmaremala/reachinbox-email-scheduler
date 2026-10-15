import { prisma } from '../config/db';
import { config } from '../config/env';
import { EmailQueueService } from '../queues/email.queue';
import { rateLimiterService } from './rateLimiter.service';
import {
  ScheduleSingleEmailDto,
  ScheduleBatchEmailDto,
  DashboardStats,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class EmailService {
  /**
   * Schedule a single email for future delivery.
   */
  static async scheduleEmail(dto: ScheduleSingleEmailDto) {
    const sender = dto.sender || config.defaultSender;
    const scheduledAt = new Date(dto.scheduledAt);

    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Invalid scheduledAt timestamp');
    }

    // 1. Create durable record in Database (Source of Truth)
    const emailRecord = await prisma.emailJob.create({
      data: {
        recipient: dto.recipient.trim().toLowerCase(),
        subject: dto.subject,
        body: dto.body,
        sender: sender.trim(),
        scheduledAt,
        status: 'SCHEDULED',
      },
    });

    // 2. Queue delayed task in BullMQ
    await EmailQueueService.addScheduledEmailJob(emailRecord);

    return emailRecord;
  }

  /**
   * Schedule a batch campaign of emails (with optional staggered inter-email delay).
   */
  static async scheduleBatch(dto: ScheduleBatchEmailDto) {
    const sender = dto.sender || config.defaultSender;
    const baseStartTime = new Date(dto.scheduledStartTime).getTime();
    const delayStep = dto.delayBetweenEmailsMs ?? config.worker.minDelayBetweenEmailsMs;
    const batchId = uuidv4();

    if (isNaN(baseStartTime)) {
      throw new Error('Invalid scheduledStartTime timestamp');
    }

    if (!dto.recipients || dto.recipients.length === 0) {
      throw new Error('Recipients list cannot be empty');
    }

    const scheduledRecords = [];

    // Schedule each lead with staggered delay
    for (let i = 0; i < dto.recipients.length; i++) {
      const recipient = dto.recipients[i].trim();
      if (!recipient) continue;

      const leadScheduledTime = new Date(baseStartTime + i * delayStep);

      // Support dynamic template variable like {{name}}
      const leadName = recipient.split('@')[0];
      const personalizedBody = dto.body
        .replace(/{{name}}/gi, leadName)
        .replace(/{{recipient}}/gi, recipient);

      const emailRecord = await prisma.emailJob.create({
        data: {
          recipient: recipient.toLowerCase(),
          subject: dto.subject,
          body: personalizedBody,
          sender: sender.trim(),
          scheduledAt: leadScheduledTime,
          status: 'SCHEDULED',
          batchId,
        },
      });

      await EmailQueueService.addScheduledEmailJob(emailRecord);
      scheduledRecords.push(emailRecord);
    }

    return {
      batchId,
      totalScheduled: scheduledRecords.length,
      records: scheduledRecords,
    };
  }

  /**
   * Fetch scheduled emails (status = SCHEDULED or QUEUED).
   */
  static async getScheduledEmails(page = 1, limit = 50, search = '') {
    const skip = (page - 1) * limit;
    const where: any = {
      status: { in: ['SCHEDULED', 'QUEUED'] },
    };

    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { subject: { contains: search } },
        { sender: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch sent emails (status = SENT).
   */
  static async getSentEmails(page = 1, limit = 50, search = '') {
    const skip = (page - 1) * limit;
    const where: any = {
      status: 'SENT',
    };

    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel a pending scheduled email.
   */
  static async cancelEmail(id: string) {
    const email = await prisma.emailJob.findUnique({ where: { id } });
    if (!email) {
      throw new Error('Email job not found');
    }

    if (email.status === 'SENT') {
      throw new Error('Cannot cancel an email that has already been sent');
    }

    // 1. Remove from BullMQ queue
    await EmailQueueService.removeScheduledJob(id);

    // 2. Mark as CANCELLED in DB
    const updated = await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }

  /**
   * Get high-level dashboard metrics & rate limiting status.
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const [scheduledCount, sentCount, failedCount, cancelledCount] = await Promise.all([
      prisma.emailJob.count({ where: { status: { in: ['SCHEDULED', 'QUEUED'] } } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.emailJob.count({ where: { status: 'CANCELLED' } }),
    ]);

    const senderStats = await rateLimiterService.getSenderHourlyStats(config.defaultSender);

    return {
      totalScheduled: scheduledCount,
      totalSent: sentCount,
      totalFailed: failedCount,
      totalCancelled: cancelledCount,
      rateLimit: {
        hourlyLimit: config.worker.maxEmailsPerHour,
        currentHourSent: senderStats.currentHourSent,
        minDelayMs: config.worker.minDelayBetweenEmailsMs,
      },
    };
  }
}
