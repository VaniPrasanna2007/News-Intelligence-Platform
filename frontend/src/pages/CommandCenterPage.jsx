import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ArticleInputConsole from '../components/ArticleInputConsole';
import ThreeModelComparisonTable from '../components/ThreeModelComparisonTable';
import ExportReportMenu from '../components/ExportReportMenu';
import { getCategoryStyle } from '../utils/categoryColors';

const CANONICAL_DOMAINS = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

export default function CommandCenterPage({
  analysisData,
  setAnalysisData,
  onAnalysisStart,
  onAnalysisSuccess,
  onAnalysisError,
  initialMode = 'text'
}) {
  const [loading, setLoading] = useState(false);

  // Progressive analysis pipeline step
  const getPipelineStep = () => {
    if (loading) return { step: 2, label: 'Computing Model Probabilities...' };
    if (analysisData) return { step: 3, label: 'Classification Complete' };
    return { step: 1, label: 'Ready for Article Analysis' };
  };

  const currentStep = getPipelineStep();
  const isAnalyzed = Boolean(analysisData && analysisData.predicted_category);
  const categoryStyle = isAnalyzed ? getCategoryStyle(analysisData.predicted_category) : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Intelligence Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            COMMAND CENTER
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-dimensional news telemetry: Category probability distribution, Three-model prediction, and Reference verification.
          </p>
        </div>

        {/* Progressive Pipeline Stage Indicator */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
          <span className={`w-2 h-2 rounded-full ${isAnalyzed ? 'bg-emerald-400' : 'bg-brand-400 animate-pulse'}`}></span>
          <span className="text-slate-400 font-medium">Pipeline:</span>
          <span className="text-slate-200 font-mono font-bold">{currentStep.label}</span>
          {isAnalyzed && (
            <ExportReportMenu
              moduleType="command_center"
              data={analysisData}
              label="Export Report"
              buttonSize="sm"
              includeJson={true}
              className="ml-3"
            />
          )}
        </div>
      </div>

      {/* =========================================================
          1. ARTICLE INPUT / ANALYSIS AREA
          ========================================================= */}
      <div className="space-y-6">
        <ArticleInputConsole
          onAnalysisStart={onAnalysisStart}
          onAnalysisError={onAnalysisError}
          onAnalysisComplete={(data) => {
            setAnalysisData(data);
            if (onAnalysisSuccess) onAnalysisSuccess(data);
          }}
          loading={loading}
          setLoading={setLoading}
          analysisData={analysisData}
          onResetAnalysis={() => setAnalysisData(null)}
          initialMode={initialMode}
        />

        {/* =========================================================
            2. PREDICTION RESULTS AREA
            ========================================================= */}
        {isAnalyzed ? (
          <div className={`p-6 rounded-2xl border ${categoryStyle.border} ${categoryStyle.bg} shadow-xl relative overflow-hidden transition-all duration-300 space-y-4`}>
            {/* If analyzed from an existing database article, show Dataset Label vs Model Prediction */}
            {analysisData?.dataset_category && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Corpus Evaluation & Verification
                  </span>
                  {analysisData.predicted_category.toLowerCase() === analysisData.dataset_category.toLowerCase() ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Prediction matches dataset label</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Prediction differs from dataset label</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">DATASET CATEGORY</span>
                    <span className={`font-bold text-sm mt-0.5 block ${getCategoryStyle(analysisData.dataset_category).text}`}>{analysisData.dataset_category}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">MODEL PREDICTION</span>
                    <span className={`font-bold text-sm mt-0.5 block ${categoryStyle.text}`}>{analysisData.predicted_category}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">CONFIDENCE</span>
                    <span className="font-bold text-white text-sm font-mono mt-0.5 block">{(analysisData.confidence * 100).toFixed(2)}%</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">MATCH STATUS</span>
                    <span className="font-bold text-xs mt-1 block">
                      {analysisData.predicted_category.toLowerCase() === analysisData.dataset_category.toLowerCase() ? (
                        <span className="text-emerald-400">Match Verified</span>
                      ) : (
                        <span className="text-amber-400">Differs</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Domain Verdict Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/40 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  ARTICLE CLASSIFICATION
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-2xl font-black ${categoryStyle.text}`}>
                    {analysisData.predicted_category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    via {analysisData.model_used || 'Calibrated SVM'}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  CLASSIFICATION CONFIDENCE
                </span>
                <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                  {(analysisData.confidence * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 5-Domain Probability Meters */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                Calibrated 5-Domain Probability Distribution
              </span>
              <div className="grid grid-cols-5 gap-2">
                {CANONICAL_DOMAINS.map((cat) => {
                  const prob = analysisData.probabilities?.[cat] || 0.0;
                  const pct = (prob * 100).toFixed(1);
                  const isTop = cat.toLowerCase() === analysisData.predicted_category.toLowerCase();
                  const catStyle = getCategoryStyle(cat);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className={`font-semibold truncate flex items-center gap-1 ${isTop ? 'text-white' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                          <span>{cat}</span>
                        </span>
                        <span className="font-mono text-slate-300">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(Number(pct), 3)}%`,
                            backgroundColor: isTop ? catStyle.hex : '#27342F'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contributing Words / Classification Signals */}
            {analysisData?.contributing_words && analysisData.contributing_words.length > 0 && (
              <div className="pt-3 border-t border-slate-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                  Article Keywords & Top Classification Signals
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisData.contributing_words.slice(0, 8).map((word, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono font-semibold text-slate-200"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-lg relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                  ARTICLE CLASSIFICATION
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-bold text-slate-400">
                    Not available
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                    Waiting for article
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                  CLASSIFICATION CONFIDENCE
                </span>
                <span className="text-xl font-bold font-mono text-slate-500 mt-0.5 block">
                  Not available
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 font-mono">
                Calibrated 5-Domain Probability Distribution (Available after analysis)
              </span>
              <div className="grid grid-cols-5 gap-2">
                {CANONICAL_DOMAINS.map((cat) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-semibold text-slate-500 truncate">{cat}</span>
                      <span className="font-mono text-slate-600">—</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/60">
                      <div className="h-full bg-slate-800 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              Mathematical feature weights and domain posterior probabilities will be computed upon running classification.
            </div>
          </div>
        )}

        {/* =========================================================
            THREE-MODEL PREDICTION COMPARISON TABLE
            ========================================================= */}
        <ThreeModelComparisonTable analysisData={analysisData} />
      </div>
    </div>
  );
}
