import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, ShieldAlert, GitCommit, Info } from 'lucide-react';
import { Timeline } from '../components/timeline/Timeline';

export const TimelinePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'ALL';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#1D2939] space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
            CHRONOLOGICAL ANALYSIS
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Unified Forensic Timeline
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Correlated event stream derived from NTFS transaction journals, Windows event logs, and USBSTOR enumerations
        </p>
      </div>

      {/* Main Timeline Component */}
      <Timeline initialFilter={initialFilter} />
    </div>
  );
};
