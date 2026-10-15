export type EmailStatus = 'SCHEDULED' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EmailJobData {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string; // ISO string
  sentAt?: string | null;
  status: EmailStatus;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string | null;
  etherealPreviewUrl?: string | null;
  etherealMessageId?: string | null;
  batchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSingleEmailDto {
  recipient: string;
  subject: string;
  body: string;
  sender?: string;
  scheduledAt: string; // ISO Date string or timestamp
}

export interface ScheduleBatchEmailDto {
  recipients: string[]; // List of recipient emails
  subject: string;
  body: string;
  sender?: string;
  scheduledStartTime: string; // ISO Date string
  delayBetweenEmailsMs?: number; // Optional delay per email in milliseconds
}

export interface QueueJobPayload {
  emailId: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  waitMs: number;
  reason?: 'HOURLY_LIMIT_REACHED' | 'DELAY_BETWEEN_EMAILS';
  currentUsage: number;
  limit: number;
}

export interface DashboardStats {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalCancelled: number;
  rateLimit: {
    hourlyLimit: number;
    currentHourSent: number;
    minDelayMs: number;
  };
}
