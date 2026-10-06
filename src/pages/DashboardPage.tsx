import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HardDrive, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  FolderLock, 
  ArrowUpRight, 
  ChevronRight, 
  Sparkles,
  Loader2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { InvestigationStory } from '../components/dashboard/InvestigationStory';
import { ActivityClusterWidget } from '../components/dashboard/ActivityClusterWidget';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { EvidenceSummaryWidget } from '../components/dashboard/EvidenceSummaryWidget';
import { IntegritySummaryWidget } from '../components/dashboard/IntegritySummaryWidget';
import { FindingCard } from '../components/findings/FindingCard';
import { EvidenceGapsWidget } from '../components/dashboard/EvidenceGapsWidget';
import { CaseActivityFeed } from '../components/dashboard/CaseActivityFeed';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentCase, 
    evidence,
    timeline,
    findings, 
    riskSummary,
    anomalies,
    isTampered, 
    isAnalyzing, 
    runAnalysisPipeline, 
    analysisJob 
  } = useApp();

  const totalEvidence = evidence.length;
  const docCount = evidence.filter(e => e.fileType?.toLowerCase().includes('doc') || e.fileType?.toLowerCase().includes('pdf') || e.category === 'Document').length;
  const logCount = evidence.filter(e => e.fileType?.toLowerCase().includes('log') || e.category === 'Log').length;
  const binCount = evidence.filter(e => e.fileType?.toLowerCase().includes('bin') || e.fileType?.toLowerCase().includes('exe') || e.category === 'Executable').length;
  const evidenceSubtitle = totalEvidence === 0 
    ? '0 Evidence Files Ingested' 
    : `${docCount} Docs • ${logCount} Logs • ${binCount} Binaries`;

  const totalEvents = timeline.length;
  const anomalyCount = anomalies.length;
  const timelineSubtitle = anomalyCount === 0 
    ? 'Chronological Event Baseline' 
    : `${anomalyCount} Correlated Anomalies`;

  const totalFindings = findings.length;
  const critFindings = findings.filter(f => f.severity === 'CRITICAL').length;
  const highFindings = findings.filter(f => f.severity === 'HIGH').length;
  const findingsSubtitle = totalFindings === 0 
    ? '0 Active Threat Findings' 
    : `${critFindings} Critical • ${highFindings} High`;

  const currentRiskScore = riskSummary?.score ?? 0;
  const isZeroRisk = currentRiskScore === 0;
  const riskSubtitle = isZeroRisk 
    ? 'Clean Baseline (No Risk Detected)' 
    : (currentRiskScore >= 80 ? 'Urgent Triage Required' : currentRiskScore >= 60 ? 'Active Threats Identified' : 'Moderate Priority');
  const riskSeverity = isZeroRisk ? 'LOW' : (riskSummary?.severity || currentCase.severity || 'LOW');

  const compromisedCount = isTampered ? 1 : 0;
  const verifiedCount = Math.max(0, totalEvidence - compromisedCount);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-[#1E293B]/60">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25">
              {currentCase.id}
            </span>
            <SeverityBadge severity={riskSeverity as any} size="sm" />
            <span className="text-xs font-mono text-[#64748B] hidden sm:inline">
              Host: {currentCase.targetSystem}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            {currentCase.name}
          </h1>
          <p className="text-xs text-[#94A3B8] max-w-3xl leading-relaxed">
            {currentCase.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto flex-wrap">
          {/* Phase 3 Pipeline Trigger */}
          <button
            onClick={runAnalysisPipeline}
            disabled={isAnalyzing}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all border ${
              isAnalyzing
                ? 'bg-blue-950/60 text-blue-300 border-blue-700/50 cursor-not-allowed'
                : 'bg-[#0E1522] hover:bg-blue-600/20 text-blue-400 hover:text-white border-blue-500/40 hover:border-blue-500'
            }`}
            title="Execute Phase 3 Advanced Forensic Analysis Pipeline"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Analyzing Evidence...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Run Analysis Pipeline</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/cases')}
            className="px-4 py-2.5 rounded-xl bg-[#0B1017] hover:bg-[#111923] text-xs font-mono text-[#94A3B8] hover:text-white border border-[#1E293B] transition-colors"
          >
            Switch Case Vault
          </button>
          
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <span>Dossier Report</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analysis Pipeline Status Ribbon (Active or Completed) */}
      {isAnalyzing && (
        <div className="rounded-2xl bg-blue-950/30 border border-blue-500/50 p-4 flex items-center justify-between gap-4 animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <div className="text-xs font-mono">
              <span className="font-bold text-[#F8FAFC]">Forensic Analysis Pipeline Active: </span>
              <span className="text-blue-300">Extracting metadata, clustering activity sequences, and identifying forensic anomalies...</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50">
            Phase 3 Engine
          </span>
        </div>
      )}

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4.5">
        <MetricCard
          title="EVIDENCE FILES"
          value={totalEvidence.toString()}
          subtitle={evidenceSubtitle}
          icon={HardDrive}
          variant="default"
          onClick={() => navigate('/evidence')}
        />

        <MetricCard
          title="TIMELINE EVENTS"
          value={totalEvents.toString()}
          subtitle={timelineSubtitle}
          icon={Clock}
          variant="cyan"
          onClick={() => navigate('/timeline')}
        />

        <MetricCard
          title="FINDINGS"
          value={totalFindings.toString()}
          subtitle={findingsSubtitle}
          icon={AlertTriangle}
          variant={totalFindings === 0 ? "default" : "warning"}
          onClick={() => navigate('/findings')}
        />

        <MetricCard
          title="RISK SCORE"
          value={`${currentRiskScore}/100`}
          subtitle={riskSubtitle}
          badge={<SeverityBadge severity={riskSeverity as any} size="sm" />}
          icon={ShieldAlert}
          variant={isZeroRisk ? "success" : (currentRiskScore >= 80 ? "critical" : "warning")}
          onClick={() => navigate('/risk')}
        />

        <MetricCard
          title="INTEGRITY"
          value={totalEvidence > 0 ? `${verifiedCount}/${totalEvidence}` : "0/0"}
          subtitle={isTampered ? "1 File Tampered" : (totalEvidence > 0 ? "100% Cryptographic Match" : "Ready for Ingestion")}
          badge={
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              isTampered ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}>
              {isTampered ? 'MODIFIED' : 'VERIFIED'}
            </span>
          }
          icon={isTampered ? ShieldAlert : ShieldCheck}
          variant={isTampered ? "critical" : "success"}
          onClick={() => navigate('/integrity')}
        />
      </div>

      {/* SIGNATURE FEATURE: INVESTIGATION STORY */}
      <section className="space-y-4">
        <InvestigationStory />
      </section>

      {/* PHASE 3 CORRELATED ACTIVITY SEQUENCE & ANOMALIES */}
      <section className="space-y-4">
        <ActivityClusterWidget />
      </section>

      {/* Middle Grid: Activity Chart & Summary Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        <div className="lg:col-span-8">
          <ActivityChart />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <EvidenceSummaryWidget />
          <IntegritySummaryWidget />
        </div>
      </div>

      {/* PHASE 4 INVESTIGATION INTELLIGENCE & TELEMETRY GAPS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <EvidenceGapsWidget />
        <CaseActivityFeed />
      </div>

      {/* Bottom Section: Recent Findings Highlights */}
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/60">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Critical Investigation Findings</span>
            </h3>
            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
              Key suspicious behaviors flagged by automated evidence correlation
            </p>
          </div>
          <button
            onClick={() => navigate('/findings')}
            className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>View All 12 Findings</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {findings.slice(0, 2).map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </div>
    </div>
  );
};
