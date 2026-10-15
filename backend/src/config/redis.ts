import Redis from 'ioredis';
import { config } from './env';

const redisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 500, 3000);
    return delay;
  },
};

export const redisConnection = config.redis.url
  ? new Redis(config.redis.url, redisOptions)
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      ...redisOptions,
    });

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});
