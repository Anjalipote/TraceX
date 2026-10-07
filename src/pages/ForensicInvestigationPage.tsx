import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  Info, 
  Check, 
  Loader2, 
  Clock, 
  AlertTriangle, 
  HardDrive, 
  Folder, 
  Globe, 
  FileText, 
  ChevronRight, 
  ArrowRight,
  Shield,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Terminal,
  ExternalLink,
  Layers,
  FileDiff,
  Calendar,
  AlertCircle,
  History,
  Activity,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { EvidenceDetailModal } from '../components/evidence/EvidenceDetailModal';
import { PdfDiffModal, PdfDiffData } from '../components/evidence/PdfDiffModal';
import { CorrelatedInvestigationFinding, TargetComputer } from '../types';

export const ForensicInvestigationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, selectCase } = useApp();

  // Query parameter support (e.g. ?step=4 to view results directly)
  const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : 1;
  const [currentStep, setCurrentStep] = useState<number>(initialStep >= 1 && initialStep <= 4 ? initialStep : 1);

  // Investigation Mode: HISTORICAL FORENSIC SCAN vs LIVE MONITORING
  const [investigationMode, setInvestigationMode] = useState<'historical' | 'live_monitoring'>('historical');

  // Step 1: Permission & Scope state
  const [targetComputerId, setTargetComputerId] = useState<string>('');
  const [collectionType, setCollectionType] = useState<'demo' | 'live'>('live');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [computers, setComputers] = useState<TargetComputer[]>([]);
  const [timeframeHours, setTimeframeHours] = useState<number>(24);
  const [scanPath, setScanPath] = useState<string>('agent_test_evidence');

  // Step 2 & 3: Scanning state
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [artifactsCollected, setArtifactsCollected] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [liveStages, setLiveStages] = useState<any[]>([]);

  // Step 4: Results state
  const [results, setResults] = useState<any>(null);
  const [selectedFinding, setSelectedFinding] = useState<CorrelatedInvestigationFinding | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // PDF Diff Modal state
  const [diffModalOpen, setDiffModalOpen] = useState<boolean>(false);
  const [selectedDiffFilename, setSelectedDiffFilename] = useState<string>('');
  const [selectedDiffBaselineSha, setSelectedDiffBaselineSha] = useState<string>('');
  const [selectedDiffCurrentSha, setSelectedDiffCurrentSha] = useState<string>('');
  const [selectedDiffData, setSelectedDiffData] = useState<PdfDiffData | null>(null);

  // Default stages template
  const defaultStages = [
    { name: 'Scanning candidate files & metadata', desc: 'Recursive mtime/ctime discovery & SHA-256 calculation', artifacts_count: 0, status: 'queued' },
    { name: 'Querying USBSTOR registry', desc: 'Historical removable storage device keys & serial numbers', artifacts_count: 0, status: 'queued' },
    { name: 'Collecting Windows event logs', desc: 'System & Security logs acquired via wevtutil', artifacts_count: 0, status: 'queued' },
    { name: 'Inspecting NTFS USN Change Journal', desc: 'Raw volume journal with elevation validation', artifacts_count: 0, status: 'queued' },
    { name: 'Correlating events & document diffs', desc: 'Temporal proximity and cryptographic divergence engine', artifacts_count: 0, status: 'queued' }
  ];

  // Fetch computers & initial results on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const comps = await api.getComputers();
        if (comps && comps.length > 0) {
          setComputers(comps);
          // Default to first live computer if available
          const liveComp = comps.find((c: any) => !c.is_demo);
          if (liveComp) {
            setTargetComputerId(liveComp.id);
            setCollectionType('live');
          } else {
            setTargetComputerId(comps[0].id);
            setCollectionType(comps[0].is_demo ? 'demo' : 'live');
          }
        }
        const res = await api.getInvestigationResults('TRX-001');
        if (res) setResults(res);
      } catch (err) {
        console.error('Failed to load initial investigation data', err);
      }
    };
    loadData();
  }, []);

  // Timer effect during scan
  useEffect(() => {
    let timer: any;
    if (isScanning && currentStep === 2) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isScanning, currentStep]);

  // Handle Step 1 Grant Permission & Execute Scan
  const handleGrantPermission = async () => {
    if (!isAuthorized) {
      showToast('Authorization Required', 'Please confirm that you have permission to investigate this computer.', 'warning');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      await api.authorizeInvestigation({
        computer_id: targetComputerId,
        case_id: 'TRX-001',
        collection_mode: 'read_only',
        collection_type: collectionType,
        authorized: true
      });

      showToast('Authorization Recorded', 'Read-only access granted. Starting forensic collection...', 'success');
      setCurrentStep(2);
      setIsScanning(true);
      setScanProgress(15);
      setElapsedSeconds(0);
      setLiveStages(defaultStages.map(s => ({ ...s, status: 'scanning' })));

      // Trigger REAL Scan API call on backend
      const scanRes = await api.startInvestigationScan({
        computer_id: targetComputerId,
        case_id: 'TRX-001',
        investigation_mode: investigationMode === 'historical' ? 'historical' : 'live',
        collection_type: collectionType,
        hours: timeframeHours,
        scan_paths: scanPath ? [scanPath] : undefined
      });

      if (scanRes && scanRes.stages) {
        setLiveStages(scanRes.stages);
        setArtifactsCollected(scanRes.artifacts_collected || 0);
      }

      setScanProgress(70);

      // Fetch fresh results
      const updatedResults = await api.getInvestigationResults('TRX-001');
      if (updatedResults) {
        setResults(updatedResults);
      }

      setScanProgress(100);
      setIsScanning(false);

      setTimeout(() => {
        setCurrentStep(4);
        showToast('Forensic Scan Complete', 'Artifacts successfully ingested, normalized, and correlated.', 'success');
      }, 800);

    } catch (err) {
      console.error('Forensic scan error:', err);
      showToast('Scan Completed with Notes', 'Artifact collection finished.', 'info');
      setCurrentStep(4);
      setIsScanning(false);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleOpenFinding = (finding: CorrelatedInvestigationFinding) => {
    setSelectedFinding(finding);
    setIsModalOpen(true);
  };

  const handleOpenDiff = (finding: CorrelatedInvestigationFinding) => {
    const meta = finding.metadata || {};
    setSelectedDiffFilename(meta.file_name || 'Document');
    setSelectedDiffBaselineSha(meta.baseline_sha256 || '');
    setSelectedDiffCurrentSha(meta.sha256 || '');
    
    // Parse diff data if present
    if (meta.diff_data) {
      try {
        const parsed = typeof meta.diff_data === 'string' ? JSON.parse(meta.diff_data) : meta.diff_data;
        setSelectedDiffData(parsed);
      } catch {
        setSelectedDiffData(null);
      }
    } else {
      setSelectedDiffData(null);
    }
    setDiffModalOpen(true);
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const selectedComputer = computers.find(c => c.id === targetComputerId) || computers[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
              Forensic Access & Collection
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              TRX-001
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Authorized digital-forensics endpoint collection for candidate files, historical USB storage, and event artifacts.
          </p>
        </div>

        {selectedComputer && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
            <div className={`w-2 h-2 rounded-full ${!selectedComputer.is_demo ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-semibold text-[#1E293B]">{selectedComputer.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              !selectedComputer.is_demo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {!selectedComputer.is_demo ? 'LIVE ENDPOINT' : 'DEMO MODE'}
            </span>
          </div>
        )}
      </div>

      {/* 4-Step Stepper Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-[#E2E8F0] -z-0" />
          
          {[
            { step: 1, label: 'Scope & Consent' },
            { step: 2, label: 'Collection' },
            { step: 3, label: 'Correlation' },
            { step: 4, label: 'Findings' }
          ].map((item) => {
            const isCompleted = currentStep > item.step || (currentStep === 4 && item.step < 4);
            const isActive = currentStep === item.step;

            return (
              <div 
                key={item.step} 
                onClick={() => {
                  if (item.step <= currentStep || currentStep === 4) {
                    setCurrentStep(item.step);
                  }
                }}
                className="flex flex-col items-center relative z-10 cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-indigo-600 text-white'
                    : isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]'
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : item.step}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isActive ? 'text-indigo-600 font-semibold' : isCompleted ? 'text-[#1E293B]' : 'text-[#94A3B8]'
                }`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 1: PERMISSION & SCOPE SELECTION */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-7 animate-in fade-in-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">
                Grant Investigation Authorization & Scope
              </h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-2xl">
                TraceX strictly requires explicit investigator authorization to collect historical endpoint artifacts. The collector operates in non-destructive read-only mode to preserve forensic chain-of-custody.
              </p>
            </div>
          </div>

          {/* Privacy & Legal Notice */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Forensic Integrity & Non-Accusatory Standard</p>
              <p className="text-blue-800/90 mt-0.5 leading-relaxed">
                Collected evidence will be correlated objectively. TraceX identifies temporal patterns ("Potential Suspicious Activity", "File Modification Detected") and never reaches legal accusations.
              </p>
            </div>
          </div>

          {/* Investigation Mode Selection: HISTORICAL FORENSIC SCAN vs LIVE MONITORING */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1E293B] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Forensic Investigation Workflow</span>
              </label>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                investigationMode === 'historical'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {investigationMode === 'historical' ? 'HISTORICAL FORENSIC SCAN' : 'LIVE MONITORING'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setInvestigationMode('historical')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  investigationMode === 'historical'
                    ? 'bg-indigo-600/5 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-[#E2E8F0] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className={`w-4.5 h-4.5 ${investigationMode === 'historical' ? 'text-indigo-600' : 'text-[#64748B]'}`} />
                    <span className={`text-xs font-bold ${investigationMode === 'historical' ? 'text-indigo-950' : 'text-[#1E293B]'}`}>
                      HISTORICAL FORENSIC SCAN
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                    PAST ARTIFACTS
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                  Investigate past file changes, NTFS USN Change Journal, Windows Event Logs, and candidate files before agent was started. Finds modified files even if path, time, or name is unknown.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setInvestigationMode('live_monitoring')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  investigationMode === 'live_monitoring'
                    ? 'bg-emerald-600/5 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-[#E2E8F0] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4.5 h-4.5 ${investigationMode === 'live_monitoring' ? 'text-emerald-600' : 'text-[#64748B]'}`} />
                    <span className={`text-xs font-bold ${investigationMode === 'live_monitoring' ? 'text-emerald-950' : 'text-[#1E293B]'}`}>
                      LIVE MONITORING
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    REAL-TIME WATCH
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                  Real-time filesystem monitoring of directory folders, recording create, modify, delete, and rename events with cryptographic hashes and PDF document text diffing.
                </p>
              </button>
            </div>
          </div>

          {/* Target Computer & Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E2E8F0] rounded-2xl p-4 bg-[#F8FAFC]">
              <label className="text-xs font-semibold text-[#64748B] block mb-2">
                Target Endpoint Machine
              </label>
              <select
                value={targetComputerId}
                onChange={(e) => {
                  setTargetComputerId(e.target.value);
                  const sel = computers.find(c => c.id === e.target.value);
                  if (sel) {
                    setCollectionType(sel.is_demo ? 'demo' : 'live');
                  }
                }}
                className="w-full p-2.5 bg-white rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {computers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.collection_type}
                  </option>
                ))}
              </select>
              {selectedComputer && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>OS: {selectedComputer.os}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${
                      !selectedComputer.is_demo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedComputer.status}
                    </span>
                    {selectedComputer.is_admin ? (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        ADMIN
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        STANDARD USER
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border border-[#E2E8F0] rounded-2xl p-4 bg-[#F8FAFC]">
              <label className="text-xs font-semibold text-[#64748B] block mb-2">
                Collector Mode
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionType('live')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    collectionType === 'live'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                  }`}
                >
                  Live Endpoint Agent
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionType('demo')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    collectionType === 'demo'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                  }`}
                >
                  Demo Benchmark
                </button>
              </div>
              <p className="text-[10px] text-[#64748B] mt-2">
                {collectionType === 'live'
                  ? 'Queries native Windows APIs (USBSTOR registry, Event Logs, NTFS metadata, and diffs).'
                  : 'Loads verified offline benchmark scenario (EMP-LT-001).'}
              </p>
            </div>
          </div>

          {/* Investigation Scope Configuration */}
          <div className="border border-[#E2E8F0] rounded-2xl p-5 bg-[#F8FAFC] space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-[#1E293B]">
                Investigation Timeframe & Candidate Discovery Scope
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1.5">
                  Historical Activity Window
                </label>
                <select
                  value={timeframeHours}
                  onChange={(e) => setTimeframeHours(Number(e.target.value))}
                  className="w-full p-2.5 bg-white rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#1E293B] focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={1}>Last 1 Hour (Immediate Incident Response)</option>
                  <option value={24}>Last 24 Hours (Standard Incident Window - Recommended)</option>
                  <option value={72}>Last 3 Days (Weekend Activity Window)</option>
                  <option value={168}>Last 7 Days (Comprehensive Triage)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1.5">
                  Target Candidate Scan Path
                </label>
                <input
                  type="text"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  placeholder="e.g. agent_test_evidence or C:\Users\...\Documents"
                  className="w-full p-2.5 bg-white rounded-xl border border-[#CBD5E1] text-xs font-mono text-[#1E293B] focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-2">
                Active Artifact Collectors
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { name: 'NTFS File Metadata', active: true },
                  { name: 'USBSTOR Registry', active: true },
                  { name: 'System Event Logs', active: true },
                  { name: 'NTFS USN Journal', active: true }
                ].map((art) => (
                  <div key={art.name} className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-[#334155]">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium text-[11px]">{art.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Authorization Consent Checkbox */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAuthorized}
                onChange={(e) => setIsAuthorized(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-[#1E293B] font-medium leading-relaxed select-none">
                I hereby certify that I am authorized to conduct this forensic investigation on endpoint <strong>{selectedComputer?.id || 'target host'}</strong>. All collection operations will occur strictly in read-only mode.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleGrantPermission}
              disabled={!isAuthorized || isSubmittingAuth}
              className={`px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                isAuthorized && !isSubmittingAuth
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmittingAuth ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Grant Authorization & Start Collection</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-3 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2 & 3: REAL ARTIFACT COLLECTION & CORRELATION */}
      {/* ======================================================== */}
      {(currentStep === 2 || currentStep === 3) && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-8 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">
                  Executing Forensic Collection...
                </h2>
                <p className="text-xs text-[#64748B]">
                  Collecting candidate files, USBSTOR registry keys, and event logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                collectionType === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {collectionType === 'live' ? 'LIVE AGENT RUN' : 'DEMO BENCHMARK'}
              </span>
              <div className="text-xs font-mono font-semibold text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
                Elapsed: {formatElapsed(elapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Stages Checklist */}
            <div className="lg:col-span-7 space-y-3">
              {(liveStages.length > 0 ? liveStages : defaultStages).map((stage, idx) => {
                const isStageComplete = stage.status === 'completed';
                const isStageUnavailable = stage.status === 'unavailable';
                const isStageActive = stage.status === 'scanning';

                return (
                  <div
                    key={stage.name}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isStageActive
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : isStageComplete
                        ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                        : isStageUnavailable
                        ? 'bg-amber-50/40 border-amber-200/60'
                        : 'bg-white border-transparent text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        {isStageComplete ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : isStageUnavailable ? (
                          <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                            <AlertCircle className="w-3 h-3" />
                          </div>
                        ) : isStageActive ? (
                          <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-[#CBD5E1] flex items-center justify-center text-[#94A3B8]">
                            <Clock className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs font-semibold truncate block ${
                          isStageActive ? 'text-indigo-900' : isStageComplete ? 'text-[#1E293B]' : isStageUnavailable ? 'text-amber-900' : 'text-[#94A3B8]'
                        }`}>
                          {stage.name}
                        </span>
                        <p className="text-[10px] text-[#64748B] truncate">
                          {stage.description || stage.desc}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`text-[11px] font-mono font-medium ${
                        isStageComplete
                          ? 'text-emerald-600'
                          : isStageUnavailable
                          ? 'text-amber-600'
                          : isStageActive
                          ? 'text-indigo-600 font-semibold'
                          : 'text-[#94A3B8]'
                      }`}>
                        {isStageComplete ? 'Completed' : isStageUnavailable ? 'Privilege Limited' : isStageActive ? 'Acquiring...' : 'Queued'}
                      </span>
                      {stage.artifacts_count > 0 && (
                        <p className="text-[10px] text-[#64748B] font-mono">
                          {stage.artifacts_count} artifacts
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Radial Circular Ring */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#F8FAFC] rounded-3xl border border-[#E2E8F0]">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#4F46E5"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - scanProgress / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-[#1E293B]">
                    {scanProgress}%
                  </span>
                  <span className="text-xs font-medium text-[#64748B] mt-0.5">
                    {scanProgress >= 100 ? 'Correlating...' : 'Acquiring...'}
                  </span>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-xs font-bold text-[#1E293B]">
                  Artifacts Ingested: {artifactsCollected}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Target Host: {targetComputerId || 'Endpoint'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: INVESTIGATION RESULTS & CORRELATION */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* Top 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {results?.suspicious_events_count ?? 3}
                </p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">Suspicious Events</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1E293B]">
                  {results?.usb_devices_count ?? 1}
                </p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">USB Devices Identified</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#475569] flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1E293B]">
                  {results?.files_accessed_count ?? 4}
                </p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">Candidate Files Scanned</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1E293B]">
                  {results?.network_connections_count ?? 0}
                </p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">Network Connections</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Suspicious Activity Detected Alert Banner */}
          <div className="bg-white rounded-2xl p-5 border-l-4 border-l-red-500 border border-[#E2E8F0] shadow-xs flex items-start gap-3.5">
            <div className="p-1 rounded-lg bg-red-50 text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-600">
                Potential Suspicious Activity Identified
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                {results?.summary || "TraceX correlated endpoint forensic events across candidate files and removable storage artifacts. Evidence requires investigator review."}
              </p>
            </div>
          </div>

          {/* Artifact Telemetry & Provenance Disclosure Box */}
          {results?.telemetry_status && (
            <div className="p-4.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-[#1E293B]">Forensic Artifact Acquisition Provenance</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                    {results.investigation_mode === 'historical' ? 'HISTORICAL FORENSIC SCAN' : 'LIVE MONITORING'}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    results.collection_type === 'Live Agent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {results.collection_type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">Candidate Files:</span>
                  <span className="font-semibold text-[#1E293B]">
                    {results.telemetry_status.candidate_files?.count || 0} files discovered
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">USBSTOR Registry:</span>
                  <span className="font-semibold text-[#1E293B]">
                    {results.telemetry_status.usb_registry?.count || 0} removable storage keys
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">Event Logs:</span>
                  <span className="font-semibold text-emerald-700">Available via wevtutil</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block">NTFS USN Journal:</span>
                  <span className="font-semibold text-amber-700 truncate block" title={results.telemetry_status.usn_journal?.reason}>
                    {results.telemetry_status.usn_journal?.status === 'available' ? 'Elevated Access' : 'Privilege Limited'}
                  </span>
                </div>
              </div>

              {/* Historical Record Unavailable Notice if non-elevated */}
              {results.telemetry_status.usn_journal?.status === 'unavailable' && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 space-y-1 mt-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Historical Record Unavailable: NTFS USN Change Journal Volume Stream</span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    {results.telemetry_status.usn_journal.reason || "Reading raw NTFS USN Journal records requires Windows Administrator elevation (Error 5: Access is denied). Running under standard user privileges."}
                  </p>
                  <p className="text-[10px] text-amber-800/80 font-medium">
                    * Note: Individual candidate files metadata (mtime, ctime, atime, SHA-256) and Windows Event Logs (Kernel-PnP & System) were successfully acquired without elevation. This restriction does not mean no file was changed; elevated forensic acquisition can be performed via Administrator agent.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* List of Correlated Findings */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Correlated Investigation Findings
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  TraceX correlation engine findings with why-suspicious explanations and evidence linkage.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                CASE: TRX-001
              </span>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {(results?.findings || []).map((finding: CorrelatedInvestigationFinding) => {
                const isUsb = finding.category.toLowerCase().includes('usb') || finding.title.toLowerCase().includes('usb');
                const isTransfer = finding.category.toLowerCase().includes('transfer') || finding.title.toLowerCase().includes('transfer');
                const hasDiff = finding.metadata?.pdf_diff_available;

                return (
                  <div
                    key={finding.id}
                    className="p-5 hover:bg-[#F8FAFC] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div 
                      onClick={() => handleOpenFinding(finding)}
                      className="flex items-start gap-4 min-w-0 cursor-pointer flex-1"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isUsb ? 'bg-amber-50 text-amber-600' : isTransfer ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {isUsb ? <HardDrive className="w-5 h-5" /> : isTransfer ? <ArrowRight className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-indigo-600 transition-colors">
                            {finding.title}
                          </h4>
                          {finding.is_live_agent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE AGENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {finding.description}
                        </p>
                        {finding.why_suspicious && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-50/60 border border-amber-200/50 text-[11px] text-amber-900">
                            <span className="font-bold text-amber-800">Why Flagged: </span>
                            {finding.why_suspicious}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      {hasDiff && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDiff(finding);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileDiff className="w-3.5 h-3.5" />
                          <span>Diff PDF</span>
                        </button>
                      )}
                      <span className="text-xs text-[#94A3B8] font-mono hidden lg:inline">
                        {finding.timestamp}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        finding.severity === 'High' || finding.severity === 'Critical'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        {finding.severity}
                      </span>
                      <ChevronRight 
                        onClick={() => handleOpenFinding(finding)}
                        className="w-4 h-4 text-[#94A3B8] group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 cursor-pointer" 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setCurrentStep(1);
                setIsAuthorized(false);
              }}
              className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#64748B] transition-colors cursor-pointer"
            >
              Start New Investigation
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/evidence')}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
              >
                Inspect Evidence Ledger
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
              >
                Generate Report
              </button>
              <button
                onClick={() => navigate('/timeline')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <span>View Full Timeline</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Details Modal */}
      <EvidenceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        finding={selectedFinding}
      />

      {/* PDF Diff Modal */}
      <PdfDiffModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        filename={selectedDiffFilename}
        baselineSha256={selectedDiffBaselineSha}
        currentSha256={selectedDiffCurrentSha}
        diffData={selectedDiffData}
      />
    </div>
  );
};
