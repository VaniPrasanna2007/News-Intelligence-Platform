import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Share2, 
  Search, 
  Compass, 
  AlertCircle,
  RotateCcw,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import ClusterConstellationMap from '../components/ClusterConstellationMap';
import SelectedClusterDetail from '../components/SelectedClusterDetail';
import { getStoryClusters, getClusterConstellation } from '../services/api';
import { getCategoryStyle } from '../utils/categoryColors';
import ExportReportMenu from '../components/ExportReportMenu';

export default function ClustersConstellationPage() {
  const [clusters, setClusters] = useState([]);
  const [constellation, setConstellation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  
  const mapRef = useRef(null);
  const detailRef = useRef(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      getStoryClusters(),
      getClusterConstellation()
    ])
      .then(([storyData, constData]) => {
        const clusterList = storyData?.clusters || [];
        setClusters(clusterList);
        setConstellation(constData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching cluster data:', err);
        setError('Unable to load cluster and constellation data from backend service.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categories = ['All', 'Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

  // Cluster counts by category
  const categoryCounts = useMemo(() => {
    const counts = { All: clusters.length };
    categories.slice(1).forEach(cat => {
      counts[cat] = clusters.filter(c => c.dominant_category?.toLowerCase() === cat.toLowerCase()).length;
    });
    return counts;
  }, [clusters]);

  // Filtered clusters based on category and search query
  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      const matchesCategory = categoryFilter === 'All' || 
        c.dominant_category?.toLowerCase() === categoryFilter.toLowerCase();
      
      const q = search.trim().toLowerCase();
      if (!q) return matchesCategory;

      const matchesSearch = 
        c.topic_label.toLowerCase().includes(q) ||
        c.dominant_category.toLowerCase().includes(q) ||
        (c.top_terms && c.top_terms.some(t => t.toLowerCase().includes(q))) ||
        (c.representative_articles && c.representative_articles.some(a => a.headline?.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [clusters, categoryFilter, search]);

  // Active selected cluster object
  const selectedCluster = useMemo(() => {
    if (selectedClusterId === null || selectedClusterId === undefined) return null;
    return clusters.find(c => Number(c.cluster_id) === Number(selectedClusterId)) || null;
  }, [clusters, selectedClusterId]);

  const handleSelectCluster = (clusterId) => {
    setSelectedClusterId(clusterId);
    if (clusterId !== null) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

  // Coherence badge helper
  const getCoherenceBadge = (score) => {
    if (score >= 80.0) {
      return {
        label: "High Semantic Tightness",
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        bar: "bg-emerald-500"
      };
    } else if (score >= 60.0) {
      return {
        label: "Moderate Semantic Cohesion",
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        bar: "bg-amber-500"
      };
    } else {
      return {
        label: "Broad Semantic Dispersion",
        bg: "bg-teal-500/10 text-teal-400 border-teal-500/30",
        bar: "bg-teal-500"
      };
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Story Clusters & Semantic Constellation
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Latent Semantic Topology
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Explore semantic relationships and story families across the 9,990 clean news corpus.
              </p>
            </div>
          </div>

          <ExportReportMenu
            moduleType="clusters"
            data={{ clusters, constellation }}
            label="Export Report"
            buttonSize="sm"
            includeJson={true}
            customFilename={`clusters_constellation_report_${Date.now()}`}
            className="self-start sm:self-auto"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Search & Category Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search story clusters..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>

        {/* Category Filter Pills (Filters clusters by dominant category) */}
        <div className="flex flex-wrap gap-1.5 items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat;
            const count = categoryCounts[cat] || 0;
            const style = cat === 'All' ? null : getCategoryStyle(cat);
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? cat === 'All'
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                      : `${style.bg} ${style.text} border ${style.border} shadow-sm`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {style && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                <span>{cat}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isSelected && style
                    ? `${style.bg} ${style.text}`
                    : isSelected
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Constellation Map */}
      <div ref={mapRef}>
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span>Calculating semantic cluster constellation topology...</span>
          </div>
        ) : (
          <ClusterConstellationMap
            constellation={constellation}
            selectedClusterId={selectedClusterId}
            onSelectCluster={handleSelectCluster}
            categoryFilter={categoryFilter}
          />
        )}
      </div>

      {/* 4. Selected Cluster Detail Section */}
      <div ref={detailRef}>
        {selectedCluster && (
          <SelectedClusterDetail
            cluster={selectedCluster}
            onClose={() => setSelectedClusterId(null)}
            onSelectCluster={handleSelectCluster}
          />
        )}
      </div>

      {/* 5. Corpus Story Clusters Section (All 15 clusters remain available) */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Corpus Story Clusters</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredClusters.length} of {clusters.length} story clusters derived from 9,990 clean news articles
            </p>
          </div>

          {search && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter('All'); }}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 self-start sm:self-center"
            >
              <span>Clear search</span>
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading clusters...</span>
          </div>
        ) : filteredClusters.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="font-semibold text-slate-300">No semantic clustering data matches your query.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the search terms or category filter.</p>
            <button
              onClick={() => { setSearch(''); setCategoryFilter('All'); }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:text-white border border-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClusters.map((cluster) => {
              const catStyle = getCategoryStyle(cluster.dominant_category);
              const isSelected = selectedClusterId === cluster.cluster_id;
              const coherenceBadge = getCoherenceBadge(cluster.coherence_score);

              return (
                <div
                  key={cluster.cluster_id}
                  className={`p-5 rounded-xl transition flex flex-col justify-between space-y-4 relative ${
                    isSelected
                      ? 'bg-slate-950 border-2 border-purple-500 shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/30'
                      : 'bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Category Badge & Article Count */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                        {cluster.dominant_category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {cluster.article_count} articles ({cluster.representation_percentage}%)
                      </span>
                    </div>

                    {/* Short Cluster Label */}
                    <div>
                      <h4 className="text-base font-bold text-white leading-snug">
                        {cluster.topic_label}
                      </h4>
                    </div>

                    {/* Cluster Coherence Score & Interpretation */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">
                          Cluster Coherence:
                        </span>
                        <span className="font-mono font-bold text-white">
                          {cluster.coherence_score} <span className="text-slate-500 text-[10px]">/ 100</span>
                        </span>
                      </div>

                      {/* Coherence bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${coherenceBadge.bar}`}
                          style={{ width: `${Math.min(100, cluster.coherence_score)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${coherenceBadge.bg}`}>
                          {coherenceBadge.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {cluster.coherence_grade}
                        </span>
                      </div>
                    </div>

                    {/* Top Distinguishing Terms */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                        Top Terms:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cluster.top_terms?.slice(0, 5).map((term, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Preview of Representative Real Headlines (2-3 real headlines) */}
                    {cluster.representative_articles && cluster.representative_articles.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 block">
                          Representative Headlines:
                        </span>
                        {cluster.representative_articles.slice(0, 2).map((art, i) => (
                          <p key={i} className="text-[11px] text-slate-300 leading-snug line-clamp-1 italic pl-2 border-l border-slate-700">
                            "{art.headline}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Button: View Cluster / Explore Articles */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSelectCluster(isSelected ? null : cluster.cluster_id)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-900 hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40'
                      }`}
                    >
                      <span>{isSelected ? 'Viewing Constellation Node' : 'View Cluster & Constellation'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
