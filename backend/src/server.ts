import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { connectDB } from './config/db';
import { getTransporter } from './config/mailer';
import { ReconciliationService } from './services/reconciliation.service';
import { createEmailWorker } from './workers/email.worker';
import emailRoutes from './routes/email.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';

async function bootstrap() {
  const app = express();

  // Middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ReachInbox Distributed Email Scheduler',
    });
  });

  // API Routes
  app.use('/api/emails', emailRoutes);
  app.use('/api/auth', authRoutes);

  // Global Error Handler
  app.use(errorHandler);

  // Database Connection
  await connectDB();

  // Auto-provision or verify Ethereal SMTP account
  await getTransporter();

  // Persistence on Restart: run reconciliation
  await ReconciliationService.reconcile();

  // Optional: Run BullMQ worker alongside API server if not split into separate processes
  if (process.env.SEPARATE_WORKER !== 'true') {
    console.log('👷 [Integrated Mode] Launching background worker inside server process...');
    createEmailWorker();
  }

  // Start Express HTTP Server
  const server = app.listen(config.port, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 ReachInbox Email Scheduler API Server running!`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`🩺 Health: http://localhost:${config.port}/health`);
    console.log(`⚡ Mode: ${config.nodeEnv}`);
    console.log(`=================================================\n`);
  });

  const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

bootstrap().catch((err) => {
  console.error('💥 Fatal server bootstrap error:', err);
  process.exit(1);
});
