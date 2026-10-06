import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Layers, 
  GitBranch, 
  Info,
  Database
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExplainabilityTraceItem, ConfidenceLevel } from '../types';
import { api } from '../services/api';

const DEFAULT_TRACES: ExplainabilityTraceItem[] = [
  {
    id: 'exp-01',
    category: 'Activity Cluster',
    targetTitle: 'USB Data Exfiltration Sequence',
    inputEvidence: 'setupapi.dev.log (ev-007) + confidential.pdf (ev-001) + Windows Event 4663 (evt-004)',
    analysisRule: 'RULE-USB-EXFIL-01: Removable Media Temporal Sequence Heuristic',
    detectedPattern: 'USB device connection followed within 120 seconds by sensitive document access and volume copy',
    result: 'Correlated 5-step Activity Cluster with Critical triage priority',
    confidence: 'HIGH',
    confidenceReason: 'Verified by synchronized USBSTOR timestamps and MFT file update event records.',
    whySuspicious: 'Standard business workflows rarely involve mounting personal USB drives directly prior to bulk confidential file access.',
    recommendedCheck: 'Examine USB device serial number in Windows Registry (Enum/USBSTOR) and compare against enterprise authorized device inventory.'
  },
  {
    id: 'exp-02',
    category: 'Finding',
    targetTitle: 'Anti-Forensics Batch File Deletion',
    inputEvidence: 'MFT Entry #48190 + Security.evtx Event 4660 (Object Deleted)',
    analysisRule: 'RULE-ANOMALY-PURGE-04: High-Velocity Rapid Unlink Detector',
    detectedPattern: '42 individual file deletion requests submitted within an 18-second burst',
    result: 'Generated Finding: Anti-Forensic Deletion with High Severity',
    confidence: 'HIGH',
    confidenceReason: 'Process ID corresponding to cleanup.bat issued consecutive NtDeleteFile syscalls.',
    whySuspicious: 'Deletion burst immediately followed execution of unsigned binary suspicious.exe.',
    recommendedCheck: 'Analyze Volume Shadow Copies (VSS) or carve unallocated space to recover deleted file headers.'
  },
  {
    id: 'exp-03',
    category: 'Anomaly',
    targetTitle: 'Rapid Access Gap (128 Seconds)',
    inputEvidence: 'setupapi.dev.log (09:45:12) vs Acrobat.exe file open (09:47:20)',
    analysisRule: 'RULE-TEMP-PROXIMITY-02: Temporal Velocity Threshold Check',
    detectedPattern: 'Interval between device mount and confidential file access is 128s, below the normal user baseline (median 900s)',
    result: 'Flagged Anomaly: Highly compressed access timeline',
    confidence: 'HIGH',
    confidenceReason: 'Microsecond-precision timestamps across both local filesystem and event logs match perfectly.',
    whySuspicious: 'Indicates premeditated or automated action rather than casual workstation usage.',
    recommendedCheck: 'Correlate with command-line history or PowerShell ConsoleHistory logs for scripted execution.'
  },
  {
    id: 'exp-04',
    category: 'Topological Relationship',
    targetTitle: 'suspicious.exe ↔ Network Gateway C2 Connection',
    inputEvidence: 'sysmon.evtx Event 3 (Network Connection) + suspicious.exe (ev-002)',
    analysisRule: 'RULE-GRAPH-REL-09: Direct Child Process Network Egress',
    detectedPattern: 'Process started from staging directory initiated outbound socket to external IP 198.51.100.44:8443',
    result: 'Established Graph Edge: Process-to-RemoteHost with 90% correlation strength',
    confidence: 'MEDIUM',
    confidenceReason: 'Full packet payload was unavailable due to missing network PCAP capture during the incident window.',
    whySuspicious: 'Destination IP has negative reputational indicators and matches known Cobalt Strike staging profiles.',
    recommendedCheck: 'Request border firewall state table and external DNS query logs for domain lookups matching IP.'
  },
  {
    id: 'exp-05',
    category: 'Finding',
    targetTitle: 'Unsigned Executable Execution from User Temp Directory',
    inputEvidence: 'suspicious.exe (ev-002) + Amcache.hve entry',
    analysisRule: 'RULE-BIN-REPUTATION-03: PE Authenticode & Path Anomaly Analyzer',
    detectedPattern: 'Binary lacks digital signature, has high PE section entropy (7.84), and executed from AppData/Local/Temp',
    result: 'Generated Finding: Potential Execution of Obfuscated Binary',
    confidence: 'HIGH',
    confidenceReason: 'Authenticode verification returned TRUST_E_NOSIGNATURE with packed UPX sections.',
    whySuspicious: 'Execution of packed, unsigned code from temporary folders is a primary vector for persistence and droppers.',
    recommendedCheck: 'Submit binary SHA-256 (e3b0c442...) to internal offline malware sandboxing vault.'
  }
];

export const ExplainabilityPage: React.FC = () => {
  const { currentCase } = useApp();
  const [traces, setTraces] = useState<ExplainabilityTraceItem[]>(DEFAULT_TRACES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMatrix = async () => {
      setIsLoading(true);
      try {
        const liveTraces = await api.getExplainabilityMatrix(currentCase.id);
        if (isMounted && liveTraces && liveTraces.length > 0) {
          setTraces(liveTraces);
        }
      } catch {
        // Fallback to default traces
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchMatrix();
    return () => { isMounted = false; };
  }, [currentCase.id]);

  const categories = ['ALL', 'Finding', 'Anomaly', 'Activity Cluster', 'Topological Relationship'];

  const filteredTraces = traces.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesConfidence = selectedConfidence === 'ALL' || item.confidence === selectedConfidence;
    const matchesSearch = 
      item.targetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.analysisRule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inputEvidence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.detectedPattern.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesConfidence && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#1E293B]/60 space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            PHASE 4 CORE INTELLIGENCE
          </span>
          <span className="text-xs font-mono text-[#64748B]">
            Case: <strong className="text-[#94A3B8]">{currentCase.id}</strong>
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F8FAFC]">
          Forensic Explainability Center
        </h1>
        <p className="text-xs text-[#94A3B8] max-w-3xl leading-relaxed">
          Full decision audit trails: <span className="text-blue-400 font-mono">Input Evidence → Analysis Rule → Detected Pattern → Result → Confidence</span>. Every finding, correlation, and risk score factor is transparently substantiated with deterministic heuristics and supporting telemetry.
        </p>
      </div>

      {/* Decision Pipeline Infographic Banner */}
      <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B] p-6 shadow-forensic">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <Database className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-[#F8FAFC]">Raw Evidence</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#475569] hidden lg:block" />
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-[#F8FAFC]">Analysis Rule</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#475569] hidden lg:block" />
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-[#F8FAFC]">Detected Pattern</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#475569] hidden lg:block" />
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-[#F8FAFC]">Finding / Cluster</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#475569] hidden lg:block" />
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-[#F8FAFC]">Confidence Rationale</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0D131C] border border-[#1E293B]">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-[#070A0F] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Confidence Filter */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search rules, evidence, patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedConfidence}
            onChange={(e) => setSelectedConfidence(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#94A3B8] focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Confidence</option>
            <option value="HIGH">High Confidence</option>
            <option value="MEDIUM">Medium Confidence</option>
            <option value="LOW">Low Confidence</option>
          </select>
        </div>
      </div>

      {/* Decision Trails List */}
      <div className="space-y-6">
        {filteredTraces.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0D131C] border border-[#1E293B] space-y-2">
            <HelpCircle className="w-8 h-8 text-[#64748B] mx-auto" />
            <h4 className="text-sm font-bold text-[#F8FAFC]">No decision traces found</h4>
            <p className="text-xs text-[#94A3B8]">Try adjusting your search criteria or category filter.</p>
          </div>
        ) : (
          filteredTraces.map((trace) => (
            <div
              key={trace.id}
              className="rounded-2xl bg-[#0D131C] border border-[#1E293B] hover:border-blue-500/40 transition-all p-6 space-y-5 shadow-forensic"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E293B]/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25">
                      {trace.category.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-[#64748B]">
                      Trace ID: <strong className="text-[#94A3B8]">{trace.id}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">
                    {trace.targetTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#64748B]">Confidence:</span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                    trace.confidence === 'HIGH'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : trace.confidence === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {trace.confidence}
                  </span>
                </div>
              </div>

              {/* 5-Step Decision Audit Chain */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs font-mono">
                {/* 1. Input Evidence */}
                <div className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] text-blue-400 font-bold block">01. INPUT EVIDENCE</span>
                  <p className="text-[11px] text-[#F8FAFC] leading-snug break-words">
                    {trace.inputEvidence}
                  </p>
                </div>

                {/* 2. Analysis Rule */}
                <div className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] text-purple-400 font-bold block">02. APPLIED RULE</span>
                  <p className="text-[11px] text-[#CBD5E1] leading-snug break-words">
                    {trace.analysisRule}
                  </p>
                </div>

                {/* 3. Detected Pattern */}
                <div className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] text-cyan-400 font-bold block">03. DETECTED PATTERN</span>
                  <p className="text-[11px] text-[#CBD5E1] leading-snug">
                    {trace.detectedPattern}
                  </p>
                </div>

                {/* 4. Result */}
                <div className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] text-amber-400 font-bold block">04. RESULT & TRIAGE</span>
                  <p className="text-[11px] text-[#F8FAFC] font-bold leading-snug">
                    {trace.result}
                  </p>
                </div>

                {/* 5. Confidence Rationale */}
                <div className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] space-y-1.5">
                  <span className="text-[10px] text-emerald-400 font-bold block">05. CONFIDENCE RATIONALE</span>
                  <p className="text-[11px] text-[#94A3B8] leading-snug">
                    {trace.confidenceReason || 'Supported by multiple correlated evidence timestamps.'}
                  </p>
                </div>
              </div>

              {/* Forensic Details & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 text-xs">
                {trace.whySuspicious && (
                  <div className="p-3.5 rounded-xl bg-amber-950/15 border border-amber-900/40 text-[11px] space-y-1">
                    <span className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Why This Is Suspicious:
                    </span>
                    <p className="text-[#CBD5E1] leading-relaxed">
                      {trace.whySuspicious}
                    </p>
                  </div>
                )}

                {trace.recommendedCheck && (
                  <div className="p-3.5 rounded-xl bg-blue-950/15 border border-blue-900/40 text-[11px] space-y-1">
                    <span className="font-mono font-bold text-blue-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Recommended Investigator Verification:
                    </span>
                    <p className="text-[#CBD5E1] leading-relaxed">
                      {trace.recommendedCheck}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
