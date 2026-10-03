import React from 'react';
import { Share2, ExternalLink, Sparkles, BookOpen } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryColors';

export default function RelatedStoriesCard({ relatedArticles }) {
  const articles = (relatedArticles || []).slice(0, 3);
  const isAnalyzed = articles.length > 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isAnalyzed ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-500'
          }`}>
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Story Family / Related Stories
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Top semantic matches from 9,990 article corpus
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          isAnalyzed
            ? 'bg-slate-800 text-brand-300 border-slate-700'
            : 'bg-slate-950 text-slate-500 border-slate-800'
        }`}>
          {isAnalyzed ? `${articles.length} Related Articles` : 'Waiting for analysis'}
        </span>
      </div>

      {/* Body: 3 Clean Related Articles */}
      {!isAnalyzed ? (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
          Related stories from the existing corpus will be identified after running analysis.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {articles.map((art, idx) => {
            const style = getCategoryStyle(art.category);
            const simPct = art.similarity_pct || Math.round((art.similarity || 0) * 100);

            return (
              <div
                key={art.article_id || idx}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${style.border} ${style.bg} ${style.text}`}>
                      {art.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                      {simPct}% Match
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {art.headline}
                  </h4>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[150px]">
                    {art.domain || (art.url ? art.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'Corpus')}
                  </span>
                  <span className="text-slate-500">#{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
