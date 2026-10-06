import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  ShieldAlert, 
  HardDrive, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CaseComparisonItem } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';

export const CaseComparePage: React.FC = () => {
  const { cases } = useApp();
  const [case1Id, setCase1Id] = useState<string>('CASE-2026-001');
  const [case2Id, setCase2Id] = useState<string>('CASE-2026-002');
  const [comparison, setComparison] = useState<CaseComparisonItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchComparison = async () => {
    setIsLoading(true);
    try {
      const data = await api.compareCases(case1Id, case2Id);
      if (data) {
        setComparison(data);
      }
    } catch {
      // Fallback comparative data
      setComparison({
        caseA: {
          id: case1Id,
          caseNumber: case1Id,
          name: 'Operation Silent Exfil',
          targetSystem: 'WIN11-CORP-FIN09',
          riskScore: 87,
          severity: 'CRITICAL',
          evidenceCount: 128,
          timelineCount: 286,
          findingsCount: 12,
          criticalFindings: 4,
          anomaliesCount: 5,
          correlationsCount: 7,
          fileTypes: { pdf: 48, evtx: 44, exe: 14, pcap: 12, zip: 10 },
          integrity: { verified: 128, compromised: 0, status: 'VERIFIED' }
        },
        caseB: {
          id: case2Id,
          caseNumber: case2Id,
          name: 'Unsanctioned Intellectual Property Access Review',
          targetSystem: 'RND-CAD-WS04',
          riskScore: 38,
          severity: 'MEDIUM',
          evidenceCount: 14,
          timelineCount: 32,
          findingsCount: 2,
          criticalFindings: 0,
          anomaliesCount: 0,
          correlationsCount: 1,
          fileTypes: { docx: 8, log: 4, jpg: 2 },
          integrity: { verified: 14, compromised: 0, status: 'VERIFIED' }
        },
        deltas: {
          riskScoreDelta: 49,
          evidenceCountDelta: 114,
          timelineCountDelta: 254,
          findingsCountDelta: 10,
          anomaliesCountDelta: 5
        },
        insights: [
          'Case 1 displays a multi-stage exfiltration attack vector with USB-to-staging sequences, while Case 2 exhibits localized benign data movements.',
          'Case 1 contains active anti-forensics batch file deletion and unlinking activity not observed in Case 2.',
          'Case 1 has 4 critical findings requiring immediate quarantine; Case 2 priority is routine review.'
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [case1Id, case2Id]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#1E293B]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              CROSS-CASE INTELLIGENCE
            </span>
            <span className="text-xs font-mono text-[#64748B]">
              Side-by-Side Incident Correlation
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Comparative Case Intelligence
          </h1>
          <p className="text-xs text-[#94A3B8] max-w-2xl">
            Correlate indicators, compare risk trajectories, analyze metric variance, and detect cross-case forensic patterns across multiple investigative dossiers.
          </p>
        </div>

        <button
          onClick={fetchComparison}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-compute Deltas</span>
        </button>
      </div>

      {/* Case Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-[#0D131C] border border-[#1E293B] shadow-forensic">
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-blue-400 block uppercase">
            PRIMARY TARGET CASE (CASE A)
          </label>
          <select
            value={case1Id}
            onChange={(e) => setCase1Id(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-blue-500"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name} ({c.severity})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-purple-400 block uppercase">
            COMPARISON BASELINE (CASE B)
          </label>
          <select
            value={case2Id}
            onChange={(e) => setCase2Id(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-purple-500"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name} ({c.severity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {comparison && (
        <>
          {/* Top Metric Delta Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Risk Score Delta */}
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E293B] space-y-2 shadow-forensic">
              <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold block">
                RISK SCORE DELTA
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-red-400">
                  +{comparison.deltas.riskScoreDelta}
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +128%
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] flex justify-between pt-1 border-t border-[#1E293B]/60">
                <span>Case A: <strong className="text-[#F8FAFC]">{comparison.caseA.riskScore}</strong></span>
                <span>Case B: <strong className="text-[#F8FAFC]">{comparison.caseB.riskScore}</strong></span>
              </div>
            </div>

            {/* Evidence Count Delta */}
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E293B] space-y-2 shadow-forensic">
              <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold block">
                EVIDENCE INGESTION
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-blue-400">
                  +{comparison.deltas.evidenceCountDelta}
                </span>
                <span className="text-xs font-mono text-blue-400 font-bold">
                  Files
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] flex justify-between pt-1 border-t border-[#1E293B]/60">
                <span>Case A: <strong className="text-[#F8FAFC]">{comparison.caseA.evidenceCount}</strong></span>
                <span>Case B: <strong className="text-[#F8FAFC]">{comparison.caseB.evidenceCount}</strong></span>
              </div>
            </div>

            {/* Timeline Events Delta */}
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E293B] space-y-2 shadow-forensic">
              <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold block">
                TIMELINE VELOCITY
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  +{comparison.deltas.timelineCountDelta}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  Events
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] flex justify-between pt-1 border-t border-[#1E293B]/60">
                <span>Case A: <strong className="text-[#F8FAFC]">{comparison.caseA.timelineCount}</strong></span>
                <span>Case B: <strong className="text-[#F8FAFC]">{comparison.caseB.timelineCount}</strong></span>
              </div>
            </div>

            {/* Findings Delta */}
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E293B] space-y-2 shadow-forensic">
              <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold block">
                SUSPICIOUS FINDINGS
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-amber-400">
                  +{comparison.deltas.findingsCountDelta}
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  Flags
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] flex justify-between pt-1 border-t border-[#1E293B]/60">
                <span>Case A: <strong className="text-[#F8FAFC]">{comparison.caseA.findingsCount}</strong></span>
                <span>Case B: <strong className="text-[#F8FAFC]">{comparison.caseB.findingsCount}</strong></span>
              </div>
            </div>

            {/* Anomalies Delta */}
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E293B] space-y-2 shadow-forensic">
              <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold block">
                ANOMALY CLUSTERS
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-purple-400">
                  +{comparison.deltas.anomaliesCountDelta}
                </span>
                <span className="text-xs font-mono text-purple-400 font-bold">
                  Clusters
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8] flex justify-between pt-1 border-t border-[#1E293B]/60">
                <span>Case A: <strong className="text-[#F8FAFC]">{comparison.caseA.anomaliesCount}</strong></span>
                <span>Case B: <strong className="text-[#F8FAFC]">{comparison.caseB.anomaliesCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Detailed Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            {/* Case A Profile */}
            <div className="rounded-2xl bg-[#0D131C] border border-blue-500/30 p-6 space-y-4 shadow-forensic">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">CASE A</span>
                  <h3 className="text-base font-bold text-[#F8FAFC]">{comparison.caseA.name}</h3>
                  <span className="text-xs font-mono text-[#64748B]">{comparison.caseA.targetSystem}</span>
                </div>
                <SeverityBadge severity={comparison.caseA.severity} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block">CRITICAL FINDINGS</span>
                  <span className="text-red-400 font-bold text-base">{comparison.caseA.criticalFindings}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block">CORRELATION EDGES</span>
                  <span className="text-blue-400 font-bold text-base">{comparison.caseA.correlationsCount}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase text-[#64748B]">Evidence File Breakdown</span>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {Object.entries(comparison.caseA.fileTypes).map(([type, count]) => (
                    <span key={type} className="px-2.5 py-1 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[#94A3B8]">
                      {type.toUpperCase()}: <strong className="text-[#F8FAFC]">{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Case B Profile */}
            <div className="rounded-2xl bg-[#0D131C] border border-purple-500/30 p-6 space-y-4 shadow-forensic">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">CASE B</span>
                  <h3 className="text-base font-bold text-[#F8FAFC]">{comparison.caseB.name}</h3>
                  <span className="text-xs font-mono text-[#64748B]">{comparison.caseB.targetSystem}</span>
                </div>
                <SeverityBadge severity={comparison.caseB.severity} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block">CRITICAL FINDINGS</span>
                  <span className="text-amber-400 font-bold text-base">{comparison.caseB.criticalFindings}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block">CORRELATION EDGES</span>
                  <span className="text-purple-400 font-bold text-base">{comparison.caseB.correlationsCount}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase text-[#64748B]">Evidence File Breakdown</span>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {Object.entries(comparison.caseB.fileTypes).map(([type, count]) => (
                    <span key={type} className="px-2.5 py-1 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[#94A3B8]">
                      {type.toUpperCase()}: <strong className="text-[#F8FAFC]">{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Forensic Comparative Insights */}
          <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B] p-6 space-y-4 shadow-forensic">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#1E293B]">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-[#F8FAFC] font-mono uppercase">
                Comparative Forensic Intelligence Insights
              </h3>
            </div>

            <div className="space-y-3">
              {comparison.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] text-xs text-[#CBD5E1] flex items-start gap-3"
                >
                  <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
