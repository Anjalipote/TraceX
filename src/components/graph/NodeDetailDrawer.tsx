import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ExternalLink,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { DetailDrawer } from '../common/DetailDrawer';
import { SeverityBadge } from '../common/SeverityBadge';
import { GraphNodeData } from '../../types';

interface NodeDetailDrawerProps {
  nodeData: GraphNodeData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  nodeData,
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();

  if (!nodeData) return null;

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={nodeData.label}
      subtitle={nodeData.subtitle}
      badge={<SeverityBadge severity={nodeData.risk} size="sm" />}
      width="lg"
    >
      <div className="space-y-6">
        {/* Core Attributes */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1D2939] p-4 space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
            Entity Classification
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Node Category</span>
              <span className="font-mono text-[#F8FAFC] uppercase font-bold text-blue-400">
                {nodeData.nodeType}
              </span>
            </div>
            <div>
              <span className="text-[#94A3B8] font-mono text-[11px] block">Investigation Risk</span>
              <span className="font-mono text-red-400 font-bold">
                {nodeData.risk} SEVERITY
              </span>
            </div>
            {nodeData.timestamp && (
              <div>
                <span className="text-[#94A3B8] font-mono text-[11px] block">Associated Timestamp</span>
                <span className="font-mono text-[#F8FAFC]">{nodeData.timestamp}</span>
              </div>
            )}
            {nodeData.evidenceId && (
              <div>
                <span className="text-[#94A3B8] font-mono text-[11px] block">Source Evidence Vault ID</span>
                <span className="font-mono text-blue-400">{nodeData.evidenceId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Technical Key-Value Details */}
        {nodeData.details && (
          <div className="rounded-xl bg-[#0D131C] border border-[#1D2939] p-4 space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
              Forensic Technical Details
            </h4>
            <div className="divide-y divide-[#1D2939]/60 text-xs">
              {Object.entries(nodeData.details).map(([key, value]) => (
                <div key={key} className="py-2 flex items-center justify-between gap-4">
                  <span className="text-[#94A3B8] font-mono text-[11px]">{key}</span>
                  <span className="font-mono text-[#F8FAFC] text-right truncate max-w-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Events Section */}
        {nodeData.relatedEvents && nodeData.relatedEvents.length > 0 && (
          <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1D2939] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Related Timeline Events ({nodeData.relatedEvents.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate('/timeline');
                }}
                className="text-[11px] text-blue-400 hover:underline font-mono"
              >
                Inspect in Timeline →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nodeData.relatedEvents.map((evtId) => (
                <span key={evtId} className="px-2 py-0.5 rounded bg-[#111923] border border-[#1D2939] text-[11px] font-mono text-[#94A3B8]">
                  {evtId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Findings Section */}
        {nodeData.relatedFindings && nodeData.relatedFindings.length > 0 && (
          <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1D2939] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Correlated Risk Findings ({nodeData.relatedFindings.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate('/findings');
                }}
                className="text-[11px] text-blue-400 hover:underline font-mono"
              >
                Inspect Findings →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nodeData.relatedFindings.map((findId) => (
                <span key={findId} className="px-2 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-[11px] font-mono text-red-300">
                  {findId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cross-Link Actions */}
        <div className="pt-2 flex items-center gap-3">
          {nodeData.evidenceId && (
            <button
              onClick={() => {
                onClose();
                navigate(`/evidence?selected=${nodeData.evidenceId}`);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-forensic font-mono"
            >
              <FileText className="w-4 h-4" />
              <span>Inspect Source Evidence</span>
            </button>
          )}
        </div>
      </div>
    </DetailDrawer>
  );
};
