import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, Tag, ExternalLink, CheckCircle } from 'lucide-react';
import { CATEGORY_COLORS, getCategoryStyle } from '../utils/categoryColors';

export default function CategoryConstellation({ constellationData, predictedCategory = null }) {
  const [selectedCat, setSelectedCat] = useState('Technology');

  // Automatically sync with predictedCategory when an analysis occurs
  useEffect(() => {
    if (predictedCategory) {
      setSelectedCat(predictedCategory);
    }
  }, [predictedCategory]);

  const categories = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];
  const activeData = constellationData?.[selectedCat] || {
    name: selectedCat,
    count: 2000,
    keywords: ['ai', 'chip', 'model', 'software', 'compute', 'data', 'cloud', 'system']
  };

  const activeStyle = getCategoryStyle(selectedCat);
  const keywords = activeData.keywords || [];

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Corpus Category Landscape</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                Dataset Reference
              </span>
            </div>
            <p className="text-xs text-slate-400">Dataset-level topological distribution across 9,990 clean articles</p>
          </div>
        </div>

        {/* 5 Primary Domain Nodes */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {categories.map((c) => {
            const isSelected = selectedCat === c;
            const isPredicted = predictedCategory && predictedCategory.toLowerCase() === c.toLowerCase();
            const style = getCategoryStyle(c);
            return (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 relative ${
                  isSelected
                    ? `${style.bg} ${style.text} border ${style.border} shadow-md ring-1 ring-white/20`
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                <span>{c}</span>
                {isPredicted && (
                  <span className="text-[9px] px-1 rounded bg-brand-500 text-white font-mono uppercase ml-1">
                    Predicted
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Constellation Visualizer */}
      <div className="relative w-full h-[280px] bg-slate-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-center overflow-hidden">
        <svg width="560" height="280" className="overflow-visible select-none max-w-full">
          <defs>
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={activeStyle.hex} stopOpacity="0.35" />
              <stop offset="100%" stopColor={activeStyle.hex} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Domain Node */}
          <circle cx="280" cy="140" r="55" fill="url(#starGlow)" />
          <circle cx="280" cy="140" r="28" fill={activeStyle.hex} stroke="#151C19" strokeWidth="3" />
          <text
            x="280"
            y="144"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {selectedCat}
          </text>

          {/* Orbiting Keyword Satellites */}
          {keywords.slice(0, 10).map((kw, i) => {
            const angle = (i / Math.min(10, keywords.length)) * 2 * Math.PI;
            const r = 100 + (i % 2 === 0 ? 15 : -10);
            const x = 280 + r * Math.cos(angle);
            const y = 140 + r * Math.sin(angle);

            return (
              <g key={kw} className="transition-all duration-300">
                {/* Orbital Line */}
                <line
                  x1="280"
                  y1="140"
                  x2={x}
                  y2={y}
                  stroke={activeStyle.hex}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity="0.4"
                />

                {/* Satellite Node */}
                <circle
                  cx={x}
                  cy={y}
                  r="7"
                  fill="#151C19"
                  stroke={activeStyle.hex}
                  strokeWidth="2"
                />

                {/* Keyword Label */}
                <text
                  x={x}
                  y={y + (y > 140 ? 16 : -10)}
                  textAnchor="middle"
                  fill="#A7B5AE"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {kw}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Orbit Metadata Badge */}
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-500">
          Domain Volume: {activeData.count?.toLocaleString() || '2,000'} articles (Balanced 20%)
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
        <span>* Precomputed topological landscape of the 9,990 reference corpus. Operates independently of user article input.</span>
        {predictedCategory && (
          <span className="text-emerald-400 font-semibold">
            Active prediction highlighted: {predictedCategory}
          </span>
        )}
      </div>
    </div>
  );
}
