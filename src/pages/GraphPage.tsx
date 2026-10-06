import React from 'react';
import { GitFork, Sparkles, Info, ShieldCheck, Share2 } from 'lucide-react';
import { EvidenceGraph } from '../components/graph/EvidenceGraph';

export const GraphPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#1D2939] space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            CORE INNOVATION 2
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Evidence Relationship Graph
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Interactive topological graph modeling actor-to-device-to-file relationships, permissions, and lateral attack paths
        </p>
      </div>

      {/* Main Interactive React Flow Graph */}
      <EvidenceGraph />
    </div>
  );
};
