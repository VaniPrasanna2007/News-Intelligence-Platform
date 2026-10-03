import React from 'react';
import { GitCompare, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function ClaimComparisonPanel({ claims }) {
  if (!claims || claims.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 text-xs">
        <GitCompare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <span>No matching claims available for cross-article comparison. Analyze a story with related corpus matches to compare statements.</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cross-Article Claim Comparison</h3>
            <p className="text-[10px] text-slate-400 font-mono">Neutral comparative statement alignment</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {claims.length} Comparisons
        </span>
      </div>

      <div className="space-y-3">
        {claims.map((c, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-400">Statement Pair #{idx + 1}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700">
                {c.neutral_verdict}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block mb-1">
                  {c.article_a}
                </span>
                <p className="text-slate-200 leading-relaxed text-[11px] italic">"{c.statement_a}"</p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  {c.article_b}
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px] italic">"{c.statement_b}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 text-[10px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Analytical Objective:</strong> This tool highlights semantic differences and wording variations between related articles. It does not issue fact-checking or misinformation verdicts.
        </span>
      </div>
    </div>
  );
}
