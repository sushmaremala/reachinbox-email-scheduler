import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('Welcome to ReachInbox Scheduler!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await login('evaluator@reachinbox.ai', 'demo12345');
      showToast('Logged in as Evaluator (Mitrajit & Yadav036)', 'success');
    } catch (err: any) {
      showToast('Demo login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center shadow-xl shadow-blue-500/20 text-white mb-4">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">ReachInbox Scheduler</h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Distributed Cold Email Automation & Queue Service
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-6">
          {/* Quick Demo Login Option for evaluators */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 text-center">
            <p className="text-xs font-semibold text-blue-300 mb-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>For Assignment Evaluators</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              One-click instant login into the full outreach scheduling console.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDemoLogin}
              isLoading={isLoading}
              className="w-full shadow-lg shadow-blue-600/30"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              One-Click Evaluator Login
            </Button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-xs uppercase font-bold text-slate-500 tracking-wider">
              Or Sign In
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Form */}
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              variant="secondary"
              size="md"
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Built with Express, BullMQ, Redis, Prisma, SQLite/PostgreSQL & Ethereal SMTP.
        </p>
      </div>
    </div>
  );
};
