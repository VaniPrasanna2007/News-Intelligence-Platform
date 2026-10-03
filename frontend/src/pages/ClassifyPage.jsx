import React, { useState } from 'react';
import { Sparkles, Send, RefreshCw, CheckCircle2, AlertCircle, Cpu, Copy, Check } from 'lucide-react';
import { predictSingle } from '../services/api';
import { CATEGORY_COLORS, getCategoryStyle } from '../utils/categoryColors';
import ExportReportMenu from '../components/ExportReportMenu';

const PRESETS = [
  {
    category: 'Business',
    label: 'Stock Market Surge',
    text: "Wall Street closed sharply higher today following the Federal Reserve's announcement of declining inflation rates and lower treasury yields. Major indices including the S&P 500 and Dow Jones recorded steep gains, driven by rally in retail banking and enterprise manufacturing stocks."
  },
  {
    category: 'Education',
    label: 'University Admissions',
    text: "Top universities across the nation have implemented revised holistic admissions guidelines for upcoming undergraduate semesters. Deans of academic affairs emphasized standardized test optional policies, high school GPA parity, and increased scholarship funds for low-income STEM students."
  },
  {
    category: 'Entertainment',
    label: 'Hollywood Awards',
    text: "The Academy of Motion Picture Arts and Sciences unveiled its full nominations for the upcoming Oscars ceremony. Independent filmmakers dominated the Best Picture category alongside international box-office blockbusters, with critics celebrating outstanding acting and musical scores."
  },
  {
    category: 'Sports',
    label: 'Champions League',
    text: "Real Madrid secured a dramatic extra-time win over Bayern Munich to book their place in the Champions League final. The match witnessed frantic tactical adjustments, two disallowed goals, and a 94th-minute header that ignited jubilation among traveling supporters."
  },
  {
    category: 'Technology',
    label: 'AI Chipset Release',
    text: "Leading semiconductor designer AMD announced its next-generation artificial intelligence accelerators engineered for hyperscale data centers. The architecture features high-bandwidth memory chips, 8nm transistor packaging, and dramatic power-efficiency gains for inference workloads."
  }
];

export default function ClassifyPage({ onPredictionSuccess }) {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('best');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleClassify = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || inputText.trim().length < 5) {
      setError('Please enter at least 5 characters of article text.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await predictSingle(inputText, selectedModel);
      setResult(data);
      if (onPredictionSuccess) {
        onPredictionSuccess(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Classification failed. Ensure backend API is operational.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const summary = `Predicted Category: ${result.predicted_category}\nConfidence: ${(result.confidence * 100).toFixed(2)}%\nModel: ${result.model_used}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resultStyle = result ? getCategoryStyle(result.predicted_category) : null;
  const canonicalCategories = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-white">Classify News Article</h2>
        <p className="text-sm text-slate-400 mt-1">
          Input any news headline, article snippet, or full story to compute real-time calibrated predictions across 5 categories.
        </p>
      </div>

      {/* Preset Quick Loaders */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Quick Test Presets (Click to Populate):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const style = getCategoryStyle(p.category);
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setInputText(p.text);
                  setResult(null);
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${style.border} ${style.bg} ${style.text} hover:opacity-90 transition`}
              >
                {p.category}: {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleClassify} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-white">Article Text or Headline</label>
                <span className="text-xs text-slate-500">{inputText.length} characters</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste news headline, article description, or full text here..."
                rows={9}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition leading-relaxed resize-y font-['Plus_Jakarta_Sans',sans-serif]"
              />
            </div>

            {/* Model Selector & Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-brand-400" />
                <span className="text-xs text-slate-400 font-medium">Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
                >
                  <option value="best">Best Model (Logistic Regression)</option>
                  <option value="Logistic Regression">Logistic Regression (98.5% Acc)</option>
                  <option value="Support Vector Machine">SVM with Platt Calibration (98.4% Acc)</option>
                  <option value="Naive Bayes">Multinomial Naive Bayes (98.2% Acc)</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    setResult(null);
                    setError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-brand-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Classifying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Classify Article</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Prediction Results Panel */}
        <div className="lg:col-span-5">
          {result ? (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classification Result</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Model:</span>
                    <span className="text-xs font-mono font-semibold text-brand-300">{result.model_used}</span>
                  </div>
                </div>
                <ExportReportMenu
                  moduleType="classify"
                  data={{ ...result, text: inputText }}
                  label="Export Result"
                  buttonSize="sm"
                  includeJson={true}
                  customFilename={`classify_result_${Date.now()}`}
                />
              </div>

              {/* Primary Category Banner */}
              <div className={`p-5 rounded-xl border ${resultStyle.border} ${resultStyle.bg} flex items-center justify-between`}>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Predicted Category
                  </span>
                  <span className={`text-2xl font-black ${resultStyle.text} block mt-0.5`}>
                    {result.predicted_category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Confidence
                  </span>
                  <span className="text-2xl font-black text-white font-mono block mt-0.5">
                    {(result.confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Probability Distribution Meters */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Probability Distribution (All 5 Domains)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Calibrated sum = 100%</span>
                </div>

                <div className="space-y-3">
                  {canonicalCategories.map((cat) => {
                    const prob = result.probabilities?.[cat] ?? 0.0;
                    const pct = (prob * 100).toFixed(2);
                    const isWinner = cat.toLowerCase() === result.predicted_category.toLowerCase();
                    const style = getCategoryStyle(cat);

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold flex items-center gap-1.5 ${isWinner ? 'text-white' : 'text-slate-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                            <span>{cat}</span>
                            {isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </span>
                          <span className="font-mono text-slate-200 font-semibold">{pct}%</span>
                        </div>
                        {/* Meter Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(Number(pct), 1.5)}%`,
                              backgroundColor: isWinner ? style.hex : '#27342F'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Verification Metadata */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>ID: {result.prediction_id}</span>
                <span>{result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : 'Recorded in DB'}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-dashed border-slate-700/60 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">Ready for Live Classification</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Enter an article or choose a preset test button above, then click "Classify Article" to compute actual category probabilities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
