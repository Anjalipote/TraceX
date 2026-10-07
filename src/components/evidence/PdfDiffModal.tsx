import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight, 
  Copy, 
  Check, 
  Layers, 
  Plus, 
  Minus, 
  Columns, 
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { copyToClipboard, truncateHash } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

interface PageDiffResult {
  page_number: number;
  has_changes: boolean;
  baseline_text: string;
  modified_text: string;
  added_lines: string[];
  removed_lines: string[];
  diff_lines: DiffLine[];
}

export interface PdfDiffData {
  has_changes: boolean;
  total_pages_baseline: number;
  total_pages_modified: number;
  changed_pages: number[];
  total_additions: number;
  total_deletions: number;
  pages: PageDiffResult[];
  summary: string;
}

interface PdfDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  baselineSha256?: string;
  currentSha256?: string;
  diffData?: PdfDiffData | null;
}

export const PdfDiffModal: React.FC<PdfDiffModalProps> = ({
  isOpen,
  onClose,
  filename,
  baselineSha256,
  currentSha256,
  diffData
}) => {
  const { showToast } = useApp();
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      showToast('Copied', 'Hash copied to clipboard.', 'info');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const pages = diffData?.pages || [];
  const currentPage = pages[selectedPageIndex] || {
    page_number: 1,
    has_changes: false,
    baseline_text: '',
    modified_text: '',
    added_lines: [],
    removed_lines: [],
    diff_lines: []
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0B1017] border border-[#1E293B] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] flex items-start justify-between gap-4 bg-[#080D15]">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-[#F8FAFC] font-mono truncate">
                  {filename}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border-emerald-700/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE ENDPOINT ARTIFACT
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950/80 text-red-400 border border-red-800">
                  <ShieldAlert className="w-3 h-3" />
                  POST-BASELINE MODIFICATION
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                Page-by-page textual & structural forensic comparison against initial endpoint baseline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic Hash Comparison Banner */}
        <div className="px-5 py-3 bg-[#080D15]/80 border-b border-[#1E293B] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B1017] border border-[#1E293B]">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                ✓ BASELINE REGISTERED SHA-256:
              </span>
              <span className="text-[#94A3B8] text-[11px] truncate block select-all" title={baselineSha256}>
                {baselineSha256 || 'Unknown baseline hash'}
              </span>
            </div>
            {baselineSha256 && (
              <button
                onClick={() => handleCopy(baselineSha256, 'base')}
                className="p-1 rounded hover:bg-[#1E293B] text-[#94A3B8] hover:text-white shrink-0"
                title="Copy Baseline SHA-256"
              >
                {copiedKey === 'base' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0B1017] border border-red-900/60">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-red-400 block">
                ⚠ CURRENT CAPTURED SHA-256:
              </span>
              <span className="text-red-300 text-[11px] truncate block select-all font-bold" title={currentSha256}>
                {currentSha256 || 'Unknown current hash'}
              </span>
            </div>
            {currentSha256 && (
              <button
                onClick={() => handleCopy(currentSha256, 'curr')}
                className="p-1 rounded hover:bg-[#1E293B] text-[#94A3B8] hover:text-white shrink-0"
                title="Copy Current SHA-256"
              >
                {copiedKey === 'curr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Change Statistics Bar */}
        <div className="px-5 py-3 bg-[#0B1017] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#94A3B8]">
              Summary: <strong className="text-amber-300">{diffData?.summary || 'Text altered'}</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
              <Plus className="w-3 h-3" />
              {diffData?.total_additions ?? 0} additions
            </span>
            <span className="flex items-center gap-1 text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/60 font-bold">
              <Minus className="w-3 h-3" />
              {diffData?.total_deletions ?? 0} deletions
            </span>
            <span className="text-[#64748B]">
              Changed pages: {diffData?.changed_pages?.join(', ') || 'None'}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#080D15] p-1 rounded-xl border border-[#1E293B]">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 font-bold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'unified'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 font-bold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Unified Diff</span>
            </button>
          </div>
        </div>

        {/* Page Selector Tabs */}
        {pages.length > 0 && (
          <div className="px-5 py-2.5 bg-[#080D15] border-b border-[#1E293B] flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#64748B] uppercase font-bold mr-1">
                Pages:
              </span>
              {pages.map((p, idx) => {
                const isSelected = selectedPageIndex === idx;
                return (
                  <button
                    key={p.page_number}
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-[#0B1017] text-[#94A3B8] border border-[#1E293B] hover:text-white'
                    }`}
                  >
                    <span>Page {p.page_number}</span>
                    {p.has_changes && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" title="Altered page" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 text-xs font-mono text-[#64748B]">
              <button
                disabled={selectedPageIndex === 0}
                onClick={() => setSelectedPageIndex(prev => Math.max(0, prev - 1))}
                className="p-1 rounded hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>{selectedPageIndex + 1} / {pages.length}</span>
              <button
                disabled={selectedPageIndex >= pages.length - 1}
                onClick={() => setSelectedPageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                className="p-1 rounded hover:bg-[#1E293B] disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#070A0F]">
          {pages.length === 0 ? (
            <div className="text-center py-12 text-[#94A3B8] font-mono text-xs">
              No page-level textual differences recorded for this artifact.
            </div>
          ) : viewMode === 'side-by-side' ? (
            /* Side-by-Side View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Baseline Column */}
              <div className="rounded-xl border border-[#1E293B] bg-[#0B1017] overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-[#0D1420] border-b border-[#1E293B] flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    BASELINE CONTENT (Page {currentPage.page_number})
                  </span>
                  <span className="text-[10px] text-[#64748B]">Seizure Benchmark</span>
                </div>
                <div className="p-4 font-mono text-xs text-[#CBD5E1] space-y-1 overflow-y-auto max-h-[50vh] leading-relaxed">
                  {currentPage.baseline_text ? (
                    currentPage.baseline_text.split('\n').map((line, idx) => {
                      const isRemoved = currentPage.removed_lines.some(r => r.trim() === line.trim());
                      return (
                        <div
                          key={idx}
                          className={`p-1 rounded flex items-start gap-3 ${
                            isRemoved ? 'bg-red-950/40 text-red-300 border-l-2 border-red-500 line-through decoration-red-400/60' : ''
                          }`}
                        >
                          <span className="text-[#64748B] select-none text-[10px] w-6 shrink-0 text-right">
                            {idx + 1}
                          </span>
                          <span className="break-all">{line || '\u00A0'}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[#64748B] italic">Page was blank in baseline artifact.</span>
                  )}
                </div>
              </div>

              {/* Modified Column */}
              <div className="rounded-xl border border-[#1E293B] bg-[#0B1017] overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-[#0D1420] border-b border-[#1E293B] flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-red-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    MODIFIED CONTENT (Page {currentPage.page_number})
                  </span>
                  <span className="text-[10px] text-[#64748B]">Current Live Agent</span>
                </div>
                <div className="p-4 font-mono text-xs text-[#CBD5E1] space-y-1 overflow-y-auto max-h-[50vh] leading-relaxed">
                  {currentPage.modified_text ? (
                    currentPage.modified_text.split('\n').map((line, idx) => {
                      const isAdded = currentPage.added_lines.some(a => a.trim() === line.trim());
                      return (
                        <div
                          key={idx}
                          className={`p-1 rounded flex items-start gap-3 ${
                            isAdded ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 font-semibold' : ''
                          }`}
                        >
                          <span className="text-[#64748B] select-none text-[10px] w-6 shrink-0 text-right">
                            {idx + 1}
                          </span>
                          <span className="break-all">{line || '\u00A0'}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[#64748B] italic">Page was cleared in modified version.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Unified Diff View */
            <div className="rounded-xl border border-[#1E293B] bg-[#0B1017] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#0D1420] border-b border-[#1E293B] flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#F8FAFC]">
                  UNIFIED FORENSIC DIFF — PAGE {currentPage.page_number}
                </span>
                <span className="text-[10px] text-[#64748B]">SequenceMatcher Text Analysis</span>
              </div>
              <div className="p-4 font-mono text-xs space-y-1 overflow-y-auto max-h-[50vh] leading-relaxed">
                {currentPage.diff_lines && currentPage.diff_lines.length > 0 ? (
                  currentPage.diff_lines.map((dl, idx) => (
                    <div
                      key={idx}
                      className={`p-1.5 rounded flex items-start gap-3 ${
                        dl.type === 'added'
                          ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 font-semibold'
                          : dl.type === 'removed'
                          ? 'bg-red-950/40 text-red-300 border-l-2 border-red-500 line-through'
                          : 'text-[#94A3B8]'
                      }`}
                    >
                      <span className="font-bold w-4 text-center select-none shrink-0">
                        {dl.type === 'added' ? '+' : dl.type === 'removed' ? '-' : ' '}
                      </span>
                      <span className="break-all">{dl.text}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[#64748B] italic">No differences on this page.</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#080D15] border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              DFIR Advisory: Discrepancies between seizure baseline and live file indicate potential post-incident tampering.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
          >
            Close Diff Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
