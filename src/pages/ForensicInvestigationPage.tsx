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
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { EvidenceDetailModal } from '../components/evidence/EvidenceDetailModal';
import { CorrelatedInvestigationFinding, TargetComputer } from '../types';

export const ForensicInvestigationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, selectCase } = useApp();

  // Query parameter support (e.g. ?step=4 to view results directly)
  const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : 1;
  const [currentStep, setCurrentStep] = useState<number>(initialStep >= 1 && initialStep <= 4 ? initialStep : 1);

  // Step 1: Permission state
  const [targetComputerId, setTargetComputerId] = useState<string>('EMP-LT-001');
  const [collectionType, setCollectionType] = useState<'demo' | 'live'>('demo');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [computers, setComputers] = useState<TargetComputer[]>([]);

  // Step 2 & 3: Scanning state
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [artifactsCollected, setArtifactsCollected] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  // Step 4: Results state
  const [results, setResults] = useState<any>(null);
  const [selectedFinding, setSelectedFinding] = useState<CorrelatedInvestigationFinding | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Stages configuration
  const stages = [
    { name: 'Collecting system logs', artifacts: 45, desc: 'Event logs and auth records' },
    { name: 'Scanning file activity', artifacts: 52, desc: 'MFT and file creation logs' },
    { name: 'Detecting connected devices', artifacts: 8, desc: 'USB and mass storage' },
    { name: 'Collecting user activity', artifacts: 12, desc: 'Logon sessions and tokens' },
    { name: 'Analyzing network logs', artifacts: 14, desc: 'Outbound sockets & connections' },
    { name: 'Gathering application logs', artifacts: 18, desc: 'Prefetch & executed binaries' }
  ];

  // Fetch computers & initial results on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const comps = await api.getComputers();
        if (comps && comps.length > 0) setComputers(comps);
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

  // Scan progress simulator effect
  useEffect(() => {
    let interval: any;
    if (isScanning && currentStep === 2) {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            // Move to Step 4 after completion
            setTimeout(() => {
              setCurrentStep(4);
              showToast('Forensic Scan Complete', 'Artifacts successfully ingested and correlated.', 'success');
            }, 800);
            return 100;
          }

          const next = prev + 5;
          // Calculate stage index and artifacts count based on progress
          const stageIdx = Math.min(Math.floor((next / 100) * stages.length), stages.length - 1);
          setActiveStageIndex(stageIdx);
          const accumulatedArtifacts = stages
            .slice(0, stageIdx + 1)
            .reduce((sum, s) => sum + s.artifacts, 0);
          setArtifactsCollected(Math.round((next / 100) * 149));

          return next;
        });
      }, 350);
    }
    return () => clearInterval(interval);
  }, [isScanning, currentStep]);

  // Handle Step 1 Grant Permission
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

      showToast('Authorization Recorded', 'Read-only access granted. Ready for artifact collection.', 'success');
      setCurrentStep(2);
      startScan();
    } catch {
      setCurrentStep(2);
      startScan();
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const startScan = () => {
    setScanProgress(0);
    setElapsedSeconds(0);
    setArtifactsCollected(0);
    setActiveStageIndex(0);
    setIsScanning(true);
  };

  const handleOpenFinding = (finding: CorrelatedInvestigationFinding) => {
    setSelectedFinding(finding);
    setIsModalOpen(true);
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
          Forensic Access
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Get authorized access to investigate a computer and collect forensic artifacts.
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-[#E2E8F0] -z-0" />
          
          {[
            { step: 1, label: 'Permission' },
            { step: 2, label: 'Scan' },
            { step: 3, label: 'Analyze' },
            { step: 4, label: 'Results' }
          ].map((item) => {
            const isCompleted = currentStep > item.step || (currentStep === 4 && item.step < 4);
            const isActive = currentStep === item.step;

            return (
              <div 
                key={item.step} 
                onClick={() => {
                  // Allow jumping between completed steps
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
      {/* STEP 1: PERMISSION & AUTHORIZATION (Panel 2 in Reference UI) */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-7 animate-in fade-in-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">
                Grant Investigation Permission
              </h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-2xl">
                To collect forensic artifacts, TraceX needs authorized access to this computer. This will allow collection of system logs, file activity, device information and other available forensic data.
              </p>
            </div>
          </div>

          {/* Privacy & Read-Only Banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Your privacy is important</p>
              <p className="text-blue-800/90 mt-0.5 leading-relaxed">
                TraceX only collects data required for forensic investigation. All data is processed securely and used only for authorized investigations. Read-only acquisition ensures zero modification to the host filesystem.
              </p>
            </div>
          </div>

          {/* Target Computer & Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E2E8F0] rounded-2xl p-4 bg-[#F8FAFC]">
              <label className="text-xs font-semibold text-[#64748B] block mb-2">
                Target Computer
              </label>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-[#1E293B]">EMP-LT-001</span>
                    <p className="text-[10px] text-[#64748B]">Windows 11 Enterprise (Build 22631)</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Connected
                </span>
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-2xl p-4 bg-[#F8FAFC]">
              <label className="text-xs font-semibold text-[#64748B] block mb-2">
                Collector Mode
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionType('demo')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    collectionType === 'demo'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                  }`}
                >
                  Demo Collector
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionType('live')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    collectionType === 'live'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                  }`}
                >
                  Live Agent
                </button>
              </div>
              <p className="text-[10px] text-[#64748B] mt-2">
                {collectionType === 'demo' 
                  ? 'Using synthetic forensic investigation scenario for demonstration.'
                  : 'Reads telemetry via authorized endpoint daemon.'}
              </p>
            </div>
          </div>

          {/* Artifacts Categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
              Included Forensic Artifact Categories
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                'System Logs',
                'File Activity',
                'USB / Device Activity',
                'User Activity',
                'Network Activity',
                'Application Logs',
                'MFT Timestamps'
              ].map((cat) => (
                <div key={cat} className="flex items-center gap-2 p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155]">
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-medium">{cat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Authorization Checkbox */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAuthorized}
                onChange={(e) => setIsAuthorized(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-[#1E293B] font-medium leading-relaxed select-none">
                I have the necessary authorization to investigate this computer and understand the data that will be collected in read-only mode.
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
              <span>Grant Permission & Continue</span>
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
      {/* STEP 2 & 3: SCANNING / ANALYZING (Panel 3 in Reference UI) */}
      {/* ======================================================== */}
      {(currentStep === 2 || currentStep === 3) && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-8 animate-in fade-in-50">
          {/* Scanning Header & Elapsed Time */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">
                  Scanning Computer...
                </h2>
                <p className="text-xs text-[#64748B]">
                  TraceX is collecting forensic artifacts. Please wait.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {collectionType === 'demo' && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                  DEMO DATA
                </span>
              )}
              <div className="text-xs font-mono font-semibold text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
                Elapsed: {formatElapsed(elapsedSeconds)}
              </div>
            </div>
          </div>

          {/* Scanning Content: Stages Checklist + Circular Progress Ring */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Stages Checklist */}
            <div className="lg:col-span-7 space-y-3">
              {stages.map((stage, idx) => {
                const isStageComplete = idx < activeStageIndex || scanProgress >= 100;
                const isStageActive = idx === activeStageIndex && scanProgress < 100;

                return (
                  <div
                    key={stage.name}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isStageActive
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : isStageComplete
                        ? 'bg-[#F8FAFC] border-[#E2E8F0]'
                        : 'bg-white border-transparent text-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {isStageComplete ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                            <Check className="w-3 h-3" />
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
                      <div>
                        <span className={`text-xs font-semibold ${
                          isStageActive ? 'text-indigo-900' : isStageComplete ? 'text-[#1E293B]' : 'text-[#94A3B8]'
                        }`}>
                          {stage.name}
                        </span>
                        <p className="text-[10px] text-[#64748B]">
                          {stage.desc}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[11px] font-mono font-medium ${
                      isStageComplete
                        ? 'text-emerald-600'
                        : isStageActive
                        ? 'text-indigo-600 font-semibold'
                        : 'text-[#94A3B8]'
                    }`}>
                      {isStageComplete ? 'Completed' : isStageActive ? 'Scanning...' : 'Queued'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Radial Circular Ring & Stats */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#F8FAFC] rounded-3xl border border-[#E2E8F0]">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG Radial Progress */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                    fill="transparent"
                  />
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
                {/* Inner Ring Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-[#1E293B]">
                    {scanProgress}%
                  </span>
                  <span className="text-xs font-medium text-[#64748B] mt-0.5">
                    {scanProgress >= 100 ? 'Analyzing...' : 'Scanning...'}
                  </span>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-xs font-bold text-[#1E293B]">
                  Artifacts Collected: {artifactsCollected}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Host: EMP-LT-001 (Read-Only Mode)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: ANALYSIS RESULTS (Panel 4 in Reference UI) */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* Top 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">3</p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">Suspicious Events</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1E293B]">1</p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">USB Device Used</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#475569] flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1E293B]">4</p>
                <p className="text-xs font-medium text-[#64748B] mt-0.5">Files Accessed</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Folder className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#1E293B]">2</p>
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
                Suspicious Activity Detected
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                TraceX found potential data exfiltration activity based on correlated events. File 'confidential.pdf' was accessed immediately prior to removable mass storage attachment.
              </p>
            </div>
          </div>

          {/* List of Correlated Findings matching reference UI */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Correlated Investigation Findings
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Click any finding to inspect detailed metadata and forensic causality explanation.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                HOST: EMP-LT-001
              </span>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {(results?.findings || []).map((finding: CorrelatedInvestigationFinding) => {
                const isUsb = finding.category.toLowerCase().includes('usb') || finding.title.toLowerCase().includes('usb');
                const isTransfer = finding.category.toLowerCase().includes('transfer') || finding.title.toLowerCase().includes('transfer');

                return (
                  <div
                    key={finding.id}
                    onClick={() => handleOpenFinding(finding)}
                    className="p-5 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isUsb ? 'bg-amber-50 text-amber-600' : isTransfer ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {isUsb ? <HardDrive className="w-5 h-5" /> : isTransfer ? <ArrowRight className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#1E293B] group-hover:text-indigo-600 transition-colors truncate">
                            {finding.title}
                          </h4>
                        </div>
                        <p className="text-xs text-[#64748B] truncate mt-0.5">
                          {finding.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-[#94A3B8] font-mono hidden md:inline">
                        {finding.timestamp}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        finding.severity === 'High' || finding.severity === 'Critical'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        {finding.severity}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
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

      {/* Evidence Details Modal (Panel 6) */}
      <EvidenceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        finding={selectedFinding}
      />
    </div>
  );
};
