import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  RefreshCw,
  Cpu,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import {
  getRecentPredictions,
  getReviewStats,
  submitHumanReview,
  getRetrainStatus
} from '../services/api';
import { getCategoryStyle } from '../utils/categoryColors';
import ExportReportMenu from '../components/ExportReportMenu';

const CANONICAL_CATEGORIES = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

export default function HistoryPage() {
  const [predictions, setPredictions] = useState([]);
  const [selectedPredId, setSelectedPredId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Business');
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [retrainStatus, setRetrainStatus] = useState(null);
  const [countdown, setCountdown] = useState(180);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(null); // null | 'wrong'
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load predictions and human reviews
  const loadData = async () => {
    setLoading(true);
    try {
      const [predsData, statsData, retrainData] = await Promise.all([
        getRecentPredictions(50),
        getReviewStats(),
        getRetrainStatus()
      ]);

      const predsList = predsData || [];
      setPredictions(predsList);

      if (predsList.length > 0) {
        setSelectedPredId((prev) => {
          if (prev && predsList.some((p) => p.prediction_id === prev)) {
            return prev;
          }
          const defaultPred = predsList[0];
          const currentCat = defaultPred.predicted_category;
          const altCat = CANONICAL_CATEGORIES.find((c) => c.toLowerCase() !== currentCat.toLowerCase()) || 'Business';
          setSelectedCategory(altCat);
          return defaultPred.prediction_id;
        });
      }

      setReviews(statsData?.recent_reviews || []);
      setReviewStats(statsData || null);
      setRetrainStatus(retrainData);
      if (retrainData?.seconds_until_next != null) {
        setCountdown(retrainData.seconds_until_next);
      }
    } catch (err) {
      console.error('Failed to load review data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1-second countdown ticker synced with 3-minute retraining schedule
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          getRetrainStatus().then((data) => {
            setRetrainStatus(data);
            if (data?.seconds_until_next != null) setCountdown(data.seconds_until_next);
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds into MM:SS
  const formatCountdown = (secs) => {
    const total = Math.max(0, secs != null ? secs : 180);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Find currently selected prediction object
  const selectedPrediction = predictions.find((p) => p.prediction_id === selectedPredId) || predictions[0];

  // Map of prediction_id -> model_used from real prediction events
  const modelMap = {};
  predictions.forEach((p) => {
    if (p.prediction_id) modelMap[p.prediction_id] = p.model_used;
  });

  // Filter for correction records
  const corrections = reviews.filter(
    (r) => !r.is_correct || r.status === 'QUEUED' || r.status === 'APPLIED'
  );

  // Handle article change
  const handleSelectPrediction = (predId) => {
    setSelectedPredId(predId);
    setReviewMode(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    const chosen = predictions.find((p) => p.prediction_id === predId);
    if (chosen) {
      const currentCat = chosen.predicted_category;
      const altCat = CANONICAL_CATEGORIES.find((c) => c.toLowerCase() !== currentCat.toLowerCase()) || 'Business';
      setSelectedCategory(altCat);
    }
  };

  // User confirms model prediction as CORRECT (STATUS = VERIFIED, NO RETRAINING)
  const handleConfirmCorrect = async () => {
    if (!selectedPrediction) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await submitHumanReview({
        prediction_id: selectedPrediction.prediction_id,
        article_snippet: selectedPrediction.headline || (selectedPrediction.article_text || '').slice(0, 250),
        model_predicted_category: selectedPrediction.predicted_category,
        confidence: selectedPrediction.confidence || 0.8,
        is_correct: true,
        user_corrected_category: selectedPrediction.predicted_category,
        status: 'VERIFIED'
      });

      setSuccessMsg(
        `Prediction verified as CORRECT! Status: VERIFIED. Saved to SQLite audit trail. (No retraining needed).`
      );
      setReviewMode(null);

      // Refresh reviews and stats from SQLite
      const [statsData, retrainData] = await Promise.all([
        getReviewStats(),
        getRetrainStatus()
      ]);
      setReviews(statsData?.recent_reviews || []);
      setReviewStats(statsData || null);
      setRetrainStatus(retrainData);
    } catch (err) {
      console.error('Review verification failed:', err);
      setErrorMsg('Failed to verify prediction. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // User marks model prediction as WRONG and submits corrected category (STATUS = QUEUED)
  const handleSubmitCorrection = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPrediction) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await submitHumanReview({
        prediction_id: selectedPrediction.prediction_id,
        article_snippet: selectedPrediction.headline || (selectedPrediction.article_text || '').slice(0, 250),
        model_predicted_category: selectedPrediction.predicted_category,
        confidence: selectedPrediction.confidence || 0.8,
        is_correct: false,
        user_corrected_category: selectedCategory,
        status: 'QUEUED'
      });

      setSuccessMsg(
        `Correction saved! Status: QUEUED. Enqueued in SQLite for the next automatic 3-minute retraining cycle.`
      );
      setReviewMode(null);

      // Refresh reviews and stats from SQLite
      const [statsData, retrainData] = await Promise.all([
        getReviewStats(),
        getRetrainStatus()
      ]);
      setReviews(statsData?.recent_reviews || []);
      setReviewStats(statsData || null);
      setRetrainStatus(retrainData);
    } catch (err) {
      console.error('Correction submission failed:', err);
      setErrorMsg('Failed to submit correction. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const predStyle = getCategoryStyle(selectedPrediction?.predicted_category);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-wider">
            Review & Correction History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop validation console and audit trail for model predictions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ExportReportMenu
            moduleType="history"
            data={{ predictions, reviews, corrections, retrainStatus }}
            label="Export History"
            buttonSize="sm"
            includeJson={true}
            customFilename={`human_review_history_${Date.now()}`}
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
            title="Refresh real-time database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          HUMAN CORRECTION LOOP
          ========================================================= */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Human Correction Loop</h3>
              <p className="text-[10px] text-slate-400 font-mono">Select an article prediction to audit or correct</p>
            </div>
          </div>

          {predictions.length > 0 && (
            <div className="w-full sm:w-72">
              <select
                value={selectedPredId}
                onChange={(e) => handleSelectPrediction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 truncate font-mono"
              >
                {predictions.map((p) => (
                  <option key={p.prediction_id} value={p.prediction_id}>
                    [{p.prediction_id.slice(-6)}] {(p.headline || p.article_text).slice(0, 32)}... ({p.predicted_category})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selected Article Form */}
        {selectedPrediction ? (
          <div className="space-y-4">
            {/* Article */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Article:
              </label>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                {selectedPrediction.headline && (
                  <p className="text-sm font-semibold text-white leading-snug">
                    {selectedPrediction.headline}
                  </p>
                )}
                <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedPrediction.article_text}
                </p>
              </div>
            </div>

            {/* Prediction Details & Audit Actions */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Model Prediction */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Model Prediction:
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${predStyle.bg} ${predStyle.text} border ${predStyle.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${predStyle.dot}`} />
                      <span>{selectedPrediction.predicted_category}</span>
                    </span>
                    {selectedPrediction.model_used && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({selectedPrediction.model_used})
                      </span>
                    )}
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Confidence:
                  </label>
                  <div className="font-mono text-sm font-bold text-white">
                    {(selectedPrediction.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Action Choices: Option A (CORRECT) vs Option B (WRONG) */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-300 mb-2.5">
                  Is this model classification correct?
                </div>

                {reviewMode !== 'wrong' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Option A: CORRECT */}
                    <button
                      type="button"
                      onClick={handleConfirmCorrect}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs uppercase tracking-wider transition active:scale-[0.99] disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>CORRECT (VERIFIED)</span>
                    </button>

                    {/* Option B: WRONG */}
                    <button
                      type="button"
                      onClick={() => setReviewMode('wrong')}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold text-xs uppercase tracking-wider transition active:scale-[0.99] disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-amber-400" />
                      <span>WRONG (RECLASSIFY)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Option B: Select Correct Category
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewMode(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 uppercase font-mono cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:border-amber-500"
                      >
                        {CANONICAL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleSubmitCorrection}
                        disabled={submitting}
                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Queuing in SQLite...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>SUBMIT CORRECTION (QUEUE)</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Will be saved with status <span className="text-amber-400 font-bold">QUEUED</span> and trained in the next 3-minute retraining cycle.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Success & Error Notifications */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            No live predictions available to review. Run an article classification in Command Center to begin.
          </div>
        )}

        {/* Automatic 3-minute Retraining Connection Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">Automatic 3-Minute Retraining:</span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Next Cycle: <strong className="text-teal-300">{formatCountdown(countdown)}</strong></span>
            <span>•</span>
            <span>Corrections Queued: <strong className="text-amber-400">{reviewStats?.queued ?? 0}</strong></span>
          </div>
        </div>
      </section>

      {/* =========================================================
          REVIEW & CORRECTION AUDIT TRAIL
          ========================================================= */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Human Review & Correction History</h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Audit log of human reviews and corrections persisted to SQLite (<code className="text-slate-300">human_reviews</code>)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(reviewStats?.queued || 0) > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {reviewStats.queued} Queued
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {reviews.length} {reviews.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            No human review records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Article</th>
                  <th className="py-2.5 px-3 w-36">Model Prediction</th>
                  <th className="py-2.5 px-3 w-36">Human Action / Category</th>
                  <th className="py-2.5 px-3 w-36">Model</th>
                  <th className="py-2.5 px-3 w-36 font-mono">Timestamp</th>
                  <th className="py-2.5 px-3 w-28 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reviews.map((row, idx) => {
                  const origStyle = getCategoryStyle(row.predicted);
                  const isVerified = (row.status || '').toUpperCase() === 'VERIFIED' || row.is_correct;
                  const newStyle = getCategoryStyle(row.corrected || row.predicted);
                  const modelName = modelMap[row.prediction_id] || row.model_used || 'Production Model';
                  const dateStr = row.timestamp
                    ? new Date(row.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : 'Recent';

                  // Semantic Status Badge Renderer
                  const renderStatusBadge = (status) => {
                    const s = (status || 'QUEUED').toUpperCase();
                    if (s === 'VERIFIED') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                          <Check className="w-2.5 h-2.5" />
                          <span>VERIFIED</span>
                        </span>
                      );
                    }
                    if (s === 'APPLIED') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/30 font-mono">
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>APPLIED</span>
                        </span>
                      );
                    }
                    if (s === 'FAILED') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>FAILED</span>
                        </span>
                      );
                    }
                    // Default: QUEUED (amber)
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>QUEUED</span>
                      </span>
                    );
                  };

                  return (
                    <tr
                      key={row.id ? row.id : (row.prediction_id ? `${row.prediction_id}-${idx}` : idx)}
                      className="hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3 px-3 text-slate-200 max-w-xs">
                        <p className="line-clamp-2 leading-relaxed text-slate-300">
                          {row.article_snippet}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${origStyle.bg} ${origStyle.text} border ${origStyle.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${origStyle.dot}`} />
                          <span>{row.predicted}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <Check className="w-3 h-3" />
                            <span>Confirmed ({row.predicted})</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${newStyle.bg} ${newStyle.text} border ${newStyle.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${newStyle.dot}`} />
                            <span>{row.corrected}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <Cpu className="w-3 h-3 text-brand-400" />
                          <span>{modelName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {renderStatusBadge(row.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
