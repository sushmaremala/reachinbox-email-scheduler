import React, { useEffect, useState } from 'react';
import { Mail, LogOut, ExternalLink, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { EtherealAccountInfo } from '../../types/email';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [ethereal, setEthereal] = useState<EtherealAccountInfo | null>(null);

  useEffect(() => {
    apiService.getEtherealInfo().then((info) => {
      if (info) setEthereal(info);
    });
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">ReachInbox</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Email Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-400">BullMQ • Redis • Distributed Outreach Engine</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Ethereal Inbox Link */}
          {ethereal && (
            <a
              href="https://ethereal.email/messages"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/40 px-3 py-1.5 rounded-lg transition-colors"
              title="Open Ethereal Test Mailbox"
            >
              <span>Ethereal Mailbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Engine Status */}
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Worker Active</span>
          </div>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-400">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
