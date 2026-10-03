import React from 'react';
import { GitCommit, ArrowDown, ExternalLink, Tag, ShieldAlert, Sparkles, Hash } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryColors';

export default function StoryEvolutionMap({ currentArticle, relatedArticles }) {
  if (!relatedArticles || relatedArticles.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 text-xs">
        <GitCommit className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <span>Analyze an article with related stories to trace its similarity-based story relationship map.</span>
      </div>
    );
  }

  // Chain includes the current analyzed story as the head node, followed by related corpus matches
  const storyChain = [
    {
      rank: 0,
      isSeed: true,
      headline: currentArticle?.news_dna?.headline || currentArticle?.headline || "Analyzed News Story",
      domain: currentArticle?.news_dna?.domain || "Submitted Article",
      category: currentArticle?.predicted_category || "Technology",
      similarity_pct: 100,
      length: currentArticle?.news_dna?.article_structure?.character_count || 1200,
      entities: currentArticle?.news_dna?.entities || ["Target Article"],
      url: null
    },
    ...relatedArticles.map((r, i) => ({
      ...r,
      isSeed: false,
      entities: [r.category, r.domain]
    }))
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Story Evolution & Relationship Map</h3>
            <p className="text-[10px] text-slate-400 font-mono">Similarity-based story relationship sequence</p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
          {storyChain.length} Connected Stories
        </span>
      </div>

      {/* Evolution Nodes Chain */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {storyChain.map((story, idx) => {
          const style = getCategoryStyle(story.category);
          return (
            <div key={idx} className="relative group">
              {/* Timeline Bullet */}
              <div
                className={`absolute -left-6 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  story.isSeed
                    ? 'bg-brand-600 border-brand-400 text-white shadow-md shadow-brand-500/30'
                    : 'bg-slate-900 border-slate-700 text-slate-400 group-hover:border-brand-500'
                }`}
              >
                <span className="text-[10px] font-bold font-mono">{idx === 0 ? '★' : idx}</span>
              </div>

              {/* Story Content Card */}
              <div
                className={`p-4 rounded-xl border transition ${
                  story.isSeed
                    ? 'bg-brand-950/25 border-brand-500/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.border} ${style.bg} ${style.text}`}>
                      {story.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {story.domain}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-brand-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {story.isSeed ? 'Seed Story' : `${story.similarity_pct}% Similarity`}
                  </span>
                </div>

                <h4 className="font-bold text-xs text-white leading-snug">
                  {story.headline}
                </h4>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-slate-500">Entities:</span>
                    {story.entities?.slice(0, 3).map((e, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">
                        {e}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 font-mono text-[10px]">
                    <span>{story.length?.toLocaleString()} chars</span>
                    {story.url && (
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
                      >
                        <span>Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Down Arrow Connector between nodes */}
              {idx < storyChain.length - 1 && (
                <div className="absolute -bottom-4 left-[-15px] text-slate-600">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 text-[10px] text-slate-500 font-mono border-t border-slate-800">
        * Labeled: Similarity-based story relationship. Sequence maps semantic affinity from seed article into reference corpus.
      </div>
    </div>
  );
}
