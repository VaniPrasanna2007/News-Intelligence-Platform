import React from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { getCategoryStyle, CANONICAL_DOMAINS } from '../utils/categoryColors';

const MODELS_CONFIG = [
  { id: 'Naive Bayes', label: 'Naive Bayes', description: 'Multinomial Naive Bayes' },
  { id: 'Logistic Regression', label: 'Logistic Regression', description: 'Regularized Multinomial Logistic' },
  { id: 'Calibrated SVM', label: 'Calibrated SVM', description: 'Sigmoid Calibrated Linear SVC' }
];

export default function ThreeModelComparisonTable({ analysisData }) {
  const isAnalyzed = Boolean(
    analysisData &&
    (analysisData.models_predictions || analysisData.predicted_category)
  );

  const modelsPredictions = analysisData?.models_predictions || {};
  const productionModel = analysisData?.production_model || 'Calibrated SVM';
  const agreement = analysisData?.model_agreement || null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 transition-all">
      {/* Table Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>THREE-MODEL PREDICTION COMPARISON</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simultaneous multi-model inference across Naive Bayes, Logistic Regression, and Calibrated SVM
            </p>
          </div>
        </div>

        {isAnalyzed && (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 self-start sm:self-auto flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Unified TF-IDF Features</span>
          </span>
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th scope="col" className="py-3 px-4 font-semibold text-slate-500 w-56">
                {/* Row Heading Label Container - No separate Model column header */}
                <span className="sr-only">Model</span>
              </th>
              <th scope="col" className="py-3 px-4 font-semibold text-slate-300 w-44">
                Predicted Category
              </th>
              <th scope="col" className="py-3 px-4 font-semibold text-slate-300 w-28 text-right sm:text-left">
                Confidence
              </th>
              <th scope="col" className="py-3 px-4 font-semibold text-slate-300">
                Probability Breakdown
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {MODELS_CONFIG.map(({ id, label, description }) => {
              const isProduction =
                productionModel.toLowerCase().includes(id.toLowerCase()) ||
                id.toLowerCase().includes(productionModel.toLowerCase()) ||
                (productionModel === 'Support Vector Machine' && id === 'Calibrated SVM');

              const modelPred = modelsPredictions[id] || (
                // Fallback if model was the single model used in legacy payload
                analysisData?.model_used?.toLowerCase().includes(id.toLowerCase())
                  ? {
                      predicted_category: analysisData.predicted_category,
                      confidence: analysisData.confidence,
                      probabilities: analysisData.probabilities
                    }
                  : null
              );

              const predictedCategory = modelPred?.predicted_category || null;
              const confidence = modelPred?.confidence;
              const rawProbs = modelPred?.probabilities || {};

              // Prepare sorted probability list of all 5 categories
              const canonical = ['Business', 'Education', 'Entertainment', 'Sports', 'Technology'];
              const sortedProbabilities = canonical
                .map((cat) => ({
                  category: cat,
                  prob: rawProbs[cat] !== undefined ? rawProbs[cat] : (rawProbs[cat.toLowerCase()] || 0.0)
                }))
                .sort((a, b) => b.prob - a.prob);

              const catStyle = predictedCategory ? getCategoryStyle(predictedCategory) : null;

              return (
                <tr
                  key={id}
                  className={`transition ${
                    isProduction ? 'bg-slate-950/40' : 'hover:bg-slate-950/20'
                  }`}
                >
                  {/* Row Heading / Row Label */}
                  <th
                    scope="row"
                    className="py-4 px-4 text-left font-medium align-middle"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                      <span className="font-bold text-white text-xs whitespace-nowrap">
                        {label}
                      </span>
                      {isProduction && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/15 text-brand-300 border border-brand-500/40 uppercase tracking-wide shrink-0 self-start sm:self-auto">
                          <ShieldCheck className="w-3 h-3 text-brand-400" />
                          <span>PRODUCTION</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                      {description}
                    </span>
                  </th>

                  {/* Column 1: Predicted Category */}
                  <td className="py-4 px-4 align-middle">
                    {isAnalyzed && predictedCategory && catStyle ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-sm ${catStyle.badge}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${catStyle.dot}`} />
                        <span>{predictedCategory}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono italic">
                        —
                      </span>
                    )}
                  </td>

                  {/* Column 2: Confidence */}
                  <td className="py-4 px-4 align-middle">
                    {isAnalyzed && confidence !== undefined ? (
                      <div className="text-right sm:text-left">
                        <span className="text-xs font-mono font-bold text-white">
                          {(confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono italic text-right sm:text-left block">
                        —
                      </span>
                    )}
                  </td>

                  {/* Column 3: Probability Breakdown (All 5 canonical categories, sorted descending) */}
                  <td className="py-4 px-4 align-middle">
                    {isAnalyzed && modelPred ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {sortedProbabilities.map(({ category, prob }) => {
                          const pStyle = getCategoryStyle(category);
                          const pct = (prob * 100).toFixed(1);
                          const isTop = category.toLowerCase() === predictedCategory?.toLowerCase();

                          return (
                            <div
                              key={category}
                              className={`p-1.5 rounded-lg border text-[10px] space-y-1 transition ${
                                isTop
                                  ? `${pStyle.bg} ${pStyle.border}`
                                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="flex items-center gap-1 truncate font-semibold">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pStyle.dot}`} />
                                  <span className={isTop ? pStyle.text : 'text-slate-300'}>
                                    {category}
                                  </span>
                                </span>
                                <span className="font-mono text-slate-200 shrink-0 font-medium">
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.max(Number(pct), 2)}%`,
                                    backgroundColor: pStyle.hex
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono italic">
                        Available after analysis
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State Banner (Shown when no article has been analyzed) */}
      {!isAnalyzed && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-1">
          <p className="text-xs font-medium text-slate-400">
            Run an article analysis to compare all three models.
          </p>
          <p className="text-[11px] text-slate-600">
            Predictions, calibrated confidence percentages, and 5-category probability breakdowns will be generated simultaneously.
          </p>
        </div>
      )}

      {/* Summary Below Table (Line 1: Production Model | Line 2: Model Agreement) */}
      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Line 1 — Current Production Model */}
        <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium">Current Production Model:</span>
            <span className="font-bold text-white font-mono">{productionModel}</span>
            <span className="text-[10px] text-slate-500 font-mono">(Active serving baseline)</span>
          </div>
        </div>

        {/* Line 2 — Model Agreement */}
        <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2.5 rounded-xl">
          {isAnalyzed && agreement ? (
            <>
              {agreement.unanimous ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : agreement.majority ? (
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-medium">Model Agreement:</span>
                <span
                  className={`font-bold font-mono ${
                    agreement.unanimous
                      ? 'text-emerald-400'
                      : agreement.majority
                      ? 'text-teal-400'
                      : 'text-amber-400'
                  }`}
                >
                  {agreement.agreement_text}
                </span>
                {agreement.unanimous && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    High Consensus
                  </span>
                )}
                {agreement.majority && !agreement.unanimous && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    Majority
                  </span>
                )}
                {agreement.disagreement && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Divergence
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <HelpCircle className="w-4 h-4 text-slate-600 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Model Agreement:</span>
                <span className="text-slate-600 font-mono italic">
                  Awaiting article analysis
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
