import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { StatsOverview } from './components/dashboard/StatsOverview';
import { DemoToolbar } from './components/dashboard/DemoToolbar';
import { ScheduledTable } from './components/dashboard/ScheduledTable';
import { SentTable } from './components/dashboard/SentTable';
import { ComposeModal } from './components/compose/ComposeModal';
import { Tabs } from './components/ui/Tabs';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth, AuthProvider } from './context/AuthContext';
import { useToast, ToastProvider } from './context/ToastContext';
import { apiService } from './services/api';
import { EmailJob, DashboardStats } from './types/email';
import { Clock, Send } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isEmailsLoading, setIsEmailsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [isDemoBatchLoading, setIsDemoBatchLoading] = useState(false);
  const [isRateLimitLoading, setIsRateLimitLoading] = useState(false);

  // Fetch all dashboard data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const [statsData, scheduledRes, sentRes] = await Promise.all([
        apiService.getStats(),
        apiService.getScheduled(1, 100, searchTerm),
        apiService.getSent(1, 100, searchTerm),
      ]);

      setStats(statsData);
      setScheduledEmails(scheduledRes.items);
      setSentEmails(sentRes.items);
    } catch (err: any) {
      if (!quiet) {
        showToast(err.message || 'Error fetching email queue status', 'error');
      }
    } finally {
      setIsStatsLoading(false);
      setIsEmailsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, showToast]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Live polling every 3 seconds to smoothly reflect BullMQ background worker state transitions
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadData]);

  // Cancel scheduled email
  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await apiService.cancelEmail(id);
      showToast('Scheduled email cancelled successfully', 'info');
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel email', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // 1-Click Demo Batch (3 test emails spaced 5 seconds apart - perfect for video demo)
  const handleScheduleDemoBatch = async () => {
    setIsDemoBatchLoading(true);
    try {
      const now = Date.now();
      const recipients = [
        'candidate.demo1@reachinbox-test.com',
        'evaluator.mitrajit@reachinbox-test.com',
        'evaluator.yadav036@reachinbox-test.com',
      ];

      await apiService.scheduleBatch({
        recipients,
        subject: 'Demo Outreach: High Concurrency Queue Test',
        body: 'Hello {{name}},\n\nThis is a verified test email sent via BullMQ delayed scheduling and Ethereal SMTP.',
        scheduledStartTime: new Date(now + 5000).toISOString(),
        delayBetweenEmailsMs: 5000, // 5 seconds between each
      });

      showToast('⚡ Demo Batch created! 3 emails scheduled (in 5s, 10s, 15s)', 'success');
      setActiveTab('scheduled');
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule demo batch', 'error');
    } finally {
      setIsDemoBatchLoading(false);
    }
  };

  // 1-Click Rate Limit Spike Test
  const handleRateLimitSpike = async () => {
    setIsRateLimitLoading(true);
    try {
      const now = Date.now();
      const spikeRecipients = Array.from({ length: 6 }, (_, i) => `rate-spike-${i + 1}@loadtest.com`);

      await apiService.scheduleBatch({
        recipients: spikeRecipients,
        subject: 'Load Spike: Demonstrating Sliding Window Rate Limiting',
        body: 'Testing worker backpressure and inter-email delay throttling.',
        scheduledStartTime: new Date(now + 2000).toISOString(),
        delayBetweenEmailsMs: 1000,
      });

      showToast('🔥 Rate Limit Spike test queued! Notice throttling in worker logs.', 'warning');
      setActiveTab('scheduled');
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to run rate limit spike', 'error');
    } finally {
      setIsRateLimitLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Metric Cards */}
        <StatsOverview stats={stats} isLoading={isStatsLoading} />

        {/* Toolbar & Filter */}
        <DemoToolbar
          onOpenCompose={() => setIsComposeOpen(true)}
          onRefresh={() => loadData(false)}
          onScheduleDemoBatch={handleScheduleDemoBatch}
          onRateLimitSpike={handleRateLimitSpike}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isRefreshing={isRefreshing}
          isDemoBatchLoading={isDemoBatchLoading}
          isRateLimitLoading={isRateLimitLoading}
        />

        {/* Tabs for Scheduled vs Sent */}
        <div className="space-y-4">
          <Tabs
            tabs={[
              {
                id: 'scheduled',
                label: 'Scheduled Queue',
                count: stats?.totalScheduled ?? scheduledEmails.length,
                icon: <Clock className="w-4 h-4" />,
              },
              {
                id: 'sent',
                label: 'Delivered (Sent)',
                count: stats?.totalSent ?? sentEmails.length,
                icon: <Send className="w-4 h-4" />,
              },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />

          {/* Table Content */}
          {activeTab === 'scheduled' ? (
            <ScheduledTable
              emails={scheduledEmails}
              isLoading={isEmailsLoading}
              onCancel={handleCancel}
              onOpenCompose={() => setIsComposeOpen(true)}
              cancellingId={cancellingId}
            />
          ) : (
            <SentTable
              emails={sentEmails}
              isLoading={isEmailsLoading}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardContent />
      </ToastProvider>
    </AuthProvider>
  );
}
