import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  Copy, 
  Check, 
  FileText,
  FileCode,
  FileSpreadsheet,
  HardDrive
} from 'lucide-react';
import { EvidenceItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { truncateHash, copyToClipboard } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import { PdfDiffModal } from './PdfDiffModal';

interface EvidenceTableProps {
  onSelectEvidence: (evidence: EvidenceItem) => void;
  selectedEvidenceId?: string;
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({
  onSelectEvidence,
  selectedEvidenceId
}) => {
  const { evidence, searchQuery: globalSearch, showToast } = useApp();
  
  const [localSearch, setLocalSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'LIVE' | 'DEMO'>('ALL');
  const [diffModalItem, setDiffModalItem] = useState<EvidenceItem | null>(null);
  const [sortField, setSortField] = useState<keyof EvidenceItem>('riskScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const effectiveSearch = globalSearch || localSearch;

  const handleCopy = async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      showToast('SHA-256 Copied', 'Hash copied to clipboard.', 'info');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredEvidence = useMemo(() => {
    return evidence.filter((item) => {
      const searchLower = effectiveSearch.toLowerCase();
      const matchesSearch = 
        !effectiveSearch ||
        item.filename.toLowerCase().includes(searchLower) ||
        item.fileType.toLowerCase().includes(searchLower) ||
        item.sha256.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower);

      const matchesType = typeFilter === 'ALL' || item.category === typeFilter;
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
      const matchesSource = 
        sourceFilter === 'ALL' || 
        (sourceFilter === 'LIVE' && item.isLiveAgent) || 
        (sourceFilter === 'DEMO' && !item.isLiveAgent);

      return matchesSearch && matchesType && matchesSeverity && matchesSource;
    }).sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [evidence, effectiveSearch, typeFilter, severityFilter, sortField, sortAsc]);

  const handleSort = (field: keyof EvidenceItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getFileIcon = (category: EvidenceItem['category']) => {
    switch (category) {
      case 'Document': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'Executable': return <FileCode className="w-4 h-4 text-red-400" />;
      case 'Database': return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
      case 'Log': return <HardDrive className="w-4 h-4 text-cyan-400" />;
      case 'Hardware': return <HardDrive className="w-4 h-4 text-purple-400" />;
      default: return <FileText className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 shadow-lg">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter by filename, hash digest, or content keywords..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080D15] border border-[#1E293B]/80 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
            <Filter className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#080D15] border border-[#1E293B] text-xs text-[#F8FAFC] focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="ALL">All Categories</option>
              <option value="Document">Document</option>
              <option value="Executable">Executable</option>
              <option value="Database">Database</option>
              <option value="Log">Log File</option>
              <option value="Hardware">Hardware Log</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
            <span>Risk:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#080D15] border border-[#1E293B] text-xs text-[#F8FAFC] focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
            <span>Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-[#080D15] border border-[#1E293B] text-xs text-[#F8FAFC] focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="ALL">All Sources</option>
              <option value="LIVE">🟢 Live Agent Only</option>
              <option value="DEMO">🔵 Demo Benchmark Only</option>
            </select>
          </div>

          <span className="text-xs font-mono text-[#64748B] px-2">
            {filteredEvidence.length} of {evidence.length} items
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-[#1E293B]/80 bg-[#0B1017] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B]/60 bg-[#080D15] text-[#94A3B8] font-mono text-[11px] uppercase tracking-wider select-none">
                <th 
                  onClick={() => handleSort('filename')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>File</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('fileType')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Type</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('sizeBytes')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Size</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('createdAt')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Created</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('modifiedAt')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Modified</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('accessedAt')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Accessed</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('riskScore')} 
                  className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Risk</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-4 px-5">SHA-256 Digest</th>
                <th className="py-4 px-5">Integrity</th>
                <th className="py-4 px-5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {filteredEvidence.map((item) => {
                const isSelected = selectedEvidenceId === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectEvidence(item)}
                    className={`group cursor-pointer transition-colors duration-150 ${
                      isSelected 
                        ? 'bg-blue-600/10 hover:bg-blue-600/15' 
                        : 'hover:bg-[#0E1522]'
                    }`}
                  >
                    {/* Filename */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[#080D15] border border-[#1E293B]/70 shrink-0">
                          {getFileIcon(item.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[#F8FAFC] group-hover:text-blue-400 font-mono text-xs transition-colors">
                              {item.filename}
                            </p>
                            {item.isLiveAgent ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-700/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE AGENT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-700">
                                DEMO DATA
                              </span>
                            )}
                            {item.pdfDiffData && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDiffModalItem(item);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-700 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                                title="View PDF text alterations page-by-page"
                              >
                                <FileText className="w-3 h-3 text-red-400" />
                                <span>Diff PDF ({item.pdfDiffData.changed_pages?.length || 1}p)</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-[#64748B] truncate max-w-xs font-mono mt-0.5">
                            {item.sourceLocation}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* File Type */}
                    <td className="py-4 px-5 text-[#94A3B8]">
                      {item.fileType}
                    </td>

                    {/* Size */}
                    <td className="py-4 px-5 font-mono text-[#94A3B8]">
                      {item.sizeFormatted}
                    </td>

                    {/* Created */}
                    <td className="py-4 px-5 font-mono text-[11px] text-[#64748B]">
                      {item.createdAt}
                    </td>

                    {/* Modified */}
                    <td className="py-4 px-5 font-mono text-[11px] text-[#64748B]">
                      {item.modifiedAt}
                    </td>

                    {/* Accessed */}
                    <td className="py-4 px-5 font-mono text-[11px] text-blue-400 font-medium">
                      {item.accessedAt}
                    </td>

                    {/* Risk Badge */}
                    <td className="py-4 px-5">
                      <SeverityBadge severity={item.severity} size="sm" />
                    </td>

                    {/* SHA-256 Digest */}
                    <td className="py-4 px-5 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#94A3B8] group-hover:text-blue-300">
                        <span>{truncateHash(item.sha256, 6, 6)}</span>
                        <button
                          onClick={(e) => handleCopy(e, item.sha256, item.id)}
                          className="p-1 rounded hover:bg-[#111923] text-[#64748B] hover:text-white"
                          title="Copy SHA-256"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Integrity Status */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        item.integrity === 'VERIFIED'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-red-950/70 text-red-400 border border-red-800/80 animate-pulse'
                      }`}>
                        {item.integrity === 'VERIFIED' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {item.integrity}
                      </span>
                    </td>

                    {/* Inspect Action */}
                    <td className="py-4 px-5 text-right">
                      <span className="text-blue-400 hover:text-blue-300 font-mono text-[11px] flex items-center justify-end gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive PDF Diff Modal */}
      {diffModalItem && (
        <PdfDiffModal
          isOpen={!!diffModalItem}
          onClose={() => setDiffModalItem(null)}
          filename={diffModalItem.filename}
          baselineSha256={diffModalItem.baselineSha256 || diffModalItem.originalSha256}
          currentSha256={diffModalItem.sha256}
          diffData={diffModalItem.pdfDiffData}
        />
      )}
    </div>
  );
};
