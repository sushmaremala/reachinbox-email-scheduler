import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/api';
import { Mail, Users, Upload, Clock, Sparkles } from 'lucide-react';

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [recipient, setRecipient] = useState('');
  const [batchRecipients, setBatchRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [timingOption, setTimingOption] = useState<'10s' | '30s' | '60s' | 'custom'>('10s');
  const [customDateTime, setCustomDateTime] = useState('');
  const [interEmailDelay, setInterEmailDelay] = useState<number>(3000);
  const [sender, setSender] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload parser for CSV / TXT
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Extract emails using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matched = text.match(emailRegex);
      if (matched && matched.length > 0) {
        const unique = Array.from(new Set(matched));
        setBatchRecipients(unique.join('\n'));
        showToast(`Parsed ${unique.length} email addresses from ${file.name}`, 'success');
      } else {
        showToast('No valid email addresses found in file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const getTargetDate = (): Date => {
    const now = Date.now();
    switch (timingOption) {
      case '10s':
        return new Date(now + 10 * 1000);
      case '30s':
        return new Date(now + 30 * 1000);
      case '60s':
        return new Date(now + 60 * 1000);
      case 'custom':
        return customDateTime ? new Date(customDateTime) : new Date(now + 10 * 1000);
      default:
        return new Date(now + 10 * 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      showToast('Please enter an email subject', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('Please enter an email body', 'error');
      return;
    }

    const scheduledDate = getTargetDate();
    if (isNaN(scheduledDate.getTime())) {
      showToast('Invalid schedule date or time', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'single') {
        if (!recipient.trim()) {
          showToast('Please enter a recipient email', 'error');
          setIsSubmitting(false);
          return;
        }

        await apiService.scheduleSingle({
          recipient: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
          sender: sender.trim() || undefined,
          scheduledAt: scheduledDate.toISOString(),
        });

        showToast(
          `Email scheduled for ${scheduledDate.toLocaleTimeString()}!`,
          'success'
        );
      } else {
        // Batch Mode
        const emailList = batchRecipients
          .split(/[\n,;]+/)
          .map((e) => e.trim())
          .filter((e) => e.length > 0 && e.includes('@'));

        if (emailList.length === 0) {
          showToast('Please provide at least one valid recipient email in batch list', 'error');
          setIsSubmitting(false);
          return;
        }

        const res = await apiService.scheduleBatch({
          recipients: emailList,
          subject: subject.trim(),
          body: body.trim(),
          sender: sender.trim() || undefined,
          scheduledStartTime: scheduledDate.toISOString(),
          delayBetweenEmailsMs: interEmailDelay,
        });

        showToast(
          `Campaign scheduled: ${res.totalScheduled} emails with ${interEmailDelay / 1000}s interval`,
          'success'
        );
      }

      onSuccess();
      onClose();
      // Reset form
      setRecipient('');
      setBatchRecipients('');
      setSubject('');
      setBody('');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to schedule email';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertTemplateTag = (tag: string) => {
    setBody((prev) => `${prev} {{${tag}}}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Outreach Campaign"
      description="Queue cold emails with delayed BullMQ jobs, sliding-window rate limiting, and Ethereal preview links."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector */}
        <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'single'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Single Recipient</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'batch'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Bulk Campaign / CSV</span>
          </button>
        </div>

        {/* Recipients input based on mode */}
        {mode === 'single' ? (
          <Input
            label="Recipient Email"
            type="email"
            placeholder="prospect@company.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Bulk Lead List (comma or newline separated)
              </label>
              <label className="cursor-pointer text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / TXT</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <Textarea
              placeholder="alex@acme.com&#10;sarah@startup.io&#10;david@enterprise.org"
              rows={3}
              value={batchRecipients}
              onChange={(e) => setBatchRecipients(e.target.value)}
              helperText="Tip: You can paste a list of emails directly or upload a CSV file."
            />
          </div>
        )}

        {/* Subject */}
        <Input
          label="Subject Line"
          placeholder="Quick question regarding your growth roadmap"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        {/* Email Body & Template Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Content (HTML or Plain Text)
            </label>
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Tags:
              </span>
              <button
                type="button"
                onClick={() => insertTemplateTag('name')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
              >
                {'{{name}}'}
              </button>
              <button
                type="button"
                onClick={() => insertTemplateTag('recipient')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]"
              >
                {'{{recipient}}'}
              </button>
            </div>
          </div>
          <Textarea
            placeholder="Hi {{name}},&#10;&#10;I noticed your recent progress and wanted to share how we can accelerate your outreach workflows..."
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        {/* Schedule Timing Options */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Delivery Schedule</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: '10s', label: 'In 10 sec (Demo)' },
              { id: '30s', label: 'In 30 sec' },
              { id: '60s', label: 'In 1 min' },
              { id: 'custom', label: 'Custom Date' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimingOption(opt.id as any)}
                className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                  timingOption === opt.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {timingOption === 'custom' && (
            <div className="pt-2">
              <Input
                label="Pick Future Delivery Timestamp"
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {/* For Batch Mode: Delay between emails */}
        {mode === 'batch' && (
          <div className="pt-2">
            <Select
              label="Stagger Delay Between Leads (Rate Limiting Friendly)"
              value={interEmailDelay}
              onChange={(e) => setInterEmailDelay(parseInt(e.target.value, 10))}
              options={[
                { label: '2 seconds (Standard)', value: 2000 },
                { label: '3 seconds (Recommended)', value: 3000 },
                { label: '5 seconds (High Protection)', value: 5000 },
                { label: '10 seconds (Throttled Demo)', value: 10000 },
              ]}
              helperText="Staggers email dispatch in BullMQ to protect sender reputation."
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
            Confirm & Schedule Email
          </Button>
        </div>
      </form>
    </Modal>
  );
};
