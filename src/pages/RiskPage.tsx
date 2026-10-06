import React from 'react';
import { ShieldAlert, Sparkles, Info } from 'lucide-react';
import { RiskBreakdown } from '../components/risk/RiskBreakdown';

export const RiskPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#1D2939] space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            CORE INNOVATION 3
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Explainable Investigation Risk Score
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Transparent algorithmic risk score breakdown derived from forensic artifact telemetry, not black-box predictions
        </p>
      </div>

      {/* Main Risk Breakdown Component */}
      <RiskBreakdown />
    </div>
  );
};
