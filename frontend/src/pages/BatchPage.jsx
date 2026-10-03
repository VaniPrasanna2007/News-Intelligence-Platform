import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Download, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { predictBatch, predictBatchUpload } from '../services/api';
import { getCategoryStyle } from '../utils/categoryColors';
import ExportReportMenu from '../components/ExportReportMenu';

const SAMPLE_BATCH = [
  { id: '1', text: "Apple reveals M4 Ultra chips for enterprise workstations and AI development clusters." },
  { id: '2', text: "Goldman Sachs raises equity market outlook citing stable corporate profit margins and lower interest rates." },
  { id: '3', text: "FIFA confirms venues and tournament schedules for the expanded 48-team World Cup." },
  { id: '4', text: "Stanford University launches tuition-free online artificial intelligence certificate program." },
  { id: '5', text: "Cannes Film Festival awards Palme d'Or to acclaimed historical drama feature film." },
  { id: '6', text: "Tesla launches autonomous robotaxi pilot testing in major metropolitan test zones." },
  { id: '7', text: "Premier League leaders survive late scare to maintain five-point lead at top of table." },
  { id: '8', text: "Department of Education introduces new literacy standards for elementary school districts." }
];

export default function BatchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await predictBatchUpload(formData);
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process CSV. Ensure file has valid text columns.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSampleBatch = async () => {
    setFileName('Sample Multi-Domain Dataset (8 Articles)');
    setError(null);
    setLoading(true);
    try {
      const data = await predictBatch(SAMPLE_BATCH);
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setError('Batch prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (results.length === 0) return;

    const headers = ['id', 'headline', 'predicted_category', 'confidence', 'prob_business', 'prob_education', 'prob_entertainment', 'prob_sports', 'prob_technology'];
    const rows = results.map((r) => [
      r.id,
      `"${(r.headline || '').replace(/"/g, '""')}"`,
      r.predicted_category,
      r.confidence,
      r.probabilities?.Business || 0,
      r.probabilities?.Education || 0,
      r.probabilities?.Entertainment || 0,
      r.probabilities?.Sports || 0,
      r.probabilities?.Technology || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `classified_news_batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-bold tracking-tight text-white">Batch Classification & CSV Processing</h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload any CSV file containing news headlines or text to classify bulk articles with calibrated probabilities.
        </p>
      </div>

      {/* Upload Box & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-800/30 hover:bg-slate-800/50 flex flex-col items-center justify-center space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Click or drag & drop CSV file to classify</p>
              <p className="text-xs text-slate-400 mt-0.5">Supports CSVs with headline, description, content, or text columns</p>
            </div>
            {fileName && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 text-brand-300 border border-slate-700">
                Selected: {fileName}
              </span>
            )}
          </div>
        </div>

        <div className="md:col-span-4 flex flex-col justify-between p-6 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Instant Sample Batch</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Don't have a CSV on hand? Load 8 curated multi-domain news articles to test batch classification instantly.
            </p>
            <button
              onClick={handleRunSampleBatch}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>Run Sample Batch (8 Articles)</span>
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/60">
              <ExportReportMenu
                moduleType="batch"
                data={{ results, model: 'Support Vector Machine' }}
                label="Export Results (PDF, Word, TXT, CSV)"
                buttonSize="md"
                includeCsv={true}
                includeJson={true}
                customFilename={`batch_classification_results_${Date.now()}`}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Batch Classification Results</h3>
              <p className="text-xs text-slate-400">Classified {results.length} articles using best model</p>
            </div>
            <ExportReportMenu
              moduleType="batch"
              data={{ results, model: 'Support Vector Machine' }}
              label="Export Results"
              buttonSize="sm"
              includeCsv={true}
              includeJson={true}
              customFilename={`batch_classification_results_${Date.now()}`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700/80 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3 w-16">#</th>
                  <th className="py-3 px-3">Headline / Article</th>
                  <th className="py-3 px-3 w-36">Predicted Category</th>
                  <th className="py-3 px-3 w-28">Confidence</th>
                  <th className="py-3 px-3 w-64">Probability Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {results.map((r, i) => {
                  const style = getCategoryStyle(r.predicted_category);
                  return (
                    <tr key={r.id || i} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono text-slate-500">{r.id || i + 1}</td>
                      <td className="py-3 px-3 font-medium text-slate-100 max-w-md">{r.headline}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          <span>{r.predicted_category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {(r.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1">
                          {['Business', 'Education', 'Entertainment', 'Sports', 'Technology'].map((cat) => {
                            const p = r.probabilities?.[cat] || 0;
                            const catStyle = getCategoryStyle(cat);
                            return (
                              <div
                                key={cat}
                                className="h-2 rounded-full overflow-hidden transition-all"
                                style={{
                                  width: `${Math.max(p * 100, 4)}%`,
                                  backgroundColor: catStyle.hex
                                }}
                                title={`${cat}: ${(p * 100).toFixed(1)}%`}
                              />
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
