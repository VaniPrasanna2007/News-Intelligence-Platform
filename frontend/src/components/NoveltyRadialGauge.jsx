import React from 'react';
import { Compass, AlertCircle, Info } from 'lucide-react';

export default function NoveltyRadialGauge({ novelty }) {
  const isAnalyzed = Boolean(novelty && typeof novelty.score === 'number');

  const score = isAnalyzed ? novelty.score : 0;
  const level = isAnalyzed ? novelty.level : 'Waiting for article';
  const label = isAnalyzed ? novelty.label : 'Calculated after analysis';
  const maxSim = isAnalyzed ? novelty.max_similarity_pct : null;

  // Gauge calculation: semi-circle from -90 deg to +90 deg
  const radius = 68;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // 180 degree arc
  const strokeDashoffset = isAnalyzed
    ? circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference
    : circumference; // 0% fill when not analyzed

  // Color gradient according to novelty score
  const getMeterColor = (val) => {
    if (!isAnalyzed) return '#27342F';
    if (val >= 75) return '#10B981'; // High Novelty (Emerald)
    if (val >= 45) return '#14B8A6'; // Moderate (Teal)
    return '#F59E0B'; // Low novelty / high similarity (Warm Amber)
  };

  const meterColor = getMeterColor(score);

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isAnalyzed ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-500'
            }`}>
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Novelty Meter</h3>
              <p className="text-[10px] text-slate-400 font-mono">Relative to 9,990 corpus</p>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            isAnalyzed
              ? 'bg-slate-800 text-slate-200 border-slate-700'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            {isAnalyzed ? `${score.toFixed(1)} / 100` : '— / 100'}
          </span>
        </div>

        {/* Semi-Circle Radial Gauge */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
            <svg width="176" height="100" viewBox="0 0 176 100" className="overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 90 A 68 68 0 0 1 156 90"
                fill="none"
                stroke="#27342F"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Foreground Meter Arc */}
              <path
                d="M 20 90 A 68 68 0 0 1 156 90"
                fill="none"
                stroke={meterColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Centered Score */}
            <div className="absolute bottom-0 text-center">
              <span className="text-3xl font-black font-mono text-white tracking-tight leading-none block">
                {isAnalyzed ? score.toFixed(0) : '—'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 block ${
                isAnalyzed ? 'text-brand-300' : 'text-slate-500'
              }`}>
                {level}
              </span>
            </div>
          </div>

          <div className="w-full text-center mt-3">
            <p className={`text-xs font-semibold ${isAnalyzed ? 'text-slate-200' : 'text-slate-400'}`}>
              {label}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {isAnalyzed
                ? `Maximum corpus resemblance: ${maxSim}%`
                : 'Corpus comparison executed upon article analysis'}
            </p>
          </div>
        </div>
      </div>

      {/* Methodology & Analytical Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-400 block mb-0.5">
            Novelty relative to available dataset
          </span>
          <span>
            This score represents how different the submitted article is from the available corpus according to the implemented similarity methodology. It does not indicate truth, falsity, or objectively new/breaking news.
          </span>
        </div>
      </div>
    </div>
  );
}
