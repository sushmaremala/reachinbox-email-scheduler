import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to SQLite / Prisma Database');
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
    process.exit(1);
  }
}
