import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Terminal,
  LayoutDashboard
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef(null);

  const navItems = [
    { id: 'command_center', label: 'Command Center', icon: Terminal, badge: 'Core', highlight: true },
    { id: 'overview', label: 'Live Overview', icon: LayoutDashboard }
  ];

  // Handle click outside to close temporary drawer
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key to close temporary drawer
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* 0. Spacer in the flex flow to preserve exact layout and prevent any content shifting */}
      <div className="w-14 shrink-0 select-none pointer-events-none" aria-hidden="true" />

      {/* 1. Viewport-Fixed 3-Line Menu Icon (Does NOT scroll with page) */}
      <aside className="fixed top-16 bottom-0 left-0 w-14 bg-slate-950/80 backdrop-blur-sm border-r border-slate-800/80 flex flex-col items-center py-4 z-30 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all shadow-md group cursor-pointer"
          title="Open Workstations (☰)"
          aria-label="Open Workstations menu"
        >
          <Menu className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
        </button>
      </aside>

      {/* 2. Backdrop Overlay when Drawer is Open (Click outside to close) */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      {/* 3. Temporary Workstations Slide-Out Drawer (Fixed to Viewport) */}
      <div
        ref={drawerRef}
        className={`fixed top-16 bottom-0 left-0 w-64 bg-slate-950 border-r border-slate-800/90 flex flex-col justify-between py-5 z-50 shadow-2xl shadow-black/80 select-none transition-transform duration-200 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="space-y-6">
          {/* Header with Title and Close Button */}
          <div className="px-5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Workstations</p>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              title="Close menu (Esc)"
              aria-label="Close Workstations menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Module Navigation List */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg shadow-brand-900/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-brand-700/80 text-brand-100' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer System Status Box */}
        <div className="px-4">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 text-[11px]">System Status</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Verified</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              Corpus: 9,990 clean records
              <br />
              Models: Logistic Regression, SVM, NB
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
