import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const IntegritySummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const { evidence, isTampered, simulateIntegrityTamper, restoreIntegrityState } = useApp();
  const total = evidence.length;
  const verified = isTampered ? Math.max(0, total - 1) : total;
  const ratioStr = total > 0 ? `${verified} / ${total}` : '0 / 0';

  return (
    <div className={`rounded-2xl border p-6 flex flex-col justify-between transition-all shadow-xl ${
      isTampered 
        ? 'bg-red-950/20 border-red-800/60 shadow-red-950/30' 
        : 'bg-[#0B1017] border-[#1E293B]/80'
    }`}>
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]/60">
          <div className="flex items-center gap-2.5">
            {isTampered ? (
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Chain of Custody Integrity
            </h3>
          </div>
          <button
            onClick={() => navigate('/integrity')}
            className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
          >
            <span>Center</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono tracking-tight text-[#F8FAFC]">
              {ratioStr}
            </span>
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
              isTampered ? 'bg-red-950/80 text-red-400 border border-red-800/60' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
            }`}>
              {isTampered ? '1 MODIFIED' : (total > 0 ? '100% VERIFIED' : 'READY')}
            </span>
          </div>

          <p className="text-xs text-[#94A3B8] mt-2.5 leading-relaxed">
            {isTampered ? (
              <span className="text-red-300 font-medium">
                WARNING: SHA-256 mismatch detected on confidential.pdf. The current file contents do not match initial seizure hash.
              </span>
            ) : (
              'All forensic image files match initial hardware seizure digests. No post-seizure bit alteration detected.'
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-[#1E293B]/60">
        {isTampered ? (
          <button
            onClick={restoreIntegrityState}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESTORE DEMO INTEGRITY</span>
          </button>
        ) : (
          <button
            onClick={simulateIntegrityTamper}
            className="w-full py-2.5 px-3 rounded-xl bg-[#080D15] hover:bg-red-950/40 border border-[#1E293B] hover:border-red-600/50 text-[#94A3B8] hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors font-mono"
            title="Simulate modifying confidential.pdf hash to test tamper detection"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>SIMULATE TAMPER EVENT</span>
          </button>
        )}
      </div>
    </div>
  );
};
