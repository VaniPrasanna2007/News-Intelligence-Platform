import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Database,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { getArticles } from '../services/api';
import { getCategoryStyle } from '../utils/categoryColors';
import InternalBackground from './InternalBackground';
import ExportReportMenu from './ExportReportMenu';

const CANONICAL_CATEGORIES = [
  { value: 'All', label: 'All Categories' },
  { value: 'Business', label: 'Business' },
  { value: 'Education', label: 'Education' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Technology', label: 'Technology' }
];

export default function ExistingArticleBrowser({
  isOpen = false,
  onClose,
  onSelectArticle,
  selectedArticleId
}) {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch articles from backend API with indexed SQLite pagination
  const fetchArticles = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getArticles({
        page,
        limit,
        category: categoryFilter !== 'All' ? categoryFilter.toLowerCase() : undefined,
        search: activeSearch || undefined
      });
      setArticles(data.articles || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Existing Article API error", {
        url: err.config?.url ? `${err.config.baseURL || ''}${err.config.url}` : 'http://127.0.0.1:8000/api/articles',
        status: err.response?.status,
        response: err.response?.data,
        message: err.message
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchArticles();
    }
  }, [isOpen, page, categoryFilter, activeSearch]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setCategoryFilter('All');
    setPage(1);
  };

  const handleSelect = (art) => {
    if (onSelectArticle) {
      onSelectArticle(art);
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col p-2 sm:p-3 md:p-4 overflow-hidden animate-fadeIn select-none">
      {/* Global Static Reference Background Layer (Stationary behind modal) */}
      <InternalBackground />

      {/* Main Container Card: Near-full-screen focused workspace with subtle emerald outline & soft emerald glow */}
      <div className="w-full h-full flex-1 flex flex-col min-h-0 bg-slate-900/95 backdrop-blur-md border border-emerald-500/35 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/25 overflow-hidden relative z-10">
        
        {/* Top Header - Sticky so Close button is always visible */}
        <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 md:px-6 border-b border-slate-800 bg-slate-950/95 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  EXISTING ARTICLES
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  9,990 Corpus
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Search and select an article from the corpus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {!loading && !error && totalCount > 0 && (
              <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
                Showing <strong className="text-white">{articles.length}</strong> of <strong className="text-brand-300">{totalCount.toLocaleString()}</strong> articles
              </span>
            )}
            <ExportReportMenu
              moduleType="existing_articles"
              data={{ articles, totalCount, categoryFilter, activeSearch }}
              label="Export Articles"
              buttonSize="sm"
              includeJson={true}
              customFilename={`existing_articles_corpus_${Date.now()}`}
            />
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 md:px-6 border-b border-[#27342F] bg-[#111715]/40 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by headline or content..."
                className="w-full bg-[#0B0F0E] border border-[#27342F] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-900/20 transition cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>

          {/* Category Filter */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="text-xs text-slate-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={handleCategoryChange}
              className="bg-[#0B0F0E] border border-[#27342F] text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 font-medium cursor-pointer"
            >
              {CANONICAL_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter Pills (Strict Dedicated Colors) */}
        <div className="px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto border-b border-[#27342F]/60 text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 font-mono">Domain:</span>
          {CANONICAL_CATEGORIES.map((cat) => {
            const isSelected = categoryFilter.toLowerCase() === cat.value.toLowerCase();
            const style = cat.value === 'All' ? null : getCategoryStyle(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.value);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSelected
                    ? cat.value === 'All'
                      ? 'bg-slate-800 text-white border border-slate-600 shadow'
                      : `${style.bg} ${style.text} border ${style.border} shadow-sm ring-1 ring-white/10`
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {style && <span className={`w-2 h-2 rounded-full ${style.dot}`} />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subheader: Article Results */}
        <div className="px-6 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            ARTICLE RESULTS
          </span>
          {activeSearch && (
            <span className="text-[11px] text-slate-400 font-mono">
              Filtered by: "<strong className="text-white">{activeSearch}</strong>"
            </span>
          )}
        </div>

        {/* Scrollable Results Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          {/* Loading State */}
          {loading && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
              <span className="font-medium text-slate-300">Loading articles...</span>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 bg-slate-950/40 rounded-xl border border-rose-500/20">
              <p className="text-xs text-rose-300 font-medium">Failed to load articles. Please try again.</p>
              <button
                type="button"
                onClick={fetchArticles}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && articles.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 bg-slate-950/40 rounded-xl border border-slate-800">
              <BookOpen className="w-8 h-8 text-slate-600" />
              <p className="text-xs text-slate-300 font-medium">No articles found.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Article Results Grid */}
          {!loading && !error && articles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {articles.map((art) => {
                const headline = art.headline || art.headlines || 'Untitled Article';
                const snippet = art.description || art.content || 'No description available.';
                const isSelected = selectedArticleId === art.article_id;
                const style = getCategoryStyle(art.category);

                return (
                  <div
                    key={art.article_id || art.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-brand-500/10 border-brand-500 shadow-md shadow-brand-500/10 ring-1 ring-brand-500/40'
                        : 'bg-[#111715]/70 border-[#27342F] hover:border-slate-700 hover:bg-[#111715]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.border} ${style.bg} ${style.text}`}>
                          {art.category}
                        </span>
                        {art.url ? (
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                            {art.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-600">Corpus #{art.article_id || art.id}</span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {headline}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                        {snippet}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#27342F] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        {snippet.length} chars
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSelect(art)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-brand-600 hover:bg-brand-500 text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>SELECTED</span>
                          </>
                        ) : (
                          <span>SELECT ARTICLE</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Pagination & Close Footer */}
        <div className="p-4 md:px-6 border-t border-[#27342F] bg-[#111715]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3.5 py-1.5 rounded-lg bg-[#0B0F0E] border border-[#27342F] text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-mono text-slate-400 px-2">
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3.5 py-1.5 rounded-lg bg-[#0B0F0E] border border-[#27342F] text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
