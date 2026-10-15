export type EmailStatus = 'SCHEDULED' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledAt: string;
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: PaginationMeta;
  error?: string;
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

export interface ScheduleSinglePayload {
  recipient: string;
  subject: string;
  body: string;
  sender?: string;
  scheduledAt: string;
}

export interface ScheduleBatchPayload {
  recipients: string[];
  subject: string;
  body: string;
  sender?: string;
  scheduledStartTime: string;
  delayBetweenEmailsMs?: number;
}

export interface EtherealAccountInfo {
  user: string;
  pass: string;
  webUrl?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}
