import React from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { ReportPreview } from '../components/reports/ReportPreview';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#1D2939] space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
            OUTPUT & ADMISSIBILITY
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Forensic Investigation Reports & Export
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Automated compilation of findings, chronological story, and cryptographic chain of custody for legal proceedings
        </p>
      </div>

      {/* Main Report Preview Component */}
      <ReportPreview />
    </div>
  );
};
