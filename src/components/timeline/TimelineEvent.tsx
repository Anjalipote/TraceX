import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  FileText, 
  Usb, 
  Terminal, 
  UserCheck, 
  Settings2, 
  ChevronRight
} from 'lucide-react';
import { TimelineEventItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';

interface TimelineEventProps {
  event: TimelineEventItem;
  isSelected: boolean;
  onSelect: (event: TimelineEventItem) => void;
}

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  event,
  isSelected,
  onSelect
}) => {
  const getCategoryIcon = (category: TimelineEventItem['category'], isSuspicious: boolean) => {
    if (isSuspicious) {
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
    switch (category) {
      case 'USB': return <Usb className="w-4 h-4 text-amber-400" />;
      case 'FILES': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'USER': return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'SYSTEM': return <Settings2 className="w-4 h-4 text-cyan-400" />;
      case 'SUSPICIOUS': return <Terminal className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  return (
    <div className="relative pl-12 pb-9 group">
      {/* Vertical Spine Line */}
      <div className="absolute left-[18px] top-8 bottom-0 w-0.5 bg-[#1E293B]/80 group-last:hidden" />

      {/* Node Bullet */}
      <div 
        onClick={() => onSelect(event)}
        className={`absolute left-0 top-1.5 w-9 h-9 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all z-10 ${
          event.isSuspicious
            ? 'bg-red-950/80 border-red-500 shadow-md scale-105'
            : isSelected
            ? 'bg-blue-950/80 border-blue-500 shadow-md'
            : 'bg-[#0B1017] border-[#1E293B] hover:border-blue-500/50'
        }`}
      >
        {getCategoryIcon(event.category, event.isSuspicious)}
      </div>

      {/* Card Content */}
      <div
        onClick={() => onSelect(event)}
        className={`cursor-pointer rounded-2xl p-5 lg:p-6 border transition-all duration-200 shadow-lg ${
          isSelected
            ? 'bg-[#111923] border-blue-500 ring-1 ring-blue-500/40'
            : event.isSuspicious
            ? 'bg-[#0B1017] border-red-900/40 hover:border-red-500/50 hover:bg-[#111923]'
            : 'bg-[#0B1017] border-[#1E293B]/70 hover:border-blue-500/40 hover:bg-[#0E1522]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-800/40 px-2.5 py-0.5 rounded-md">
              {event.timeFormatted}
            </span>
            <span className="font-semibold text-sm text-[#F8FAFC] group-hover:text-blue-300 transition-colors">
              {event.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {event.isSuspicious && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/70 uppercase">
                Anomaly Flagged
              </span>
            )}
            <SeverityBadge severity={event.severity} size="sm" />
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
          {event.description}
        </p>

        {/* Footer Meta */}
        <div className="pt-3 border-t border-[#1E293B]/50 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#64748B]">
          <div className="flex items-center gap-3">
            <span>Actor: <strong className="text-[#94A3B8] font-normal">{event.actor}</strong></span>
            <span>•</span>
            <span className="truncate max-w-sm">{event.sourceArtifact}</span>
          </div>

          <span className="text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs font-semibold">
            <span>Examine Event</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
