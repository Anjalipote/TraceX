import React from 'react';
import { ShieldCheck, Lock, Info } from 'lucide-react';
import { HashVerification } from '../components/integrity/HashVerification';

export const IntegrityPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-[#1D2939] space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            COURT-ADMISSIBLE CUSTODY
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Evidence Integrity & Cryptographic Custody Center
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Continuous SHA-256 hash recalculation to verify digital artifacts against initial physical drive seizure records
        </p>
      </div>

      {/* Main Hash Verification Component */}
      <HashVerification />
    </div>
  );
};
