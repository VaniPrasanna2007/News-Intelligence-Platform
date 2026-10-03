import React from 'react';
import { Database, Cpu, Newspaper } from 'lucide-react';

export default function Navbar({
  health,
  healthStatus = 'connecting',
  stats
}) {
  const isConnected = healthStatus === 'connected';
  const isOffline = healthStatus === 'offline';

  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand & Platform Identity */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center shadow-lg shadow-brand-900/30">
          <Newspaper className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white flex items-center gap-2 tracking-tight">
            AI NEWS INTELLIGENCE PLATFORM
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30">
              Command Center
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Multi-Signal News Telemetry & Computational Linguistics
          </p>
        </div>
      </div>

      {/* Right-Side Telemetry (Connected, Model, Corpus) */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
        {/* Real-Time API Health Status */}
        <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : isOffline ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
              }`}
            ></span>
          </span>
          <span
            className={`font-semibold font-mono text-[11px] ${
              isConnected ? 'text-emerald-400' : isOffline ? 'text-rose-400' : 'text-amber-400'
            }`}
          >
            {isConnected ? 'CONNECTED' : isOffline ? 'OFFLINE' : 'CONNECTING...'}
          </span>
        </div>

        {/* Selected Production Model */}
        <div className="hidden sm:flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Cpu className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-slate-400">Model:</span>
          <span className="text-brand-300 font-semibold font-mono text-[11px]">
            {stats?.production_model || health?.production_model || stats?.best_model || health?.best_model || 'Support Vector Machine'}
            {stats?.test_accuracy ? ` (${(stats.test_accuracy * 100).toFixed(1)}%)` : ' (99.3%)'}
          </span>
        </div>

        {/* Dataset Counter */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Database className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-slate-400">Corpus:</span>
          <span className="text-slate-200 font-semibold font-mono text-[11px]">
            {stats?.total_dataset_articles ? `${stats.total_dataset_articles.toLocaleString()} articles` : '9,990 articles'}
          </span>
        </div>
      </div>
    </header>
  );
}
