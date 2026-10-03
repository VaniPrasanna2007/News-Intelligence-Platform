import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileText,
  FileDown,
  Copy,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { exportReport } from '../utils/exportReport';

/**
 * Universal Export Report Menu Component
 * Supports: PDF, Word (.docx), TXT, Copy, JSON, CSV
 */
export default function ExportReportMenu({
  moduleType = 'command_center',
  data = null,
  label = 'Export Report',
  variant = 'dropdown', // 'dropdown' | 'dual'
  includeJson = false,
  includeCsv = false,
  customFilename = null,
  className = '',
  buttonSize = 'md', // 'sm' | 'md'
  disabled = false,
  onViewPreview = null,
  onExportSuccess = null,
  onExportError = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState(null); // 'pdf' | 'docx' | 'txt' | 'copy' | etc.
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('success'); // 'success' | 'error'

  const menuRef = useRef(null);
  const moreRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExport = async (format) => {
    try {
      setLoadingFormat(format);
      setStatusMessage(null);

      const result = await exportReport({
        moduleType,
        data,
        format,
        customFilename
      });

      setStatusType('success');
      setStatusMessage(format === 'copy' ? 'Report copied!' : `${format.toUpperCase()} downloaded!`);
      if (onExportSuccess) onExportSuccess(result.message);

      setTimeout(() => {
        setStatusMessage(null);
      }, 2500);
    } catch (err) {
      console.error(`Export ${format} error:`, err);
      setStatusType('error');
      setStatusMessage(`Export failed: ${err.message || 'Error generating report'}`);
      if (onExportError) onExportError(err.message);

      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    } finally {
      setLoadingFormat(null);
      setIsOpen(false);
      setIsMoreOpen(false);
    }
  };

  const isSmall = buttonSize === 'sm';

  // VARIANT: DUAL BUTTONS ([ Export PDF ] [ Export Word ] [ More ▾ ])
  if (variant === 'dual') {
    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        {/* Export PDF Button */}
        <button
          type="button"
          disabled={disabled || loadingFormat !== null}
          onClick={() => handleExport('pdf')}
          className={`rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
          }`}
          title="Download formatted PDF report"
        >
          {loadingFormat === 'pdf' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileDown className="w-3.5 h-3.5" />
          )}
          <span>Export PDF</span>
        </button>

        {/* Export Word Button */}
        <button
          type="button"
          disabled={disabled || loadingFormat !== null}
          onClick={() => handleExport('docx')}
          className={`rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold transition flex items-center gap-1.5 shadow-md shadow-teal-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
          }`}
          title="Download editable Word (.docx) report"
        >
          {loadingFormat === 'docx' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span>Export Word</span>
        </button>

        {/* More Options Dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            disabled={disabled || loadingFormat !== null}
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isSmall ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-2 text-xs'
            }`}
            title="More report formats"
          >
            <span>More</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMoreOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => handleExport('txt')}
                className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Export TXT</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('copy')}
                className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Report</span>
              </button>

              {includeJson && (
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition"
                >
                  <FileCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export JSON</span>
                </button>
              )}

              {includeCsv && (
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback Badge */}
        {statusMessage && (
          <div
            className={`absolute left-0 top-full mt-2 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-lg z-50 animate-in fade-in duration-150 ${
              statusType === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
                : 'bg-rose-950/90 text-rose-300 border border-rose-700/60'
            }`}
          >
            {statusType === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // VARIANT: STANDARD COMPACT DROPDOWN
  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        disabled={disabled || loadingFormat !== null}
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
          isSmall ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
        title="Export Report (PDF, Word, TXT, Copy)"
      >
        {loadingFormat ? (
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
        ) : (
          <FileDown className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in duration-150 select-none">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono border-b border-slate-800/80 mb-1">
            Export Options
          </div>

          {/* Primary Formats */}
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-emerald-950/40 flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-2.5">
              <FileDown className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Export as PDF</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">.pdf</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('docx')}
            className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-teal-950/40 flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Export as Word</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">.docx</span>
          </button>

          <div className="my-1 border-t border-slate-800/80" />

          {/* Secondary Formats */}
          <button
            type="button"
            onClick={() => handleExport('txt')}
            className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Export as TXT</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">.txt</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('copy')}
            className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Report</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Clipboard</span>
          </button>

          {includeCsv && (
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export as CSV</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">.csv</span>
            </button>
          )}

          {includeJson && (
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Export as JSON</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">.json</span>
            </button>
          )}

          {onViewPreview && (
            <>
              <div className="my-1 border-t border-slate-800/80" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onViewPreview();
                }}
                className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>View Full Preview</span>
                </div>
                <span className="text-[10px] font-mono text-teal-400">Modal</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`absolute right-0 top-full mt-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xl z-50 whitespace-nowrap animate-in fade-in duration-150 ${
            statusType === 'success'
              ? 'bg-slate-900 border border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border border-rose-500/50 text-rose-300'
          }`}
        >
          {statusType === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
