import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { QueueJobPayload } from '../types';

export const QUEUE_NAME = 'emailDispatchQueue';

export const emailQueue = new Queue<QueueJobPayload>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export class EmailQueueService {
  /**
   * Adds an email job to BullMQ with calculated delay.
   * Uses idempotent jobId (`email_<id>`) to prevent duplicate runs.
   */
  static async addScheduledEmailJob(
    email: { id: string; scheduledAt: Date | string; recipient: string; subject: string; body: string; sender: string },
    overrideDelayMs?: number
  ) {
    const targetTime = new Date(email.scheduledAt).getTime();
    const delay = overrideDelayMs !== undefined ? overrideDelayMs : Math.max(0, targetTime - Date.now());

    const payload: QueueJobPayload = {
      emailId: email.id,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      sender: email.sender,
    };

    const jobId = `email_${email.id}`;

    // BullMQ with identical jobId will not add a duplicate active/delayed job
    const job = await emailQueue.add('sendEmail', payload, {
      jobId,
      delay,
    });

    return job;
  }

  /**
   * Removes or cancels a pending scheduled job from BullMQ.
   */
  static async removeScheduledJob(emailId: string): Promise<boolean> {
    const jobId = `email_${emailId}`;
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Checks if a job already exists in BullMQ (active, delayed, or waiting).
   */
  static async isJobPresent(emailId: string): Promise<boolean> {
    const jobId = `email_${emailId}`;
    const job = await emailQueue.getJob(jobId);
    return !!job;
  }
}
