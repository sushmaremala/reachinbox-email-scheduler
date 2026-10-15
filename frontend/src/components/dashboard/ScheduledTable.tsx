import React, { useEffect, useState } from 'react';
import { Clock, Trash2, Mail } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { EmailJob } from '../../types/email';

export interface ScheduledTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  onCancel: (id: string) => Promise<void>;
  onOpenCompose: () => void;
  cancellingId: string | null;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  isLoading,
  onCancel,
  onOpenCompose,
  cancellingId,
}) => {
  // Live ticker to update countdown every second
  const [, setTicker] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (scheduledAt: string) => {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (diff <= 0) return 'Executing now...';

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `in ${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    if (minutes < 60) return `in ${minutes}m ${remSeconds}s`;

    const hours = Math.floor(minutes / 60);
    return `in ${hours}h ${minutes % 60}m`;
  };

  if (isLoading && emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400 mt-4">Loading scheduled emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="w-7 h-7" />}
        title="No scheduled emails in queue"
        description="Schedule single emails or upload lead lists to start automated delivery."
        action={
          <Button variant="primary" size="sm" onClick={onOpenCompose}>
            Compose New Email
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="px-5 py-3.5">Recipient</th>
            <th className="px-5 py-3.5">Subject & Preview</th>
            <th className="px-5 py-3.5">Scheduled For</th>
            <th className="px-5 py-3.5">Countdown</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
              {/* Recipient */}
              <td className="px-5 py-4 font-medium text-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                    {email.recipient.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold block">{email.recipient}</span>
                    <span className="text-[11px] text-slate-400">From: {email.sender}</span>
                  </div>
                </div>
              </td>

              {/* Subject & Body snippet */}
              <td className="px-5 py-4 max-w-xs">
                <span className="font-semibold text-slate-200 block truncate">{email.subject}</span>
                <span className="text-xs text-slate-400 block truncate mt-0.5">
                  {email.body.replace(/<[^>]+>/g, '')}
                </span>
              </td>

              {/* Scheduled Time */}
              <td className="px-5 py-4 text-xs text-slate-300 whitespace-nowrap">
                <div className="font-medium">{new Date(email.scheduledAt).toLocaleTimeString()}</div>
                <div className="text-[11px] text-slate-400">
                  {new Date(email.scheduledAt).toLocaleDateString()}
                </div>
              </td>

              {/* Live Countdown */}
              <td className="px-5 py-4 whitespace-nowrap">
                <span className="inline-flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {formatCountdown(email.scheduledAt)}
                </span>
              </td>

              {/* Status */}
              <td className="px-5 py-4 whitespace-nowrap">
                <Badge status={email.status} />
              </td>

              {/* Action */}
              <td className="px-5 py-4 text-right whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(email.id)}
                  isLoading={cancellingId === email.id}
                  className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  title="Cancel scheduled delivery"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
