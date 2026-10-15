import { connectDB } from './config/db';
import { getTransporter } from './config/mailer';
import { createEmailWorker } from './workers/email.worker';
import { ReconciliationService } from './services/reconciliation.service';

async function bootstrapWorker() {
  console.log('🚀 [Worker Process] Starting standalone BullMQ Worker...');

  await connectDB();
  await getTransporter();

  // Run persistence reconciliation on boot
  await ReconciliationService.reconcile();

  // Start BullMQ worker
  const worker = createEmailWorker();

  const shutdown = async () => {
    console.log('\n🛑 [Worker Process] Gracefully shutting down worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrapWorker().catch((err) => {
  console.error('💥 Fatal worker startup error:', err);
  process.exit(1);
});
