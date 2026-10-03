import React, { useState } from 'react';
import { Fingerprint, Info, ShieldCheck, Zap } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryColors';

export default function NewsDNAVisualizer({ dna }) {
  const [hoveredDim, setHoveredDim] = useState(null);

  if (!dna || !dna.dna_fingerprint) {
    const emptyDimensions = [
      "Category Confidence",
      "Novelty Index",
      "Vocabulary Diversity",
      "Entity Salience",
      "Terminology Density",
      "Headline Alignment"
    ];

    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4 h-full flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">News DNA Fingerprint</h3>
                <p className="text-[10px] text-slate-400 font-mono">Multi-signal analytical profile</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950 text-slate-500">
              Not available
            </span>
          </div>

          {/* Blueprint Radar Framework */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          <div className="relative w-[260px] h-[260px] flex items-center justify-center">
            <svg width="260" height="260" className="overflow-visible opacity-30">
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => (
                <circle
                  key={idx}
                  cx="130"
                  cy="130"
                  r={95 * ratio}
                  fill="none"
                  stroke="#27342F"
                  strokeWidth="1"
                  strokeDasharray={idx < 3 ? "3 3" : "none"}
                />
              ))}
              {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                const angle = (deg * Math.PI) / 180 - Math.PI / 2;
                const edgeX = 130 + 95 * Math.cos(angle);
                const edgeY = 130 + 95 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1="130"
                    y1="130"
                    x2={edgeX}
                    y2={edgeY}
                    stroke="#27342F"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-xs font-bold text-slate-300">Waiting for article...</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1">Generated after analysis</span>
            </div>
          </div>

          {/* Placeholder Dimensions */}
          <div className="w-full sm:w-56 space-y-1.5 text-xs">
            {emptyDimensions.map((dim) => (
              <div
                key={dim}
                className="p-2 rounded-xl border border-slate-800/60 bg-slate-950/30 text-slate-500 flex items-center justify-between"
              >
                <span className="text-[11px] font-medium truncate">{dim}</span>
                <span className="font-mono text-slate-600 text-[11px]">—</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
          <span>
            Submit an article to generate its multi-signal analytical fingerprint synthesizing confidence, novelty, vocabulary diversity, and entity salience.
          </span>
        </div>
      </div>
    );
  }

  const dimensions = dna.dna_fingerprint || [];
  const categoryStyle = getCategoryStyle(dna.predicted_category);
  const total = dimensions.length;

  // Radar geometry
  const cx = 130;
  const cy = 130;
  const radius = 95;

  const points = dimensions.map((d, i) => {
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const valRatio = Math.max(0.15, Math.min(1.0, d.value / 100));
    const r = radius * valRatio;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y, angle, ...d };
  });

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Dimension explanations
  const EXPLANATIONS = {
    "Category Confidence": "Posterior probability output of the calibrated classification model for the target domain.",
    "Novelty Index": "Computed as (1 - max_similarity)*100 against all 9,990 articles in the verified news corpus.",
    "Vocabulary Diversity": "Type-Token Ratio (unique tokens / total tokens) measuring lexical richness.",
    "Entity Salience": "Concentration of named organizations, key personnel, and proper nouns per 100 words.",
    "Terminology Density": "Prevalence of domain-specific technical and multi-syllabic vocabulary.",
    "Headline Alignment": "Semantic cosine similarity between the article headline and body content.",
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4 h-full flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">News DNA Fingerprint</h3>
              <p className="text-[10px] text-slate-400 font-mono">Multi-signal analytical profile</p>
            </div>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${categoryStyle.border} ${categoryStyle.bg} ${categoryStyle.text}`}>
            {dna.predicted_category}
          </span>
        </div>

        {/* Radar Chart & Center Telemetry */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
        <div className="relative">
          <svg width="260" height="260" className="overflow-visible">
            {/* Concentric baseline rings */}
            {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={radius * ratio}
                fill="none"
                stroke="#27342F"
                strokeWidth="1"
                strokeDasharray={idx < 3 ? "3 3" : "none"}
                opacity="0.6"
              />
            ))}

            {/* Radial axis lines */}
            {points.map((p, i) => {
              const edgeX = cx + radius * Math.cos(p.angle);
              const edgeY = cy + radius * Math.sin(p.angle);
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={edgeX}
                  y2={edgeY}
                  stroke="#27342F"
                  strokeWidth="1"
                  opacity="0.6"
                />
              );
            })}

            {/* Radar Filled Area */}
            <path
              d={polygonPath}
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10B981"
              strokeWidth="2.5"
              className="transition-all duration-500"
            />

            {/* Interactive Data Vertices */}
            {points.map((p, i) => {
              const isHovered = hoveredDim?.dimension === p.dimension;
              return (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? "#34D399" : "#10B981"}
                    stroke="#151C19"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredDim(p)}
                    onMouseLeave={() => setHoveredDim(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Center Fingerprint Hologram */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
            <span className="text-[10px] font-mono text-slate-500 block">DNA CODE</span>
            <span className="text-xs font-black font-mono text-brand-400 block">
              {(dna.confidence ? (dna.confidence * 100).toFixed(0) : '75')}·{dna.novelty?.score?.toFixed(0) || '80'}
            </span>
          </div>
        </div>

        {/* Dimension Breakdown Cards */}
        <div className="w-full sm:w-56 space-y-1.5 text-xs">
          {dimensions.map((d) => {
            const isHovered = hoveredDim?.dimension === d.dimension;
            return (
              <div
                key={d.dimension}
                onMouseEnter={() => setHoveredDim(d)}
                onMouseLeave={() => setHoveredDim(null)}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? 'bg-brand-950/40 border-brand-500/50 text-brand-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-[11px] font-medium truncate">{d.dimension}</span>
                <span className="font-mono font-bold text-white ml-2 text-[11px]">{d.value}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Dynamic Hover Explanation */}
    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-slate-200">
            {hoveredDim ? hoveredDim.dimension : "Mathematical Signals"}:
          </span>{' '}
          <span>
            {hoveredDim
              ? (EXPLANATIONS[hoveredDim.dimension] || "Measured computational feature.")
              : "Hover over vertices or list items to view exact signal computation details."}
          </span>
        </div>
      </div>
    </div>
  );
}
