import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { 
  UserCheck, 
  Usb, 
  FileText, 
  Terminal, 
  HardDrive, 
  Trash2, 
  Clock
} from 'lucide-react';
import { GraphNodeData } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';

export const CustomForensicNode = memo(({ data, selected }: NodeProps<Node<GraphNodeData>>) => {
  const getNodeIcon = (type: GraphNodeData['nodeType']) => {
    switch (type) {
      case 'user': return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'device': return <Usb className="w-4 h-4 text-amber-400" />;
      case 'file': return <FileText className="w-4 h-4 text-red-400" />;
      case 'executable': return <Terminal className="w-4 h-4 text-red-400" />;
      case 'system': return <HardDrive className="w-4 h-4 text-cyan-400" />;
      case 'event': return <Trash2 className="w-4 h-4 text-red-400" />;
      default: return <FileText className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  const getBorderColor = () => {
    if (selected) return 'border-blue-400 ring-2 ring-blue-500/40 shadow-lg';
    if (data.risk === 'CRITICAL') return 'border-red-600/70 shadow-red-950/20';
    if (data.risk === 'HIGH') return 'border-amber-600/60';
    if (data.risk === 'MEDIUM') return 'border-cyan-600/50';
    return 'border-[#1E293B]';
  };

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-2xl bg-[#0B1017] border p-4 transition-all duration-200 cursor-pointer ${getBorderColor()} hover:scale-[1.02] shadow-xl`}
    >
      {/* React Flow Handles */}
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-[#070A0F]" />
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-[#070A0F]" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-[#070A0F]" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-[#070A0F]" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#080D15] border border-[#1E293B]/70">
            {getNodeIcon(data.nodeType)}
          </div>
          <span className="text-[10px] font-mono uppercase text-[#94A3B8] font-bold">
            {data.nodeType}
          </span>
        </div>
        <SeverityBadge severity={data.risk} size="sm" />
      </div>

      {/* Main Label */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-[#F8FAFC] truncate font-mono">
          {data.label}
        </h4>
        <p className="text-[11px] text-[#94A3B8] leading-relaxed line-clamp-2">
          {data.subtitle}
        </p>
      </div>

      {/* Footer Timestamp */}
      {data.timestamp && (
        <div className="mt-3 pt-2.5 border-t border-[#1E293B]/60 flex items-center justify-between text-[10px] font-mono text-[#64748B]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-blue-400" />
            {data.timestamp}
          </span>
          <span className="text-blue-400 hover:underline">Inspect →</span>
        </div>
      )}
    </div>
  );
});

CustomForensicNode.displayName = 'CustomForensicNode';
