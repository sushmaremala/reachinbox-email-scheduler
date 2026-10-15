import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { sendEmail } from '../config/mailer';
import { config } from '../config/env';
import { QUEUE_NAME, EmailQueueService } from '../queues/email.queue';
import { rateLimiterService } from '../services/rateLimiter.service';
import { QueueJobPayload } from '../types';

export function createEmailWorker(): Worker<QueueJobPayload> {
  const worker = new Worker<QueueJobPayload>(
    QUEUE_NAME,
    async (job: Job<QueueJobPayload>) => {
      const { emailId } = job.data;
      console.log(`\n⏳ [Worker] Processing email job: ${job.id} for email ID: ${emailId}`);

      // 1. Fetch record from Database (Source of Truth)
      const emailRecord = await prisma.emailJob.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.warn(`⚠️ [Worker] Email record not found for ID: ${emailId}. Skipping job.`);
        return { status: 'SKIPPED', reason: 'Record not found' };
      }

      if (emailRecord.status === 'CANCELLED') {
        console.log(`🛑 [Worker] Email ${emailId} was cancelled by user. Skipping.`);
        return { status: 'CANCELLED' };
      }

      if (emailRecord.status === 'SENT') {
        console.log(`ℹ️ [Worker] Email ${emailId} was already sent. Skipping.`);
        return { status: 'ALREADY_SENT' };
      }

      // 2. Check Rate Limits (Hourly quota and Inter-email delay)
      const rateLimit = await rateLimiterService.checkRateLimit(emailRecord.sender);

      if (!rateLimit.allowed) {
        console.log(
          `⏸️ [Worker RateLimit] Sender ${emailRecord.sender} rate-limited (${rateLimit.reason}). Waiting ${rateLimit.waitMs}ms`
        );

        if (rateLimit.waitMs <= 3500) {
          // For short inter-email delays, sleep within the job to maintain sequence
          await new Promise((resolve) => setTimeout(resolve, rateLimit.waitMs));
        } else {
          // For longer hourly quotas, re-schedule delayed job safely
          console.log(`🔄 [Worker] Re-queueing job ${emailId} with delay of ${rateLimit.waitMs}ms`);
          await job.remove();
          await EmailQueueService.addScheduledEmailJob(emailRecord, rateLimit.waitMs);
          return { status: 'RESCHEDULED_DUE_TO_RATE_LIMIT', waitMs: rateLimit.waitMs };
        }
      }

      // 3. Update status to SENDING
      await prisma.emailJob.update({
        where: { id: emailId },
        data: {
          status: 'SENDING',
          attempts: { increment: 1 },
        },
      });

      try {
        // 4. Send email through Ethereal SMTP
        const result = await sendEmail({
          from: emailRecord.sender,
          to: emailRecord.recipient,
          subject: emailRecord.subject,
          html: emailRecord.body,
        });

        // 5. Update status to SENT and save Ethereal Preview URL
        const updated = await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: result.previewUrl ? result.previewUrl.toString() : null,
            etherealMessageId: result.messageId,
            errorMessage: null,
          },
        });

        // 6. Record successful dispatch for rate limiter window
        await rateLimiterService.recordSend(emailRecord.sender);

        console.log(`✅ [Worker] Email sent to ${emailRecord.recipient}!`);
        if (result.previewUrl) {
          console.log(`🔗 [Ethereal Preview URL]: ${result.previewUrl}`);
        }

        return {
          status: 'SENT',
          messageId: result.messageId,
          previewUrl: result.previewUrl,
        };
      } catch (err: any) {
        console.error(`❌ [Worker Error] Failed to send email ${emailId}:`, err.message);

        const currentAttempts = emailRecord.attempts + 1;
        const isFinalFailure = currentAttempts >= emailRecord.maxAttempts;

        await prisma.emailJob.update({
          where: { id: emailId },
          data: {
            status: isFinalFailure ? 'FAILED' : 'QUEUED',
            errorMessage: err.message,
          },
        });

        throw err; // Allow BullMQ retry strategy
      }
    },
    {
      connection: redisConnection,
      concurrency: config.worker.concurrency, // Controlled concurrency
    }
  );

  worker.on('ready', () => {
    console.log(`👷 BullMQ Email Worker started with concurrency: ${config.worker.concurrency}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
