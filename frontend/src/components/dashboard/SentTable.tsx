import React from 'react';
import { Send, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { EmailJob } from '../../types/email';

export interface SentTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  onOpenCompose: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, isLoading, onOpenCompose }) => {
  if (isLoading && emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400 mt-4">Loading sent emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={<Send className="w-7 h-7" />}
        title="No emails sent yet"
        description="Emails dispatched by the BullMQ worker will appear here with live Ethereal inbox preview links."
        action={
          <Button variant="primary" size="sm" onClick={onOpenCompose}>
            Schedule an Email
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
            <th className="px-5 py-3.5">Delivered At</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-right">Ethereal Sandbox</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
              {/* Recipient */}
              <td className="px-5 py-4 font-medium text-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block">{email.recipient}</span>
                    <span className="text-[11px] text-slate-400">Sender: {email.sender}</span>
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

              {/* Delivered Time */}
              <td className="px-5 py-4 text-xs text-slate-300 whitespace-nowrap">
                {email.sentAt ? (
                  <>
                    <div className="font-medium">{new Date(email.sentAt).toLocaleTimeString()}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(email.sentAt).toLocaleDateString()}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400">Just now</span>
                )}
              </td>

              {/* Status */}
              <td className="px-5 py-4 whitespace-nowrap">
                <Badge status={email.status} />
              </td>

              {/* Ethereal Preview URL Action */}
              <td className="px-5 py-4 text-right whitespace-nowrap">
                {email.etherealPreviewUrl ? (
                  <a
                    href={email.etherealPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>View Email</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Preview unavailable</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
