import React from 'react';
import { AlignLeft, BarChart2, BookOpen, Layers, Type, CheckCircle } from 'lucide-react';

export default function ArticleStructureCard({ structure, alignment }) {
  if (!structure) {
    const emptyMetrics = [
      { label: 'Length Profile', value: '—', icon: BookOpen, color: 'text-slate-500' },
      { label: 'Word Count', value: '—', icon: Type, color: 'text-slate-500' },
      { label: 'Sentence Count', value: '—', icon: AlignLeft, color: 'text-slate-500' },
      { label: 'Headline Length', value: '—', icon: Type, color: 'text-slate-500' },
      { label: 'Paragraphs', value: '—', icon: Layers, color: 'text-slate-500' },
      { label: 'Vocab Diversity', value: '—', icon: BarChart2, color: 'text-slate-500' },
    ];

    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center">
              <AlignLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Article Structure Analyzer</h3>
              <p className="text-[10px] text-slate-400 font-mono">Structural & linguistic properties</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950 text-slate-500">
            Waiting for article
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {emptyMetrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">{m.label}</span>
                <span className={`text-base font-bold font-mono ${m.color} block mt-0.5`}>{m.value}</span>
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-500">
          Headline–body semantic consistency and vocabulary diversity (TTR) are computed once the article is analyzed.
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Length Profile', value: structure.length_profile || 'Standard Report', icon: BookOpen, color: 'text-brand-400' },
    { label: 'Word Count', value: structure.word_count ? structure.word_count.toLocaleString() : 'N/A', icon: Type, color: 'text-slate-200' },
    { label: 'Sentence Count', value: structure.sentence_count || '1', icon: AlignLeft, color: 'text-slate-200' },
    { label: 'Headline Length', value: structure.headline_length ? `${structure.headline_length} words` : (structure.headline_chars ? `${structure.headline_chars} chars` : '0 words'), icon: Type, color: 'text-brand-300' },
    { label: 'Paragraphs', value: structure.paragraph_count || '1', icon: Layers, color: 'text-slate-200' },
    { label: 'Vocab Diversity', value: structure.vocabulary_diversity ? `${(structure.vocabulary_diversity * 100).toFixed(1)}%` : 'N/A', icon: BarChart2, color: 'text-purple-400' },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <AlignLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Article Structure Analyzer</h3>
            <p className="text-[10px] text-slate-400 font-mono">Structural & linguistic properties</p>
          </div>
        </div>
      </div>

      {/* Grid of Structural Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">{m.label}</span>
              <span className={`text-base font-bold font-mono ${m.color} block mt-0.5`}>{m.value}</span>
            </div>
          );
        })}
      </div>

      {/* Feature 8: Headline vs Article Consistency */}
      {alignment && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Headline–Body Semantic Alignment
            </span>
            <span className="text-xs font-mono font-bold text-brand-400">
              {alignment.alignment_percentage}%
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(alignment.alignment_percentage, 5)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            {alignment.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
