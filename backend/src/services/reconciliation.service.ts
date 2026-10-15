import { prisma } from '../config/db';
import { EmailQueueService } from '../queues/email.queue';

export class ReconciliationService {
  /**
   * Reconciles scheduled emails between the persistent Database (Single Source of Truth)
   * and Redis/BullMQ delayed job queue upon server/worker startup.
   */
  static async reconcile(): Promise<{ totalChecked: number; reQueued: number }> {
    console.log('🔄 [Reconciliation] Running persistence recovery check on startup...');

    // 1. Fetch all pending/scheduled emails from the persistent DB
    const pendingEmails = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'QUEUED'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    let reQueuedCount = 0;

    for (const email of pendingEmails) {
      const jobExists = await EmailQueueService.isJobPresent(email.id);

      if (!jobExists) {
        const remainingDelay = Math.max(0, new Date(email.scheduledAt).getTime() - Date.now());

        console.log(
          `⚡ [Reconciliation] Restoring missing job for email: ${email.id} (Scheduled at: ${new Date(
            email.scheduledAt
          ).toISOString()}, Remaining delay: ${Math.round(remainingDelay / 1000)}s)`
        );

        await EmailQueueService.addScheduledEmailJob(email, remainingDelay);
        reQueuedCount++;
      }
    }

    // 2. Recover any emails stuck in 'SENDING' due to an ungraceful server crash during dispatch
    const stuckSendingEmails = await prisma.emailJob.findMany({
      where: {
        status: 'SENDING',
        updatedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // Stuck for > 5 minutes
        },
      },
    });

    for (const stuck of stuckSendingEmails) {
      console.warn(`⚠️ [Reconciliation] Recovering crash-interrupted job: ${stuck.id}. Re-queueing.`);
      await prisma.emailJob.update({
        where: { id: stuck.id },
        data: { status: 'QUEUED' },
      });
      await EmailQueueService.addScheduledEmailJob(stuck, 0);
      reQueuedCount++;
    }

    console.log(
      `✅ [Reconciliation] Complete. Verified ${pendingEmails.length} pending emails (${reQueuedCount} restored into queue).`
    );

    return {
      totalChecked: pendingEmails.length,
      reQueued: reQueuedCount,
    };
  }
}
