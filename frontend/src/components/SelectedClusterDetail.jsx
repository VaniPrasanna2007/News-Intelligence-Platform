import React from 'react';
import { getCategoryStyle } from '../utils/categoryColors';
import { 
  X, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Share2, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  Activity, 
  ExternalLink 
} from 'lucide-react';
import ExportReportMenu from './ExportReportMenu';

export default function SelectedClusterDetail({
  cluster,
  onClose,
  onSelectCluster
}) {
  if (!cluster) return null;

  const catStyle = getCategoryStyle(cluster.dominant_category);

  // Interpretation helper
  const getCoherenceInterpretation = (score, grade) => {
    if (score >= 80.0) {
      return {
        title: "High Semantic Tightness",
        description: "Articles inside this cluster exhibit strong cosine affinity around a tightly focused, coherent news event.",
        color: "text-emerald-400",
        badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        barColor: "bg-emerald-500"
      };
    } else if (score >= 60.0) {
      return {
        title: "Moderate Semantic Cohesion",
        description: "Cohesive subtopic with diverse coverage angles, maintaining solid central thematic alignment.",
        color: "text-amber-400",
        badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
        barColor: "bg-amber-500"
      };
    } else {
      return {
        title: "Broad Semantic Dispersion",
        description: "Encompasses a broad, diverse macro news theme spanning multiple interconnected corporate or policy sub-threads.",
        color: "text-teal-400",
        badgeBg: "bg-teal-500/10 border-teal-500/30 text-teal-300",
        barColor: "bg-teal-500"
      };
    }
  };

  const interpretation = getCoherenceInterpretation(cluster.coherence_score, cluster.coherence_grade);

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative space-y-6 animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-mono">
            SELECTED CLUSTER
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
              {cluster.dominant_category}
            </span>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
              Cluster #{cluster.cluster_id}
            </span>
            <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              {cluster.article_count} Articles ({cluster.representation_percentage}% of Corpus)
            </span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight mt-1">
            {cluster.topic_label}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <ExportReportMenu
            moduleType="clusters"
            data={{ selectedCluster: cluster }}
            label="Export Cluster"
            buttonSize="sm"
            includeJson={true}
            customFilename={`cluster_${cluster.cluster_id}_report_${Date.now()}`}
          />
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            title="Close cluster view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid: Coherence & Structure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Cluster Coherence Score */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
              Cluster Coherence Score
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${interpretation.badgeBg}`}>
              {cluster.coherence_grade}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold font-mono ${interpretation.color}`}>
              {cluster.coherence_score}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
          </div>

          {/* Score bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${interpretation.barColor} transition-all duration-500`}
              style={{ width: `${Math.min(100, cluster.coherence_score)}%` }}
            />
          </div>

          <div className="pt-1">
            <div className={`text-xs font-bold ${interpretation.color}`}>
              {interpretation.title}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
              {interpretation.description}
            </p>
          </div>
        </div>

        {/* Metric 2: Corpus Share & Distribution */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
            Corpus Volume Share
          </span>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {cluster.representation_percentage}%
            </span>
            <span className="text-xs text-slate-500 font-mono">of 9,990 clean news</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(100, cluster.representation_percentage * 3.5)}%` }}
            />
          </div>

          <div className="pt-1 text-xs text-slate-300">
            <div className="font-medium text-slate-200">
              {cluster.article_count} verified articles
            </div>
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
              Dominant in {cluster.dominant_category} sector intelligence.
            </p>
          </div>
        </div>

        {/* Metric 3: Semantic Bridges */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
            Inter-Cluster Bridges
          </span>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-purple-400">
              {cluster.related_clusters?.length || 0}
            </span>
            <span className="text-xs text-slate-500 font-mono">cross-cluster connections</span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (cluster.related_clusters?.length || 0) * 33)}%` }}
            />
          </div>

          <div className="pt-1 text-xs text-slate-300">
            <div className="font-medium text-slate-200">Centroid Cosine Network</div>
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
              Strongest cross-domain affinity links to related story families.
            </p>
          </div>
        </div>
      </div>

      {/* Top Distinguishing Terms */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Top Distinguishing Vocabulary & Terms</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {cluster.top_terms?.map((term, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 shadow-sm"
            >
              #{term}
            </span>
          ))}
        </div>
      </div>

      {/* Representative Real News Articles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>Representative Real News Articles (Closest to Centroid)</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">
            Cosine Similarity to Centroid
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cluster.representative_articles?.map((art, idx) => {
            const artCatStyle = getCategoryStyle(art.category);
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${artCatStyle.bg} ${artCatStyle.text} border ${artCatStyle.border}`}>
                    {art.category}
                  </span>
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                    <span>{art.article_id}</span>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {art.similarity ? `${Math.round(art.similarity * 100)}% sim` : 'Centroid'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 font-medium leading-relaxed italic">
                  "{art.headline}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Related Clusters (Semantic Bridges) */}
      {cluster.related_clusters && cluster.related_clusters.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Related Clusters (Inter-Cluster Semantic Connections)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cluster.related_clusters.map((rel, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                    <span>Cluster #{rel.cluster_id}</span>
                    <span className="text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                      {rel.similarity_pct}% Similarity
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                    {rel.label}
                  </h5>
                </div>

                <button
                  onClick={() => onSelectCluster(rel.cluster_id)}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800/90 hover:bg-purple-600 text-slate-200 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5"
                >
                  <span>Inspect This Cluster</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
