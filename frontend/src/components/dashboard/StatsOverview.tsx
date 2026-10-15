import React from 'react';
import { Clock, Send, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { DashboardStats } from '../../types/email';

export interface StatsOverviewProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, isLoading }) => {
  const hourlyUsagePercent =
    stats && stats.rateLimit.hourlyLimit > 0
      ? Math.min(100, Math.round((stats.rateLimit.currentHourSent / stats.rateLimit.hourlyLimit) * 100))
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Scheduled Emails */}
      <Card className="relative overflow-hidden group hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled Queue</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {isLoading ? '...' : stats?.totalScheduled ?? 0}
            </h3>
            <p className="text-xs text-amber-400/90 mt-1 flex items-center gap-1">
              <span>Delayed BullMQ Jobs</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* 2. Sent Emails */}
      <Card className="relative overflow-hidden group hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sent Deliveries</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {isLoading ? '...' : stats?.totalSent ?? 0}
            </h3>
            <p className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1">
              <span>Delivered via Ethereal</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <Send className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* 3. Failed / Cancelled */}
      <Card className="relative overflow-hidden group hover:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Failed / Cancelled</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {isLoading ? '...' : (stats?.totalFailed ?? 0) + (stats?.totalCancelled ?? 0)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {stats?.totalFailed ?? 0} failed • {stats?.totalCancelled ?? 0} cancelled
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {/* 4. Rate Limiting Status */}
      <Card className="relative overflow-hidden group hover:border-blue-500/40">
        <div className="flex items-center justify-between">
          <div className="w-full pr-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hourly Quota</p>
              <span className="text-xs font-bold text-blue-400">
                {stats?.rateLimit.currentHourSent ?? 0} / {stats?.rateLimit.hourlyLimit ?? 60}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${hourlyUsagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
              <span>Delay: {((stats?.rateLimit.minDelayMs ?? 2000) / 1000).toFixed(1)}s / email</span>
              <span className="text-slate-400">Sliding Window</span>
            </p>
          </div>
          <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </Card>
    </div>
  );
};
