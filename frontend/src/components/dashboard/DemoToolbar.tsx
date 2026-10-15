import React from 'react';
import { Plus, RefreshCw, Zap, Flame, Search } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DemoToolbarProps {
  onOpenCompose: () => void;
  onRefresh: () => void;
  onScheduleDemoBatch: () => void;
  onRateLimitSpike: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  isRefreshing: boolean;
  isDemoBatchLoading: boolean;
  isRateLimitLoading: boolean;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  onOpenCompose,
  onRefresh,
  onScheduleDemoBatch,
  onRateLimitSpike,
  searchTerm,
  onSearchChange,
  isRefreshing,
  isDemoBatchLoading,
  isRateLimitLoading,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by recipient, subject or sender..."
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1-Click Demo Batch for 5-minute video recording */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onScheduleDemoBatch}
          isLoading={isDemoBatchLoading}
          leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
          title="Schedule 3 test emails spaced 5s apart (ideal for recording demo video)"
          className="hover:border-amber-500/50"
        >
          Demo Batch (3 emails)
        </Button>

        {/* 1-Click Rate Limit Spike Test */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRateLimitSpike}
          isLoading={isRateLimitLoading}
          leftIcon={<Flame className="w-4 h-4 text-rose-400" />}
          title="Simulate rapid batch dispatch to observe worker throttling & rate limiting"
          className="hover:border-rose-500/50"
        >
          Spike Rate Limit Test
        </Button>

        {/* Manual Refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>

        {/* Compose Campaign */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCompose}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Schedule Email
        </Button>
      </div>
    </div>
  );
};
