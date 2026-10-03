import React, { useState, useRef } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  Globe,
  Database,
  Cpu,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
  CheckCircle2,
  Trash2,
  FileUp,
  ExternalLink,
  Tag,
  Check
} from 'lucide-react';
import { predictSingle, extractArticlePreview } from '../services/api';
import { getCategoryStyle } from '../utils/categoryColors';
import ExistingArticleBrowser from './ExistingArticleBrowser';

const PRESETS = [
  {
    category: 'Business',
    headline: 'Federal Reserve Signals Interest Rate Stability Amid Economic Growth',
    text: "Wall Street closed sharply higher today following the Federal Reserve's announcement of declining inflation rates and lower treasury yields. Major indices including the S&P 500 and Dow Jones recorded steep gains, driven by a rally in retail banking, debt securities, and enterprise manufacturing stocks across domestic markets."
  },
  {
    category: 'Education',
    headline: 'Universities Launch Interdisciplinary AI Curriculum and Scholarships',
    text: "Leading academic institutions and higher education boards announced revised undergraduate degree syllabi integrating foundation machine learning, computational statistics, and ethical technology governance. National research grants will provide tuition assistance for doctoral candidates."
  },
  {
    category: 'Entertainment',
    headline: 'International Film Festival Reveals Official Selections and Jury Awards',
    text: "The annual cinematic festival concluded with prestigious jury honors awarded to independent international features, outstanding directing, and cinematic choreography. Over forty foreign language films premiered to critical acclaim during the weekend gala."
  },
  {
    category: 'Sports',
    headline: 'Stoppage Time Strike Decides Continental Football Tournament Title',
    text: "Real Madrid secured a dramatic extra-time win over Bayern Munich to book their place in the Champions League final. The match witnessed intense midfield pressing, two disallowed goals, and a 94th-minute header that ignited jubilation among traveling supporters."
  },
  {
    category: 'Technology',
    headline: 'Semiconductor Consortium Demonstrates Scalable Quantum Processor Unit',
    text: "Leading semiconductor designers AMD and Nvidia announced breakthrough silicon architectures engineered for hyperscale data centers. The high-bandwidth tensor accelerators deliver fourfold improvements in inference throughput while reducing cooling energy demands."
  }
];

export default function ArticleInputConsole({
  onAnalysisComplete,
  loading,
  setLoading,
  analysisData,
  onResetAnalysis,
  onAnalysisStart,
  onAnalysisError,
  initialMode = 'text'
}) {
  // 4 Core Modes: 'text' | 'document' | 'url' | 'existing'
  const [activeMode, setActiveMode] = useState(initialMode);

  React.useEffect(() => {
    if (initialMode && initialMode !== activeMode) {
      setActiveMode(initialMode);
    }
  }, [initialMode]);

  // Text Mode State
  const [textHeadline, setTextHeadline] = useState('');
  const [textContent, setTextContent] = useState('');

  // Document Mode State
  const [documentFile, setDocumentFile] = useState(null);
  const [documentMeta, setDocumentMeta] = useState(null);
  const fileInputRef = useRef(null);

  // URL Mode State
  const [urlInput, setUrlInput] = useState('');
  const [urlMeta, setUrlMeta] = useState(null);

  // Existing Article Mode State
  const [existingArticle, setExistingArticle] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Common State
  const [extracting, setExtracting] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Switch mode and clear all state completely
  const handleModeSwitch = (mode) => {
    setActiveMode(mode);
    setTextHeadline('');
    setTextContent('');
    setDocumentFile(null);
    setDocumentMeta(null);
    setUrlInput('');
    setUrlMeta(null);
    setExistingArticle(null);
    setDemoLoaded(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onResetAnalysis) onResetAnalysis();
    if (mode === 'existing') {
      setIsSelectorOpen(true);
    } else {
      setIsSelectorOpen(false);
    }
  };

  // Clear current mode state
  const handleClearCurrent = () => {
    if (activeMode === 'text') {
      setTextHeadline('');
      setTextContent('');
    } else if (activeMode === 'document') {
      setDocumentFile(null);
      setDocumentMeta(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (activeMode === 'url') {
      setUrlInput('');
      setUrlMeta(null);
    } else if (activeMode === 'existing') {
      setExistingArticle(null);
      setIsSelectorOpen(false);
    }
    setDemoLoaded(false);
    setError(null);
    if (onResetAnalysis) onResetAnalysis();
  };

  // Preset loading for Text mode
  const handleSelectPreset = (p) => {
    handleModeSwitch('text');
    setTextHeadline(p.headline);
    setTextContent(p.text);
    setDemoLoaded(true);
    setError(null);
    if (onResetAnalysis) onResetAnalysis();
  };

  // Document extraction
  const handleFileSelect = async (file) => {
    if (!file) return;
    setDocumentFile(file);
    setDocumentMeta(null);
    setError(null);
    setExtracting(true);
    if (onResetAnalysis) onResetAnalysis();

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await extractArticlePreview(formData);

      setDocumentMeta({
        filename: file.name,
        fileType: file.name.split('.').pop().toUpperCase(),
        headline: res.headline || '',
        content: res.text || '',
        charCount: res.char_count || res.text?.length || 0,
        wordCount: res.word_count || res.text?.split(/\s+/).length || 0,
      });
    } catch (err) {
      console.error("Document extraction error:", err);
      setError(err.response?.data?.detail || err.message || "Failed to extract text from document.");
      setDocumentFile(null);
      setDocumentMeta(null);
    } finally {
      setExtracting(false);
    }
  };

  // URL extraction
  const handleUrlFetch = async (e) => {
    if (e) e.preventDefault();
    if (!urlInput.trim() || !urlInput.startsWith('http')) {
      setError("Please enter a valid HTTP or HTTPS article URL.");
      return;
    }

    setUrlMeta(null);
    setError(null);
    setExtracting(true);
    if (onResetAnalysis) onResetAnalysis();

    try {
      const formData = new FormData();
      formData.append('url', urlInput.trim());
      const res = await extractArticlePreview(formData);

      setUrlMeta({
        url: urlInput.trim(),
        domain: urlInput.trim().replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
        headline: res.headline || '',
        content: res.text || '',
        charCount: res.char_count || res.text?.length || 0,
        wordCount: res.word_count || res.text?.split(/\s+/).length || 0,
      });
    } catch (err) {
      console.error("URL extraction error:", err);
      setError("Unable to extract this article automatically. Please use Text input and paste the article content.");
      setUrlMeta(null);
    } finally {
      setExtracting(false);
    }
  };

  // Existing article selection
  const handleSelectExistingArticle = (art) => {
    setExistingArticle(art);
    setIsSelectorOpen(false);
    setError(null);
    if (onResetAnalysis) onResetAnalysis();
  };

  // Check if article is ready for analysis in current mode
  const isReady = (() => {
    if (activeMode === 'text') return Boolean(textContent && textContent.trim().length >= 5);
    if (activeMode === 'document') return Boolean(documentMeta && documentMeta.content && documentMeta.content.trim().length >= 5);
    if (activeMode === 'url') return Boolean(urlMeta && urlMeta.content && urlMeta.content.trim().length >= 5);
    if (activeMode === 'existing') return Boolean(existingArticle && (existingArticle.content || existingArticle.description));
    return false;
  })();

  // Execute intelligence analysis
  const handleRunAnalysis = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    let contentToAnalyze = '';
    let headlineToAnalyze = '';
    let datasetCategory = null;
    let sourceType = 'Text';

    if (activeMode === 'text') {
      contentToAnalyze = textContent.trim();
      headlineToAnalyze = textHeadline.trim();
      sourceType = 'Text';
    } else if (activeMode === 'document') {
      contentToAnalyze = documentMeta?.content || '';
      headlineToAnalyze = documentMeta?.headline || '';
      sourceType = 'Document';
    } else if (activeMode === 'url') {
      contentToAnalyze = urlMeta?.content || '';
      headlineToAnalyze = urlMeta?.headline || '';
      sourceType = 'URL';
    } else if (activeMode === 'existing') {
      contentToAnalyze = existingArticle?.content || existingArticle?.description || '';
      headlineToAnalyze = existingArticle?.headline || existingArticle?.headlines || '';
      datasetCategory = existingArticle?.category || null;
      sourceType = 'Existing Article';
    }

    if (!contentToAnalyze || contentToAnalyze.length < 5) {
      setError("Article content is too short for meaningful classification.");
      return;
    }

    setLoading(true);
    if (onAnalysisStart) {
      onAnalysisStart({
        sourceType,
        headline: headlineToAnalyze || (contentToAnalyze.slice(0, 100) + '...')
      });
    }

    try {
      const result = await predictSingle(contentToAnalyze, headlineToAnalyze || null, 'best', sourceType);
      if (result) {
        result.source_type = sourceType;
        result.headline = headlineToAnalyze || (contentToAnalyze.slice(0, 100) + '...');
        if (datasetCategory) {
          result.dataset_category = datasetCategory;
        }
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      }
    } catch (err) {
      console.error("Analysis pipeline error:", err);
      const errMsg = err.response?.data?.detail || err.message || "Analysis pipeline execution failed.";
      setError(errMsg);
      if (onAnalysisError) {
        onAnalysisError({ error: errMsg, sourceType });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Top Header with 4 Visually Clear Input Modes */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              ARTICLE INPUT
            </h3>
            {isReady ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Article Ready</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                Ready for Article Analysis
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Choose an input mode to ingest an article for multi-signal intelligence analysis.
          </p>
        </div>

        {/* 4 Tabs: TEXT | DOCUMENT | URL | EXISTING ARTICLE */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => handleModeSwitch('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeMode === 'text' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>TEXT</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('document')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeMode === 'document' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>DOCUMENT</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('url')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeMode === 'url' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>URL</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('existing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeMode === 'existing' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>EXISTING ARTICLE</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Quick Demo Presets (Only shown in TEXT mode) */}
      {activeMode === 'text' && (
        <div className="flex flex-col gap-2 pt-1 pb-2 border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Try Demo Article:</span>
            </span>
            <span className="text-[10px] text-slate-500">Loads text without auto-running analysis</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {PRESETS.map((p) => {
              const style = getCategoryStyle(p.category);
              return (
                <button
                  key={p.category}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${style.border} ${style.bg} ${style.text} hover:opacity-90 transition shrink-0 flex items-center gap-1 cursor-pointer`}
                >
                  <span>Try Demo:</span>
                  <span className="font-bold">{p.category}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 1: TEXT INPUT                                               */}
      {/* ================================================================= */}
      {activeMode === 'text' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-300">Type or paste a news article</span>
            {textContent.length > 0 && (
              <span className="font-mono text-[11px] text-slate-500">
                {textContent.split(/\s+/).filter(Boolean).length} words • {textContent.length} chars
              </span>
            )}
          </div>

          <div>
            <input
              type="text"
              value={textHeadline}
              onChange={(e) => setTextHeadline(e.target.value)}
              placeholder="Article Headline (Optional — enables Headline–Body consistency check)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-medium"
            />
          </div>

          <div>
            <textarea
              value={textContent}
              onChange={(e) => {
                setTextContent(e.target.value);
                setDemoLoaded(false);
                if (onResetAnalysis) onResetAnalysis();
              }}
              placeholder="Paste or type news article content here..."
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed resize-y font-['Plus_Jakarta_Sans',sans-serif]"
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 2: DOCUMENT INPUT                                           */}
      {/* ================================================================= */}
      {activeMode === 'document' && (
        <div className="space-y-4">
          {!documentMeta ? (
            /* Upload Zone (State 1) */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">Upload News Document (.docx, .pdf, .txt)</span>
                <span className="text-[10px] text-slate-500 font-mono">Clean isolated extraction</span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="border-2 border-dashed border-slate-800 hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/60 flex flex-col items-center justify-center space-y-3 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  accept=".txt,.pdf,.docx"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition flex items-center justify-center shadow-lg">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">
                    Click to browse or drag & drop document
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supported: <span className="font-semibold text-slate-300 font-mono">DOCX, PDF, TXT</span>
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                  No document selected
                </span>
              </div>

              {extracting && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-xs text-brand-400 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Extracting document text preview...</span>
                </div>
              )}
            </div>
          ) : (
            /* Document Ready & Preview (State 2) */
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    DOCUMENT READY
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700">
                    {documentMeta.filename}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {documentMeta.fileType}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Text extracted successfully ({documentMeta.wordCount} words, {documentMeta.charCount} chars)</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  ARTICLE PREVIEW
                </span>

                {documentMeta.headline && (
                  <p className="text-xs font-bold text-white">
                    <span className="text-slate-500 font-mono text-[10px] uppercase mr-1">Headline:</span>
                    {documentMeta.headline}
                  </p>
                )}

                <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                  {documentMeta.content}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 3: URL INPUT                                                */}
      {/* ================================================================= */}
      {activeMode === 'url' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">Paste a live news article URL</span>
              <span className="text-[10px] text-slate-500 font-mono">Real-time HTTP HTML extraction</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleUrlFetch}
                disabled={extracting || !urlInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs border border-brand-500/50 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>FETCH ARTICLE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Article Fetched Preview (State 2) */}
          {urlMeta && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    ARTICLE FETCHED
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-brand-300 border border-slate-700 truncate max-w-xs">
                    Source: {urlMeta.domain}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClearCurrent}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {urlMeta.headline && (
                <p className="text-xs font-bold text-white">
                  <span className="text-slate-500 font-mono text-[10px] uppercase mr-1">Headline:</span>
                  {urlMeta.headline}
                </p>
              )}

              <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                {urlMeta.content}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 4: EXISTING ARTICLE                                         */}
      {/* ================================================================= */}
      {activeMode === 'existing' && (
        <div className="space-y-4">
          {existingArticle ? (
            <div className="p-5 rounded-2xl bg-[#0B0F0E] border border-brand-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#27342F] pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    SELECTED CORPUS ARTICLE
                  </span>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                    Dataset Category: <strong className={getCategoryStyle(existingArticle.category).text}>{existingArticle.category}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsSelectorOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                    <span>Change Article</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCurrent}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Deselect</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white leading-snug">
                  "{existingArticle.headline || existingArticle.headlines}"
                </h4>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-['Plus_Jakarta_Sans',sans-serif]">
                  {existingArticle.description || existingArticle.content || 'No description available.'}
                </p>

                {existingArticle.url && (
                  <div className="pt-2 border-t border-[#27342F]/80 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-500">Source:</span>
                    <a
                      href={existingArticle.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-400 hover:underline truncate max-w-md flex items-center gap-1"
                    >
                      <span>{existingArticle.url}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Explicit Analyze Button */}
              <div className="pt-2 border-t border-[#27342F]">
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-brand-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Running NLP Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ANALYZE EXISTING ARTICLE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#0B0F0E] border border-[#27342F] text-center space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Select from the 9,990 Reference Corpus</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Click below to open the dedicated full-screen selection workspace. Search articles by keyword or filter across all 5 benchmark domains.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectorOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-brand-900/30 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Existing Article Selector</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Execution & Model Engine Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center space-x-2 text-xs">
          <Cpu className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-slate-400 font-medium">Model Pipeline:</span>
          <span className="font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>All 3 Production Models (NB · LR · SVM)</span>
          </span>
        </div>

        {/* Bottom Analyze Button (for TEXT, DOCUMENT, URL modes — hidden in EXISTING ARTICLE mode to prevent duplication) */}
        {activeMode !== 'existing' && (
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={loading || !isReady}
            className={`flex items-center justify-center space-x-2 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition ${
              isReady
                ? 'bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white shadow-brand-900/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running NLP Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>RUN INTELLIGENCE ANALYSIS</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Full-Screen Existing Article Selection Workspace */}
      <ExistingArticleBrowser
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelectArticle={handleSelectExistingArticle}
        selectedArticleId={existingArticle?.article_id || existingArticle?.id}
      />
    </div>
  );
}
