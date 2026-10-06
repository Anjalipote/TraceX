import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Binary, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  ArrowRight,
  GitFork,
  AlertTriangle,
  FolderOpen,
  Lock
} from 'lucide-react';
import { DetailDrawer } from '../common/DetailDrawer';
import { SeverityBadge } from '../common/SeverityBadge';
import { EvidenceItem } from '../../types';
import { truncateHash, copyToClipboard } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface EvidenceDrawerProps {
  evidence: EvidenceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  evidence,
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [copiedHash, setCopiedHash] = React.useState(false);

  if (!evidence) return null;

  const handleCopyHash = async (hash: string) => {
    const success = await copyToClipboard(hash);
    if (success) {
      setCopiedHash(true);
      showToast('SHA-256 Copied', 'Digest copied to clipboard for verification.', 'info');
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={evidence.filename}
      subtitle={evidence.sourceLocation}
      badge={<SeverityBadge severity={evidence.severity} size="sm" />}
      width="lg"
    >
      <div className="space-y-6">
        {/* Read-Only Forensic Storage Assurance (Final Forensic Enhancement) */}
        <div className="p-3.5 rounded-xl bg-blue-950/25 border border-blue-800/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-blue-300">
            <Lock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Storage Mode: <strong className="text-white">READ-ONLY (Write-Protected)</strong></span>
          </div>
          <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50 font-bold">
            INERT ARTIFACT
          </span>
        </div>

        {/* Magic Byte Mismatch Warning (Final Forensic Enhancement) */}
        {(evidence.description?.toLowerCase().includes('mismatch') || (evidence.category === 'Executable' && (evidence.filename.endsWith('.pdf') || evidence.filename.endsWith('.jpg') || evidence.filename.endsWith('.docx')))) && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/70 text-xs font-mono text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-red-200 block uppercase text-[11px]">
                ⚠ File Type / Header Mismatch Detected
              </span>
              <span className="text-[11px] leading-relaxed block text-red-300/90">
                File extension does not match true binary header signature. Header analysis indicates executable bytecode masquerading as document. Potential disguise technique.
              </span>
            </div>
          </div>
        )}

        {/* Core Metadata Grid */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1D2939] p-4 space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
            Forensic Metadata Attributes
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">File Type</span>
              <span className="font-medium text-[#F8FAFC]">{evidence.fileType}</span>
            </div>
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Calculated Size</span>
              <span className="font-mono text-[#F8FAFC]">{evidence.sizeFormatted} ({evidence.sizeBytes.toLocaleString()} bytes)</span>
            </div>
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Created Timestamp</span>
              <span className="font-mono text-[#F8FAFC]">{evidence.createdAt}</span>
            </div>
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Modified Timestamp</span>
              <span className="font-mono text-[#F8FAFC]">{evidence.modifiedAt}</span>
            </div>
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Last Accessed</span>
              <span className="font-mono text-[#F8FAFC]">{evidence.accessedAt}</span>
            </div>
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Investigation Risk</span>
              <span className="font-mono font-bold text-red-400">{evidence.riskScore} / 100</span>
            </div>
          </div>
        </div>

        {/* SHA-256 Hash Verification Box */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1D2939] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-[#64748B]">
              Cryptographic Custody Hash
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
              evidence.integrity === 'VERIFIED'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-red-950/60 text-red-400 border border-red-800/60'
            }`}>
              {evidence.integrity === 'VERIFIED' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
              {evidence.integrity}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1D2939] flex items-center justify-between gap-2 font-mono text-xs">
            <span className="truncate text-blue-300 select-all font-mono">
              {evidence.sha256}
            </span>
            <button
              onClick={() => handleCopyHash(evidence.sha256)}
              className="p-1 rounded hover:bg-[#1D2939] text-[#94A3B8] hover:text-white shrink-0"
              title="Copy full SHA-256 hash"
            >
              {copiedHash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {evidence.sha256 !== evidence.originalSha256 && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
              <span className="font-bold">Original Ingestion Hash:</span>
              <div className="font-mono text-[11px] truncate mt-0.5 opacity-80">{evidence.originalSha256}</div>
            </div>
          )}
        </div>

        {/* Forensic Description */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1D2939] p-4 space-y-2">
          <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
            Investigator Notes & Artifact Significance
          </h4>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {evidence.description}
          </p>
        </div>

        {/* Related Forensic Connections */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
            Correlated Forensic Entities
          </h4>

          {/* Related Timeline Events */}
          <div className="p-3 rounded-xl bg-[#0D131C] border border-[#1D2939] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Related Timeline Events ({evidence.relatedEvents.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate('/timeline');
                }}
                className="text-[11px] text-blue-400 hover:underline font-mono"
              >
                Inspect Timeline →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {evidence.relatedEvents.map((evtId) => (
                <span key={evtId} className="px-2 py-0.5 rounded bg-[#111923] border border-[#1D2939] text-[11px] font-mono text-[#94A3B8]">
                  {evtId}
                </span>
              ))}
            </div>
          </div>

          {/* Related Findings */}
          <div className="p-3 rounded-xl bg-[#0D131C] border border-[#1D2939] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Correlated Risk Findings ({evidence.relatedFindings.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate('/findings');
                }}
                className="text-[11px] text-blue-400 hover:underline font-mono"
              >
                View Findings →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {evidence.relatedFindings.length > 0 ? (
                evidence.relatedFindings.map((findId) => (
                  <span key={findId} className="px-2 py-0.5 rounded bg-red-950/30 border border-red-800/40 text-[11px] font-mono text-red-300">
                    {findId}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#64748B]">No direct security flags attached.</span>
              )}
            </div>
          </div>

          {/* Related Graph Nodes */}
          <div className="p-3 rounded-xl bg-[#0D131C] border border-[#1D2939] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                Relationship Graph Vertices ({evidence.relatedGraphNodes.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate('/graph');
                }}
                className="text-[11px] text-blue-400 hover:underline font-mono"
              >
                Open in Graph View →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {evidence.relatedGraphNodes.map((nodeId) => (
                <span key={nodeId} className="px-2 py-0.5 rounded bg-cyan-950/30 border border-cyan-800/40 text-[11px] font-mono text-cyan-300">
                  {nodeId}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
};
