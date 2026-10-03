import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CheckCircle2,
  Layers,
  AlertCircle
} from 'lucide-react';
import ArticleInputConsole from '../components/ArticleInputConsole';
import NewsDNAVisualizer from '../components/NewsDNAVisualizer';
import NoveltyRadialGauge from '../components/NoveltyRadialGauge';
import ArticleStructureCard from '../components/ArticleStructureCard';
import HumanReviewWidget from '../components/HumanReviewWidget';
import IntelligenceReportModal from '../components/IntelligenceReportModal';
import ExportReportMenu from '../components/ExportReportMenu';
import ThreeModelComparisonTable from '../components/ThreeModelComparisonTable';
import { getCategoryStyle } from '../utils/categoryColors';

const CANONICAL_DOMAINS = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];

export default function CommandCenterPage({
  analysisData,
  setAnalysisData,
  constellationData,
  reviewStats,
  onReviewSubmitted,
  onAnalysisStart,
  onAnalysisSuccess,
  onAnalysisError,
  initialMode = 'text',
  activeSecondaryTab: propActiveSecondaryTab,
  setActiveSecondaryTab: propSetActiveSecondaryTab
}) {
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [localActiveSecondaryTab, setLocalActiveSecondaryTab] = useState('01');
  const rawActiveTab = (propActiveSecondaryTab !== undefined && propActiveSecondaryTab !== null) ? propActiveSecondaryTab : localActiveSecondaryTab;
  const activeSecondaryTab = (rawActiveTab === '02' || rawActiveTab === '05') ? '02' : '01';
  const setActiveSecondaryTab = (tab) => {
    const normalizedTab = (tab === '02' || tab === '05') ? '02' : '01';
    if (propSetActiveSecondaryTab) {
      propSetActiveSecondaryTab(normalizedTab);
    } else {
      setLocalActiveSecondaryTab(normalizedTab);
    }
  };

  // Progressive analysis pipeline step
  const getPipelineStep = () => {
    if (loading) return { step: 2, label: 'Computing Multi-Signal Representation...' };
    if (analysisData) return { step: 5, label: 'Intelligence Pipeline Complete' };
    return { step: 1, label: 'Ready for Article Analysis' };
  };

  const currentStep = getPipelineStep();
  const dna = analysisData?.news_dna || null;
  const isAnalyzed = Boolean(analysisData && analysisData.predicted_category);
  const categoryStyle = isAnalyzed ? getCategoryStyle(analysisData.predicted_category) : null;

  const secondaryModules = [
    {
      id: '01',
      num: '01',
      label: 'Article Intelligence',
      shortLabel: 'Article Intelligence',
      icon: FileText,
      description: 'Syntactic structure, sentence complexity & headline alignment'
    },
    {
      id: '02',
      num: '02',
      label: 'Human Correction Loop + Auto Retraining',
      shortLabel: 'Human Correction Loop',
      icon: CheckCircle2,
      description: 'Human review, correction audit & automated retraining status'
    }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Intelligence Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            COMMAND CENTER
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-dimensional news telemetry: Category probability distribution, News DNA, Semantic clustering, and Novelty calculation.
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
              onViewPreview={() => setShowReportModal(true)}
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
            2. PREDICTION / INTELLIGENCE RESULTS AREA
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
                    via {analysisData.model_used || 'Logistic Regression'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    CLASSIFICATION CONFIDENCE
                  </span>
                  <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                    {(analysisData.confidence * 100).toFixed(2)}%
                  </span>
                </div>

                {/* Shortcut to Human Correction Loop (Secondary Module 02) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSecondaryTab('02');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-brand-500 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Human Correction (02) →</span>
                </button>
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

            {/* Classification Signals */}
            {dna?.classification_signals && dna.classification_signals.length > 0 && (
              <div className="pt-3 border-t border-slate-700/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                  Article Keywords & Top Classification Signals
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dna.classification_signals.slice(0, 8).map((sig, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono"
                    >
                      <span className="font-semibold text-slate-200">{sig.term}</span>
                      <span className="text-brand-400 text-[10px]">{(sig.weight * 100).toFixed(1)}%</span>
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
              Mathematical feature weights and domain posterior probabilities will be computed upon running intelligence analysis.
            </div>
          </div>
        )}

        {/* =========================================================
            THREE-MODEL PREDICTION COMPARISON TABLE
            ========================================================= */}
        <ThreeModelComparisonTable analysisData={analysisData} />
      </div>

      {/* =========================================================
          3. SECONDARY MODULES (WORKSTATIONS)
          ========================================================= */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Secondary Modules
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30">
                  2 Modules
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Article Intelligence and Human Correction Loop + Auto Retraining
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 font-mono">Active:</span>
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {secondaryModules.find((m) => m.id === activeSecondaryTab)?.label || 'Article Intelligence'}
            </span>
            <ExportReportMenu
              moduleType="command_center"
              data={analysisData}
              label="Export Workstation"
              buttonSize="sm"
              includeJson={true}
              onViewPreview={() => setShowReportModal(true)}
              className="ml-2"
            />
          </div>
        </div>

        {/* 2 Workstation Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {secondaryModules.map((m) => {
            const Icon = m.icon;
            const isActive = activeSecondaryTab === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveSecondaryTab(m.id)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-brand-500/15 border-brand-500/50 text-white shadow-lg shadow-brand-950/40 ring-1 ring-brand-500/30'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition ${
                      isActive
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 group-hover:text-brand-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {m.num}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">{m.label}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Module Content */}
        <div className="pt-2">
          {/* Module 01: Article Intelligence */}
          {activeSecondaryTab === '01' && (
            <div className="space-y-6 animate-fadeIn">
              <ArticleStructureCard
                structure={dna?.article_structure}
                alignment={dna?.headline_alignment}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <NewsDNAVisualizer dna={dna} />
                <NoveltyRadialGauge novelty={dna?.novelty} />
              </div>
            </div>
          )}

          {/* Module 02: Human Correction Loop + Auto Retraining */}
          {activeSecondaryTab === '02' && (
            <div className="space-y-6 animate-fadeIn">
              <HumanReviewWidget
                predictionId={analysisData?.prediction_id}
                articleSnippet={analysisData?.news_dna?.headline || analysisData?.headline || analysisData?.text?.slice(0, 200)}
                predictedCategory={analysisData?.predicted_category}
                confidence={analysisData?.confidence}
                modelUsed={analysisData?.model_used || analysisData?.production_model || 'Logistic Regression'}
                reviewStats={reviewStats}
                onReviewSubmitted={onReviewSubmitted}
              />
            </div>
          )}
        </div>
      </section>

      {/* Intelligence Report Export Modal */}
      {showReportModal && isAnalyzed && (
        <IntelligenceReportModal
          reportData={analysisData}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
