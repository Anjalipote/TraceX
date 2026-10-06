import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  ArrowRight, 
  FileText, 
  Clock, 
  Info,
  ChevronRight,
  Sliders,
  Layers,
  Activity,
  AlertTriangle,
  Fingerprint,
  Zap
} from 'lucide-react';
import { SeverityBadge } from '../common/SeverityBadge';
import { useApp } from '../../context/AppContext';

export const RiskBreakdown: React.FC = () => {
  const navigate = useNavigate();
  const { riskSummary, riskFactors, isTampered } = useApp();
  const [selectedFactorId, setSelectedFactorId] = useState<string>(riskFactors[0]?.id || 'risk-usb');

  const selectedFactor = riskFactors.find(f => f.id === selectedFactorId) || riskFactors[0] || {
    id: 'risk-usb',
    title: 'USB Activity',
    contribution: 15,
    severity: 'HIGH' as const,
    category: 'Hardware & Storage',
    description: 'Unauthorized Kingston DataTraveler 3.0 mounted establishing a writable exfiltration channel.',
    evidenceIds: ['ev-007'],
    eventIds: ['evt-003'],
    mitreTactic: 'Physical Hardware'
  };

  const totalScore = riskSummary.score ?? 0;
  const isZeroRisk = totalScore === 0;

  // Phase 3 Multi-Dimensional Contributions
  const dimensions = [
    { label: 'Severity Dimension', points: riskSummary.severityContribution ?? 0, max: 30, color: 'bg-red-500', text: 'text-red-400', desc: isZeroRisk ? 'Zero high-severity findings' : 'From correlated threat findings' },
    { label: 'Evidence Dimension', points: riskSummary.evidenceContribution ?? 0, max: 25, color: 'bg-amber-500', text: 'text-amber-400', desc: isZeroRisk ? 'Clean inert artifacts' : 'Classified or flagged artifacts' },
    { label: 'Correlation Dimension', points: riskSummary.correlationContribution ?? 0, max: 25, color: 'bg-blue-500', text: 'text-blue-400', desc: isZeroRisk ? 'Zero suspicious patterns' : 'Correlated action sequences' },
    { label: 'Anomaly Dimension', points: riskSummary.anomalyContribution ?? 0, max: 20, color: 'bg-cyan-500', text: 'text-cyan-400', desc: isZeroRisk ? 'Zero telemetry anomalies' : 'Temporal proximity & anomalies' },
    { label: 'Timeline Dimension', points: riskSummary.timelineContribution ?? 0, max: 15, color: 'bg-purple-500', text: 'text-purple-400', desc: isZeroRisk ? 'Standard baseline sequence' : 'Clustered threat execution window' },
    { label: 'Integrity Dimension', points: isTampered ? 15 : (riskSummary.integrityContribution ?? 0), max: 15, color: isTampered ? 'bg-red-500' : 'bg-emerald-500', text: isTampered ? 'text-red-400' : 'text-emerald-400', desc: isTampered ? 'CRITICAL: Hash mismatch detected!' : '100% Cryptographic Match' },
  ];

  return (
    <div className="space-y-10">
      {/* Big Score Meter Banner */}
      <div className={`rounded-2xl bg-gradient-to-b from-[#0B1017] to-[#070A0F] border ${isZeroRisk ? 'border-emerald-900/40' : (totalScore >= 80 ? 'border-red-900/50' : 'border-amber-900/40')} p-8 lg:p-10 shadow-2xl relative overflow-hidden`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-2xl ${isZeroRisk ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-400' : (totalScore >= 80 ? 'bg-red-950/60 border border-red-800/80 text-red-400' : 'bg-amber-950/60 border border-amber-800/80 text-amber-400')}`}>
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold tracking-widest text-[#94A3B8] uppercase">
                  FORENSIC TRIAGE ENGINE (PHASE 3)
                </span>
                <h2 className="text-2xl lg:text-3xl font-black text-[#F8FAFC] tracking-tight font-mono">
                  {riskSummary.title || "Investigation Priority Score"}
                </h2>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {riskSummary.explanation || (isZeroRisk ? "Baseline verification complete. No threat factors, integrity violations, or forensic anomalies detected." : "Multi-factor threat analysis computed across acquired telemetry.")}
            </p>

            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-[11px] text-[#94A3B8] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong>Forensic Standard Notice:</strong> This score represents <em>investigative triage urgency</em> and correlation confidence. It does <strong>NOT</strong> assert legal guilt or criminal offense.
              </span>
            </div>
          </div>

          {/* Large Gauge / Score Display */}
          <div className={`flex flex-col items-center justify-center p-8 rounded-2xl bg-[#080D15] border ${isZeroRisk ? 'border-emerald-900/60' : (totalScore >= 80 ? 'border-red-900/60' : 'border-amber-900/60')} shadow-xl min-w-[260px]`}>
            <span className="text-[11px] font-mono uppercase font-bold text-[#64748B] tracking-wider">
              Investigation Priority Score
            </span>

            <div className="my-3 flex items-baseline gap-1.5">
              <span className={`text-6xl font-black font-mono ${isZeroRisk ? 'text-emerald-400' : (totalScore >= 80 ? 'text-red-400' : 'text-amber-400')} tracking-tighter`}>
                {totalScore}
              </span>
              <span className="text-lg font-mono text-[#64748B]">/ 100</span>
            </div>

            <SeverityBadge severity={isZeroRisk ? 'LOW' : (riskSummary.severity || 'CRITICAL')} size="lg" />

            <div className="w-full mt-5 h-2 rounded-full bg-[#111923] overflow-hidden">
              <div 
                className={`h-full ${isZeroRisk ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-red-500'}`}
                style={{ width: `${Math.max(totalScore === 0 ? 3 : 0, Math.min(totalScore, 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 4: RISK TREND EVOLUTION & EXPLAINABILITY */}
      <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B] p-8 space-y-6 shadow-forensic">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]/60">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${isZeroRisk ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'} flex items-center justify-center`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] font-mono uppercase tracking-tight">
                Risk Trend Evolution & Score Change Explanation
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Forensic algorithmic audit explaining why priority score escalated across acquisition milestones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#64748B]">Trend Trajectory:</span>
            <span className={`text-xs font-mono font-bold ${isZeroRisk ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/60' : 'text-red-400 bg-red-950/40 border border-red-800/60'} px-2.5 py-1 rounded-lg flex items-center gap-1.5`}>
              <span>{isZeroRisk ? 'STABLE BASELINE (0 PTS)' : `+${Math.max(0, totalScore - 45)} PTS ESCALATION`}</span>
            </span>
          </div>
        </div>

        {/* 3 Metric Comparison Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1">
            <span className="text-[#64748B] text-[10px] uppercase block">BASELINE INGESTION SCORE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#94A3B8]">45</span>
              <span className="text-xs text-[#64748B]">/ 100</span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded ml-auto">
                MEDIUM
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-sans">
              Initial triage status prior to heuristic pattern correlation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1">
            <span className="text-[#64748B] text-[10px] uppercase block">CURRENT CORRELATED SCORE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400">87</span>
              <span className="text-xs text-[#64748B]">/ 100</span>
              <span className="text-[10px] font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded ml-auto">
                CRITICAL
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-sans">
              Calculated following automated activity clustering and anomaly detection.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#070A0F] border border-red-900/40 space-y-1">
            <span className="text-red-400 text-[10px] uppercase font-bold block">NET SCORE DELTA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-400">+42</span>
              <span className="text-xs text-red-400">POINTS</span>
              <span className="text-[10px] font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded ml-auto">
                URGENT
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-sans">
              Score escalation triggered by 4 critical findings and 3 correlated patterns.
            </p>
          </div>
        </div>

        {/* Narrative Reason Why Score Changed */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/20 to-blue-950/20 border border-red-900/30 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-mono font-bold text-[#F8FAFC]">
              Algorithmic Explanation for Score Change:
            </span>
          </div>
          <p className="text-[#CBD5E1] leading-relaxed pl-6">
            &quot;Risk priority escalated from <strong>45 (MEDIUM)</strong> to <strong>87 (CRITICAL)</strong> because <strong>2 high-severity findings</strong> and <strong>3 correlated suspicious activities</strong> (USB connection followed within 120s by confidential file read and external staging) were verified. Furthermore, <strong>1 anti-forensics anomaly</strong> (42 files unlinked in 18s) heavily amplified the priority rating.&quot;
          </p>
        </div>

        {/* Chronological Milestone Milestones */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-[#64748B]">Score Trajectory Milestones</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[11px]">
              <span className="text-[#64748B] block text-[9px]">09:00 UTC • INGESTION</span>
              <span className="text-[#94A3B8] font-bold">Base Telemetry: 25</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[11px]">
              <span className="text-[#64748B] block text-[9px]">09:45 UTC • USB MOUNT</span>
              <span className="text-amber-400 font-bold">External Storage: 45</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[11px]">
              <span className="text-[#64748B] block text-[9px]">09:48 UTC • EXFIL STAGE</span>
              <span className="text-orange-400 font-bold">Classified Read: 68</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-red-900/50 text-[11px]">
              <span className="text-red-400 block text-[9px]">09:55 UTC • PURGE LOGS</span>
              <span className="text-red-400 font-bold">Wiper Activity: 87</span>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 3: MULTI-DIMENSIONAL CONTRIBUTION BREAKDOWN */}
      <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]/60 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] font-mono uppercase">
                Multi-Dimensional Score Breakdown
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Explainable composition across 6 discrete forensic dimensions
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-3 py-1 rounded-lg">
            Deterministic Formula
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dimensions.map((dim, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#080D15] border border-[#1E293B] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#F8FAFC]">{dim.label}</span>
                <span className={`text-xs font-mono font-bold ${dim.text}`}>
                  +{dim.points} / {dim.max}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#111923] overflow-hidden">
                <div 
                  className={`h-full ${dim.color}`}
                  style={{ width: `${Math.min((dim.points / dim.max) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-tight">
                {dim.desc}
              </p>
            </div>
          ))}
        </div>

        {riskSummary.calculationExplanation && (
          <div className="p-4 rounded-xl bg-[#111923]/70 border border-[#1E293B] text-xs text-[#CBD5E1] space-y-1">
            <span className="font-mono text-[10px] uppercase font-bold text-blue-400 block">
              Calculation Explanation
            </span>
            <p className="leading-relaxed">
              {riskSummary.calculationExplanation}
            </p>
          </div>
        )}
      </div>

      {/* Factor Breakdown & Drill-Down Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Factor List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/60">
            <h3 className="text-sm font-bold text-[#F8FAFC] font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              RISK CONTRIBUTION FACTORS
            </h3>
            <span className="text-xs font-mono text-[#94A3B8]">
              Factors Count: <strong className="text-red-400 font-bold">{riskFactors.length}</strong>
            </span>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Click any factor below to inspect the corresponding forensic artifacts, timestamps, and correlated evidence.
          </p>

          <div className="space-y-3 pt-2">
            {riskFactors.map((factor) => {
              const isSelected = factor.id === selectedFactorId;

              return (
                <div
                  key={factor.id}
                  onClick={() => setSelectedFactorId(factor.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-5 ${
                    isSelected
                      ? 'bg-[#111923] border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                      : 'bg-[#0B1017] border-[#1E293B]/70 hover:border-blue-500/30 hover:bg-[#0E1522]'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-[#F8FAFC]">
                        {factor.title}
                      </h4>
                      <SeverityBadge severity={factor.severity} size="sm" />
                      {factor.confidence && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {factor.confidence} Conf.
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] line-clamp-1">
                      {factor.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-3.5 py-1.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 font-mono font-bold text-xs">
                      +{factor.contribution}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-[#64748B] transition-transform ${
                      isSelected ? 'text-blue-400 translate-x-1' : ''
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Factor Detail & Artifact Drilldown */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-7 space-y-6 sticky top-24 shadow-xl">
            <div className="pb-4 border-b border-[#1E293B]/60">
              <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                SELECTED FACTOR DEEP DIVE
              </span>
              <h3 className="text-lg font-bold text-[#F8FAFC] mt-1">
                {selectedFactor.title}
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#080D15] border border-[#1E293B]">
                <span className="text-[#64748B] font-mono text-[11px] uppercase block mb-1.5">
                  Tactical Impact
                </span>
                <p className="text-[#F8FAFC] leading-relaxed">
                  {selectedFactor.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-[#080D15] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block">Category</span>
                  <span className="text-[#F8FAFC] font-semibold mt-0.5 block">{selectedFactor.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#080D15] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block">MITRE Tactic</span>
                  <span className="text-cyan-400 font-semibold mt-0.5 block">{selectedFactor.mitreTactic}</span>
                </div>
              </div>

              {/* Linked Evidence Files */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-mono text-[#64748B] uppercase font-bold block">
                  Correlated Evidence Files
                </span>
                <div className="space-y-2">
                  {(selectedFactor.evidenceIds || []).map((evId) => (
                    <button
                      key={evId}
                      onClick={() => navigate(`/evidence?selected=${evId}`)}
                      className="w-full p-2.5 rounded-xl bg-[#080D15] hover:bg-[#111923] border border-[#1E293B] flex items-center justify-between text-xs text-left group transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="font-mono text-[#F8FAFC] group-hover:text-blue-300">{evId}</span>
                      </div>
                      <span className="text-[11px] text-blue-400 flex items-center gap-0.5">
                        Inspect <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Linked Events */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-mono text-[#64748B] uppercase font-bold block">
                  Triggering Timeline Events
                </span>
                <div className="space-y-2">
                  {(selectedFactor.eventIds || []).map((evtId) => (
                    <button
                      key={evtId}
                      onClick={() => navigate('/timeline')}
                      className="w-full p-2.5 rounded-xl bg-[#080D15] hover:bg-[#111923] border border-[#1E293B] flex items-center justify-between text-xs text-left group transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-[#F8FAFC] group-hover:text-amber-300">{evtId}</span>
                      </div>
                      <span className="text-[11px] text-blue-400 flex items-center gap-0.5">
                        View Event <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
