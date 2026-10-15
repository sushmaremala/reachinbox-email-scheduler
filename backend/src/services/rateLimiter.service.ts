import { redisConnection } from '../config/redis';
import { config } from '../config/env';
import { RateLimitCheckResult } from '../types';

export class RateLimiterService {
  private hourlyLimit: number;
  private minDelayMs: number;

  constructor() {
    this.hourlyLimit = config.worker.maxEmailsPerHour;
    this.minDelayMs = config.worker.minDelayBetweenEmailsMs;
  }

  private getWindowKey(sender: string): string {
    return `ratelimit:sender:${sender.toLowerCase().trim()}:window`;
  }

  private getLastSentKey(sender: string): string {
    return `ratelimit:sender:${sender.toLowerCase().trim()}:last_sent`;
  }

  /**
   * Checks whether an email can be sent immediately by this sender.
   * If rate limited, returns the precise wait time in milliseconds.
   */
  async checkRateLimit(sender: string): Promise<RateLimitCheckResult> {
    const windowKey = this.getWindowKey(sender);
    const lastSentKey = this.getLastSentKey(sender);
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;

    // Pipeline: clean up old timestamps, count current window, get last sent timestamp
    const pipeline = redisConnection.pipeline();
    pipeline.zremrangebyscore(windowKey, 0, oneHourAgo);
    pipeline.zcard(windowKey);
    pipeline.get(lastSentKey);
    pipeline.zrange(windowKey, 0, 0, 'WITHSCORES'); // Oldest entry in window

    const results = await pipeline.exec();
    if (!results) {
      return { allowed: true, waitMs: 0, currentUsage: 0, limit: this.hourlyLimit };
    }

    const currentUsage = (results[1][1] as number) || 0;
    const lastSentStr = results[2][1] as string | null;
    const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0;
    const oldestEntries = results[3][1] as string[] | null;

    // 1. Check Hourly Limit
    if (currentUsage >= this.hourlyLimit) {
      let oldestTimestamp = now - 3600 * 1000;
      if (oldestEntries && oldestEntries.length >= 2) {
        oldestTimestamp = parseInt(oldestEntries[1], 10);
      }
      const waitMs = Math.max(1000, oldestTimestamp + 3600 * 1000 - now);
      return {
        allowed: false,
        waitMs,
        reason: 'HOURLY_LIMIT_REACHED',
        currentUsage,
        limit: this.hourlyLimit,
      };
    }

    // 2. Check Inter-Email Delay
    const elapsedSinceLastSend = now - lastSent;
    if (lastSent > 0 && elapsedSinceLastSend < this.minDelayMs) {
      const waitMs = this.minDelayMs - elapsedSinceLastSend;
      return {
        allowed: false,
        waitMs,
        reason: 'DELAY_BETWEEN_EMAILS',
        currentUsage,
        limit: this.hourlyLimit,
      };
    }

    return {
      allowed: true,
      waitMs: 0,
      currentUsage,
      limit: this.hourlyLimit,
    };
  }

  /**
   * Records a successful email dispatch in Redis to update window and last sent counters.
   */
  async recordSend(sender: string): Promise<void> {
    const windowKey = this.getWindowKey(sender);
    const lastSentKey = this.getLastSentKey(sender);
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;

    const pipeline = redisConnection.pipeline();
    pipeline.zremrangebyscore(windowKey, 0, oneHourAgo);
    pipeline.zadd(windowKey, now, `${now}-${Math.random().toString(36).substring(2, 7)}`);
    pipeline.expire(windowKey, 3600 * 2); // Expire after 2 hours
    pipeline.set(lastSentKey, now.toString(), 'EX', 3600 * 2);
    await pipeline.exec();
  }

  /**
   * Retrieves hourly metrics for a sender (for dashboard display).
   */
  async getSenderHourlyStats(sender: string): Promise<{ currentHourSent: number; hourlyLimit: number; remaining: number }> {
    const windowKey = this.getWindowKey(sender);
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;

    const pipeline = redisConnection.pipeline();
    pipeline.zremrangebyscore(windowKey, 0, oneHourAgo);
    pipeline.zcard(windowKey);
    const results = await pipeline.exec();

    const currentHourSent = results ? ((results[1][1] as number) || 0) : 0;
    const remaining = Math.max(0, this.hourlyLimit - currentHourSent);

    return {
      currentHourSent,
      hourlyLimit: this.hourlyLimit,
      remaining,
    };
  }
}

export const rateLimiterService = new RateLimiterService();
