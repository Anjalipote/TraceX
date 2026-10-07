import React from 'react';
import { 
  X, 
  HelpCircle, 
  Clock, 
  ArrowRight, 
  FileText, 
  HardDrive, 
  Upload, 
  CheckCircle2, 
  ShieldAlert,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CorrelatedInvestigationFinding } from '../../types';

interface EvidenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  finding: CorrelatedInvestigationFinding | null;
}

export const EvidenceDetailModal: React.FC<EvidenceDetailModalProps> = ({
  isOpen,
  onClose,
  finding
}) => {
  const navigate = useNavigate();

  if (!isOpen || !finding) return null;

  const isUsb = finding.category.toLowerCase().includes('usb') || finding.title.toLowerCase().includes('usb');
  const isTransfer = finding.category.toLowerCase().includes('transfer') || finding.title.toLowerCase().includes('transfer');

  const handleViewTimeline = () => {
    onClose();
    navigate('/timeline');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isUsb ? 'bg-amber-50 text-amber-600' : isTransfer ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
            }`}>
              {isUsb ? <HardDrive className="w-5 h-5" /> : isTransfer ? <Upload className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1E293B]">
                  {finding.title}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  finding.severity === 'Critical' || finding.severity === 'High'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}>
                  {finding.severity} Risk
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {finding.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#1E293B] hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
              Event Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#64748B]">Timestamp:</span>
                <p className="font-semibold text-[#1E293B] font-mono mt-0.5">
                  {finding.timestamp}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">User Account:</span>
                <p className="font-semibold text-[#1E293B] mt-0.5">
                  {finding.metadata?.user || 'Employee01'}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">Target Name:</span>
                <p className="font-semibold text-[#1E293B] mt-0.5 font-mono">
                  {finding.metadata?.fileName || finding.metadata?.deviceName || 'confidential.pdf'}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">Action:</span>
                <p className="font-semibold text-[#1E293B] mt-0.5">
                  {finding.metadata?.action || 'Read'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#64748B]">File / Device Path:</span>
                <p className="font-medium text-[#1E293B] mt-0.5 font-mono text-[11px] break-all bg-white p-2 rounded-lg border border-[#E2E8F0]">
                  {finding.metadata?.filePath || finding.metadata?.mountPoint || 'C:\\Users\\Employee01\\Documents\\confidential.pdf'}
                </p>
              </div>
              <div>
                <span className="text-[#64748B]">Process:</span>
                <p className="font-semibold text-[#1E293B] mt-0.5 font-mono text-[11px]">
                  {finding.metadata?.process || 'Acrobat.exe (PID: 4521)'}
                </p>
              </div>
              {finding.metadata?.sha256 && (
                <div>
                  <span className="text-[#64748B]">Integrity (SHA-256):</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Verified Match
                    </span>
                    <span className="font-mono text-[10px] text-[#64748B] truncate max-w-[120px]">
                      {finding.metadata.sha256.substring(0, 12)}...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* WHY SUSPICIOUS? Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <h4 className="text-xs font-bold text-amber-900 tracking-wide">
                Why Suspicious?
              </h4>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
              {finding.whySuspicious}
            </p>
          </div>

          {/* RELATED EVENTS Box */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <h4 className="text-xs font-bold text-blue-900 tracking-wide">
                Related Correlated Events
              </h4>
            </div>
            <ol className="space-y-2 text-xs">
              {finding.relatedEvents.map((evt, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[#334155]">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="font-mono text-xs text-[#1E293B] font-medium pt-0.5">
                    {evt}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#64748B] hover:text-[#1E293B] rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleViewTimeline}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <span>View in Full Timeline</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
