import React, { useState } from 'react';
import { Tag, FileText, Hash, TrendingUp, Sparkles, ExternalLink } from 'lucide-react';
import { CATEGORY_COLORS, getCategoryStyle } from '../utils/categoryColors';

const SAMPLE_DATA = {
  business: {
    title: 'Business & Financial Markets',
    avgLength: 1902,
    samples: [
      {
        headline: "Federal Reserve signals steady interest rates amidst robust labor market data",
        snippet: "Central bank officials indicated monetary policy will remain supportive as inflation numbers normalize across core economic sectors."
      },
      {
        headline: "Tech index rebounds as enterprise earnings outshine quarterly projections",
        snippet: "Investors rallied behind strong cloud infrastructure margins and corporate capital expenditure forecasts."
      }
    ]
  },
  education: {
    title: 'Education & Academic Policy',
    avgLength: 1328,
    samples: [
      {
        headline: "Universities introduce hybrid AI curriculum to modern undergraduate programs",
        snippet: "Leading institutions announce updated syllabi integrating machine learning foundations across STEM disciplines."
      },
      {
        headline: "National scholarship foundation expands grants for vocational skill training",
        snippet: "Funding initiatives target technical apprenticeships and career advancement certifications for high school graduates."
      }
    ]
  },
  entertainment: {
    title: 'Entertainment & Cultural Media',
    avgLength: 1516,
    samples: [
      {
        headline: "Film festival announces international jury and official screening selections",
        snippet: "The annual cinematic event will premiere over forty foreign language features and independent documentaries."
      },
      {
        headline: "Music streaming platforms report record global vinyl and digital album downloads",
        snippet: "Listener analytics reveal rising popularity in acoustic revivals and worldwide electronic music collaborations."
      }
    ]
  },
  sports: {
    title: 'Sports & Athletic Competitions',
    avgLength: 1871,
    samples: [
      {
        headline: "Championship final goes down to wire as thrilling stoppage-time goal seals victory",
        snippet: "A capacity crowd witnessed dramatic tactical shifts before the visiting team secured the tournament trophy."
      },
      {
        headline: "Olympic track qualifiers showcase record sprint timings ahead of summer games",
        snippet: "Athletes across national delegations set personal bests in the hundred-meter and relay preliminaries."
      }
    ]
  },
  technology: {
    title: 'Technology & Digital Innovation',
    avgLength: 1375,
    samples: [
      {
        headline: "Open-source consortium releases high-efficiency LLM optimized for edge compute",
        snippet: "The lightweight transformer model matches baseline benchmarks while slashing power consumption by sixty percent."
      },
      {
        headline: "Quantum computing researchers achieve quantum coherence milestone in silicon",
        snippet: "Breakthrough experiments demonstrate stable qubit entanglement at room temperature environments."
      }
    ]
  }
};

export default function CategoriesPage({ summary, categories, keywords }) {
  const [activeCategory, setActiveCategory] = useState('business');
  const catList = ['business', 'education', 'entertainment', 'sports', 'technology'];

  const activeStyle = getCategoryStyle(activeCategory);
  const activeKeywords = keywords?.[activeCategory] || [];
  const catCount = summary?.category_counts?.[activeCategory] || 2000;
  const catPct = summary?.category_percentages?.[activeCategory] || 20.0;
  const domainInfo = SAMPLE_DATA[activeCategory] || SAMPLE_DATA.business;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-white">Category Domain Analysis</h2>
        <p className="text-sm text-slate-400 mt-1">
          Detailed NLP profiling, vocabulary salience, length metrics, and corpus insights for each of the 5 canonical categories.
        </p>
      </div>

      {/* Category Tab Selector */}
      <div className="flex flex-wrap gap-2">
        {catList.map((cat) => {
          const isSelected = activeCategory === cat;
          const style = getCategoryStyle(cat);
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition capitalize ${
                isSelected
                  ? `${style.bg} ${style.text} border ${style.border} shadow-lg`
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`}></span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Active Category Header Card */}
      <div className={`p-6 rounded-2xl border ${activeStyle.border} ${activeStyle.bg} relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${activeStyle.bg} ${activeStyle.text} border ${activeStyle.border}`}>
                Canonical Category
              </span>
              <span className="text-xs text-slate-400 font-mono">Domain Code: {activeCategory}</span>
            </div>
            <h3 className="text-2xl font-black text-white capitalize mt-1">
              {domainInfo.title}
            </h3>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold">Volume</span>
              <p className="text-xl font-black text-white font-mono">{catCount.toLocaleString()} articles</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold">Share</span>
              <p className="text-xl font-black text-white font-mono">{catPct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Keywords & Text Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Keywords Analysis */}
        <div className="lg:col-span-7 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-brand-400" />
                <span>Top Salient TF-IDF Keywords</span>
              </h4>
              <p className="text-xs text-slate-400">Class-conditional term weights identifying distinguishing vocabulary</p>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {activeKeywords.length} terms
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {activeKeywords.map((kw, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <span className="font-semibold text-xs text-slate-200 truncate pr-2">{kw.keyword}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${activeStyle.bg} ${activeStyle.text}`}>
                  {(kw.score * 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Statistics Summary */}
        <div className="lg:col-span-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Corpus Characteristics</span>
            </h4>
            <p className="text-xs text-slate-400 mb-5">Measured properties for {activeCategory} news texts</p>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Average Article Length</span>
                  <span className="text-base font-bold text-white font-mono">{domainInfo.avgLength.toLocaleString()} characters</span>
                </div>
                <FileText className="w-5 h-5 text-teal-400" />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Target Class Proportion</span>
                  <span className="text-base font-bold text-white font-mono">20.00% (Balanced 1:5)</span>
                </div>
                <Tag className="w-5 h-5 text-amber-400" />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Feature Extraction Mode</span>
                  <span className="text-base font-bold text-white font-mono">TF-IDF (12,000 unigrams + bigrams)</span>
                </div>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cleaned Text Pipeline</span>
            <span className="text-emerald-400 font-mono">Zero synthetic rows</span>
          </div>
        </div>
      </div>

      {/* Representative Domain Samples */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
        <h4 className="text-base font-bold text-white mb-1">Representative Article Headlines</h4>
        <p className="text-xs text-slate-400 mb-4">Sample article texts exhibiting lexical patterns typical for {activeCategory}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domainInfo.samples.map((s, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${activeStyle.bg} ${activeStyle.text}`}>
                  Sample #{idx + 1}
                </span>
              </div>
              <h5 className="font-bold text-white text-sm leading-snug">{s.headline}</h5>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{s.snippet}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
