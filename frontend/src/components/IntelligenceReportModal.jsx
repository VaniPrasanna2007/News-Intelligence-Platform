import React, { useState } from 'react';
import { FileText, X, ShieldCheck } from 'lucide-react';
import ExportReportMenu from './ExportReportMenu';
import { extractReportContent, generatePlainText } from '../utils/exportReport';

export default function IntelligenceReportModal({ reportData, onClose }) {
  if (!reportData) return null;

  const reportContent = extractReportContent('command_center', reportData);
  const plainTextReport = generatePlainText(reportContent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Comprehensive News Intelligence Report
              </h3>
              <p className="text-xs text-slate-400 font-mono">Academic & analytical explainability record</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Primary & Secondary Export Controls */}
            <ExportReportMenu
              moduleType="command_center"
              data={reportData}
              variant="dual"
              includeJson={true}
              customFilename={`news_intelligence_report_${Date.now()}`}
            />

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Structured Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-300 font-mono">
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap font-mono">
            {plainTextReport}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero synthetic metrics. All values computed live from model & 9,990 corpus.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
