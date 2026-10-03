import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  RefreshCw,
  Clock,
  Check,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  History,
  ShieldCheck,
  X
} from 'lucide-react';
import { submitHumanReview, triggerRetrain, getRetrainStatus, getReviewStats } from '../services/api';
import { getCategoryStyle } from '../utils/categoryColors';

const CANONICAL_CATEGORIES = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

export default function HumanReviewWidget({
  predictionId,
  articleSnippet,
  predictedCategory,
  confidence,
  modelUsed = 'Logistic Regression',
  reviewStats: initialReviewStats,
  onReviewSubmitted
}) {
  // Human Review & Correction State
  const [reviewMode, setReviewMode] = useState(null); // null | 'wrong'
  const [selectedCorrection, setSelectedCorrection] = useState('Business');
  const [submitting, setSubmitting] = useState(false);
  const [submissionConfirmation, setSubmissionConfirmation] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  // Background Retraining & Queue State
  const [retrainStatus, setRetrainStatus] = useState(null);
  const [countdown, setCountdown] = useState(180);
  const [isTriggering, setIsTriggering] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState(null);

  // Correction History State
  const [reviewStats, setReviewStats] = useState(initialReviewStats || null);

  // Default selected correction to an alternative category when prediction changes
  useEffect(() => {
    if (predictedCategory) {
      const alt = CANONICAL_CATEGORIES.find(
        (c) => c.toLowerCase() !== predictedCategory.toLowerCase()
      ) || 'Business';
      setSelectedCorrection(alt);
      setSubmissionConfirmation(null);
      setSubmissionError(null);
      setReviewMode(null);
    }
  }, [predictedCategory, predictionId]);

  // Fetch Retrain Status from Backend
  const fetchStatus = async () => {
    try {
      const data = await getRetrainStatus();
      setRetrainStatus(data);
      if (data && data.seconds_until_next != null) {
        setCountdown(data.seconds_until_next);
      }
    } catch (err) {
      console.error('Failed to fetch retrain status:', err);
    }
  };

  // Fetch Review History from SQLite
  const fetchReviewHistory = async () => {
    try {
      const stats = await getReviewStats();
      setReviewStats(stats);
    } catch (err) {
      console.error('Failed to fetch review stats:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchReviewHistory();
  }, []);

  // Update reviewStats when parent passes updated props
  useEffect(() => {
    if (initialReviewStats) {
      setReviewStats(initialReviewStats);
    }
  }, [initialReviewStats]);

  // 1-second dynamic countdown ticker based on backend schedule
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic status polling: fast (2s) when retraining, moderate (8s) when idle
  useEffect(() => {
    const isRunning = retrainStatus?.status === 'running' || retrainStatus?.is_running;
    const intervalMs = isRunning ? 2000 : 8000;
    const interval = setInterval(() => {
      fetchStatus();
      fetchReviewHistory();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [retrainStatus?.status, retrainStatus?.is_running]);

  // User confirms model prediction as CORRECT (STATUS = VERIFIED)
  const handleConfirmCorrect = async () => {
    if (!predictedCategory) return;

    setSubmitting(true);
    setSubmissionError(null);

    try {
      await submitHumanReview({
        prediction_id: predictionId || `MANUAL_${Date.now().toString().slice(-6)}`,
        article_snippet: articleSnippet || 'Analyzed News Article',
        model_predicted_category: predictedCategory,
        confidence: confidence || 0.85,
        is_correct: true,
        user_corrected_category: predictedCategory,
        status: 'VERIFIED'
      });

      setSubmissionConfirmation({
        type: 'VERIFIED',
        previous: predictedCategory,
        corrected: predictedCategory,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      setReviewMode(null);

      if (onReviewSubmitted) onReviewSubmitted();
      await Promise.all([fetchStatus(), fetchReviewHistory()]);
    } catch (err) {
      console.error('Verification failed:', err);
      const detail = err.response?.data?.detail || err.message;
      setSubmissionError(detail ? `Unable to submit verification: ${detail}` : 'Unable to submit verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // User marks model prediction as WRONG and submits corrected category (STATUS = QUEUED)
  const handleCorrectionSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!predictedCategory) return;

    setSubmitting(true);
    setSubmissionError(null);

    try {
      await submitHumanReview({
        prediction_id: predictionId || `MANUAL_${Date.now().toString().slice(-6)}`,
        article_snippet: articleSnippet || 'Analyzed News Article',
        model_predicted_category: predictedCategory,
        confidence: confidence || 0.85,
        is_correct: false,
        user_corrected_category: selectedCorrection,
        status: 'QUEUED'
      });

      setSubmissionConfirmation({
        type: 'QUEUED',
        previous: predictedCategory,
        corrected: selectedCorrection,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      setReviewMode(null);

      if (onReviewSubmitted) onReviewSubmitted();
      await Promise.all([fetchStatus(), fetchReviewHistory()]);
    } catch (err) {
      console.error('Correction submission failed:', err);
      const detail = err.response?.data?.detail || err.message;
      setSubmissionError(detail ? `Unable to submit correction: ${detail}` : 'Unable to submit correction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Immediate Non-blocking Retrain Trigger
  const handleRetrainNow = async () => {
    setIsTriggering(true);
    setRetrainMsg(null);
    try {
      const res = await triggerRetrain();
      if (res.status === 'started') {
        setRetrainStatus((prev) => ({
          ...prev,
          status: 'running',
          is_running: true,
          progress: 5,
          current_step: 'Retraining started in background...'
        }));
        setRetrainMsg('Background retraining pipeline triggered.');
        setTimeout(fetchStatus, 800);
      } else if (res.status === 'already_running') {
        setRetrainMsg('Retraining is already in progress.');
      }
    } catch (err) {
      setRetrainMsg('Retraining request failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsTriggering(false);
    }
  };

  // Format seconds to MM:SS
  const formatCountdown = (secs) => {
    const total = Math.max(0, secs != null ? secs : 180);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isRunning = retrainStatus?.status === 'running' || retrainStatus?.is_running;
  const progress = retrainStatus?.progress || 0;
  const currentStep = retrainStatus?.current_step || 'Idle';
  const models = retrainStatus?.models || {
    naive_bayes: 'ready',
    logistic_regression: 'ready',
    calibrated_svm: 'ready'
  };

  const pendingCount = retrainStatus?.pending_corrections || 0;
  const queueLabel = isRunning
    ? 'Model retraining in progress...'
    : retrainStatus?.status === 'completed'
    ? 'Retraining completed'
    : retrainStatus?.status === 'failed'
    ? 'Retraining failed — see details'
    : pendingCount > 0
    ? `${pendingCount} correction${pendingCount > 1 ? 's' : ''} pending retraining`
    : 'Correction queue is empty';

  // Real stored review and correction records (zero dummy data)
  const recentReviews = reviewStats?.recent_reviews || [];

  const isAnalyzed = Boolean(predictedCategory);
  const currentPredStyle = isAnalyzed ? getCategoryStyle(predictedCategory) : null;
  const prodModel = retrainStatus?.production_model || modelUsed || 'Logistic Regression';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20 shadow">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                HUMAN CORRECTION LOOP
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active Learning
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Continuous validation, correction audit trail & automatic 3-minute retraining
            </p>
          </div>
        </div>

        {/* Telemetry pill */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <span>Reviewed: <strong className="text-white">{reviewStats?.predictions_reviewed || 0}</strong></span>
          <span>•</span>
          <span>Verified: <strong className="text-emerald-400">{reviewStats?.agreements || 0}</strong></span>
          <span>•</span>
          <span>Queued: <strong className="text-amber-400">{reviewStats?.queued || 0}</strong></span>
          <span>•</span>
          <span>Applied: <strong className="text-teal-400">{reviewStats?.applied || 0}</strong></span>
        </div>
      </div>

      {/* 2. Active vs Inactive Prediction Feedback Area */}
      {isAnalyzed ? (
        /* ACTIVE STATE: Connected directly to current analyzed article */
        <div className="rounded-xl bg-slate-950 border border-slate-800/90 p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              Current Production Model Prediction
            </span>
            <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
              Live Target
            </span>
          </div>

          {/* 3 Metric Cards for Prediction */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Production Model</span>
              <span className="font-bold text-brand-300 text-sm block truncate" title={prodModel}>
                {prodModel}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Model Prediction</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${currentPredStyle.bg} ${currentPredStyle.text} border ${currentPredStyle.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${currentPredStyle.dot}`} />
                  <span>{predictedCategory}</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">CLASSIFICATION CONFIDENCE</span>
              <span className="font-bold text-white text-sm block font-mono">
                {confidence != null ? `${(confidence * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Snippet preview */}
          {articleSnippet && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 line-clamp-2 italic">
              "{articleSnippet}"
            </div>
          )}

          {/* Submission Confirmation Banner */}
          {submissionConfirmation ? (
            <div className={`p-4 rounded-xl border space-y-2 text-xs ${
              submissionConfirmation.type === 'VERIFIED'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-bold ${
                  submissionConfirmation.type === 'VERIFIED' ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {submissionConfirmation.type === 'VERIFIED'
                      ? 'Model prediction confirmed as correct.'
                      : 'Correction recorded and added to retraining queue.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmissionConfirmation(null)}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Review Again
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Model Prediction:</span>
                  <span className="font-bold text-white">{submissionConfirmation.previous}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Correct Category:</span>
                  <span className={`font-bold ${submissionConfirmation.type === 'VERIFIED' ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {submissionConfirmation.corrected}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Status:</span>
                  {submissionConfirmation.type === 'VERIFIED' ? (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ VERIFIED (No Retraining Needed)
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      QUEUED for Retraining
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Active Review Selection: [ CORRECT ]  [ WRONG ] */
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                    Verify Prediction Accuracy:
                  </span>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Confirm whether the model's prediction is correct or submit a ground-truth correction.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleConfirmCorrect}
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-950/40 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>CORRECT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewMode(reviewMode === 'wrong' ? null : 'wrong')}
                    disabled={submitting}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer border ${
                      reviewMode === 'wrong'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>WRONG</span>
                  </button>
                </div>
              </div>

              {/* Correction Form only appears when WRONG is selected */}
              {reviewMode === 'wrong' && (
                <form onSubmit={handleCorrectionSubmit} className="space-y-3 p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Select Ground Truth Category (Correct Category):
                      </label>
                      <select
                        value={selectedCorrection}
                        onChange={(e) => setSelectedCorrection(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:border-amber-500"
                      >
                        {CANONICAL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat} {cat.toLowerCase() === predictedCategory.toLowerCase() ? '(Current Prediction)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || selectedCorrection.toLowerCase() === predictedCategory.toLowerCase()}
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Queueing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Submit Correction (Queue)</span>
                        </>
                      )}
                    </button>
                  </div>
                  {selectedCorrection.toLowerCase() === predictedCategory.toLowerCase() && (
                    <p className="text-[10px] text-amber-400/80">
                      * Please select a category different from "{predictedCategory}" to record a correction, or click CORRECT above.
                    </p>
                  )}
                </form>
              )}

              {submissionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* INACTIVE STATE: When NO article has been analyzed yet */
        <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto border border-slate-700/60">
            <CheckCircle className="w-5 h-5 text-slate-400" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Human Correction Loop
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run an article analysis first to submit a correction.
          </p>
        </div>
      )}

      {/* 3. Real 3-Minute Background Retraining & Queue Status Card */}
      <div className="rounded-xl bg-slate-950 border border-slate-800/90 p-4 space-y-3 font-mono text-xs">
        {/* Row 1: Header + Queue Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 font-bold uppercase tracking-wider">AUTO RETRAINING STATUS</span>
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>3-MIN CYCLE ON</span>
            </div>
          </div>

          {/* Queue state indicator */}
          <span className="text-[11px] text-teal-300 font-bold">
            {queueLabel}
          </span>
        </div>

        {/* Row 2: Retraining Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-400 py-1">
          <div className="flex items-center justify-between">
            <span>Next retraining cycle:</span>
            <strong className={`font-bold ${countdown < 30 ? 'text-amber-400 animate-pulse' : 'text-teal-300'}`}>
              {isRunning ? 'Retraining now...' : formatCountdown(countdown)}
            </strong>
          </div>

          <div className="flex items-center justify-between">
            <span>Last retrained:</span>
            <strong className="text-white font-semibold">
              {retrainStatus?.last_completed_at ? `${retrainStatus.last_completed_at} UTC` : 'Initial Baseline'}
            </strong>
          </div>

          <div className="flex items-center justify-between">
            <span>Corrections queued:</span>
            <strong className={`font-bold ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {pendingCount}
            </strong>
          </div>

          <div className="flex items-center justify-between">
            <span>Total incorporated:</span>
            <strong className="text-emerald-400 font-bold">
              {retrainStatus?.corrections_used || 0}
            </strong>
          </div>

          <div className="flex items-center justify-between sm:col-span-2 pt-1.5 border-t border-slate-800/60">
            <span>Current Production Model:</span>
            <span className="text-brand-300 font-bold">
              {retrainStatus?.production_model || 'Logistic Regression'}
            </span>
          </div>

          {retrainStatus?.latest_candidate_model && (
            <div className="flex items-center justify-between sm:col-span-2 text-[10px]">
              <span className="text-slate-500">Latest Retrained Candidate:</span>
              <div className="flex items-center space-x-2">
                <span className="text-slate-300">{retrainStatus.latest_candidate_model}</span>
                <span className={`px-1.5 py-0.2 rounded font-bold ${
                  retrainStatus.promotion_status === 'PROMOTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {retrainStatus.promotion_status || 'RETAINED'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Active Retraining Progress Bar */}
        {isRunning && (
          <div className="space-y-1.5 pt-1 animate-fadeIn">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span className="text-teal-300 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />
                {currentStep}
              </span>
              <span className="text-white font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-brand-500 via-teal-400 to-emerald-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Row 3: Models Checklist */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Models</span>
          <div className="space-y-1 text-[11px]">
            {/* Model 1: Naive Bayes */}
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-2">
                {models.naive_bayes === 'training' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-400" />
                ) : (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
                <span className="text-white font-semibold">Naive Bayes</span>
              </div>
              <span className={`text-[10px] capitalize ${
                models.naive_bayes === 'training' ? 'text-brand-400' : 'text-emerald-400'
              }`}>
                {models.naive_bayes === 'training' ? 'Training...' : '✓'}
              </span>
            </div>

            {/* Model 2: Logistic Regression */}
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-2">
                {models.logistic_regression === 'training' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-400" />
                ) : (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
                <span className="text-white font-semibold">Logistic Regression</span>
              </div>
              <span className={`text-[10px] capitalize ${
                models.logistic_regression === 'training' ? 'text-brand-400' : 'text-emerald-400'
              }`}>
                {models.logistic_regression === 'training' ? 'Training...' : '✓'}
              </span>
            </div>

            {/* Model 3: Calibrated SVM */}
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-2">
                {models.calibrated_svm === 'training' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-400" />
                ) : (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
                <span className="text-white font-semibold">Calibrated SVM</span>
              </div>
              <span className={`text-[10px] capitalize ${
                models.calibrated_svm === 'training' ? 'text-brand-400' : 'text-emerald-400'
              }`}>
                {models.calibrated_svm === 'training' ? 'Training...' : '✓'}
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: [ RETRAIN NOW ] Button */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={handleRetrainNow}
            disabled={isRunning || isTriggering}
            className={`w-full py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow flex items-center justify-center space-x-2 ${
              isRunning || isTriggering
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white border border-brand-500/30 hover:shadow-brand-500/20 active:scale-[0.99] cursor-pointer'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning || isTriggering ? 'animate-spin text-brand-400' : ''}`} />
            <span>{isRunning ? 'Retraining Models In Background...' : 'RETRAIN NOW'}</span>
          </button>
        </div>

        {retrainMsg && (
          <p className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-center">
            {retrainMsg}
          </p>
        )}
      </div>

      {/* 4. Compact Recent Corrections History Table (Zero Fake Data) */}
      <div className="rounded-xl bg-slate-950 border border-slate-800/90 p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center space-x-2">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              Recent Corrections
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {reviewStats?.queued > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {reviewStats.queued} Queued
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-bold">
              {recentReviews.length} {recentReviews.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
        </div>

        {recentReviews.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No human review records yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2 px-2.5">Article</th>
                  <th className="py-2 px-2.5">Model Prediction</th>
                  <th className="py-2 px-2.5">Correct Category</th>
                  <th className="py-2 px-2.5 text-center">Status</th>
                  <th className="py-2 px-2.5 text-right font-mono">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px]">
                {recentReviews.slice(0, 15).map((row, idx) => {
                  const origStyle = getCategoryStyle(row.predicted);
                  const newStyle = getCategoryStyle(row.corrected);
                  const dateStr = row.timestamp
                    ? new Date(row.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : 'Recent';

                  // Semantic Status Badge Rendering
                  const renderStatusBadge = (status) => {
                    const s = (status || 'QUEUED').toUpperCase();
                    if (s === 'VERIFIED') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                          <Check className="w-2.5 h-2.5" />
                          <span>VERIFIED</span>
                        </span>
                      );
                    }
                    if (s === 'APPLIED') {
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/30 font-mono">
                          APPLIED
                        </span>
                      );
                    }
                    if (s === 'FAILED') {
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">
                          FAILED
                        </span>
                      );
                    }
                    // Default: QUEUED (amber)
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                        QUEUED
                      </span>
                    );
                  };

                  return (
                    <tr
                      key={row.id ? row.id : (row.prediction_id ? `${row.prediction_id}-${idx}` : idx)}
                      className="hover:bg-slate-900/60 transition"
                    >
                      <td className="py-2.5 px-2.5 text-slate-200 max-w-[200px]">
                        <p className="truncate leading-relaxed text-slate-300 font-sans" title={row.article_snippet}>
                          {row.article_snippet}
                        </p>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${origStyle.bg} ${origStyle.text} border ${origStyle.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${origStyle.dot}`} />
                          <span>{row.predicted}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${newStyle.bg} ${newStyle.text} border ${newStyle.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${newStyle.dot}`} />
                          <span>{row.corrected}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {renderStatusBadge(row.status)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-400 font-mono text-[10px]">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
