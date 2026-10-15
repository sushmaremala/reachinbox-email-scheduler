import React from 'react';
import { clsx } from 'clsx';
import { EmailStatus } from '../../types/email';

export interface BadgeProps {
  status: EmailStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const normalized = status.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'SENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SCHEDULED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'QUEUED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'SENDING':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        getStyle(),
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {normalized}
    </span>
  );
};
