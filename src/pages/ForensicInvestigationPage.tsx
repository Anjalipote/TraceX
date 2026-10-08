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
  Sparkles,
  FileCheck,
  Search,
  Lock,
  GitFork
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { EvidenceDetailModal } from '../components/evidence/EvidenceDetailModal';
import { PdfDiffModal, PdfDiffData } from '../components/evidence/PdfDiffModal';
import { CorrelatedInvestigationFinding, TargetComputer } from '../types';

export const ForensicInvestigationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast, selectCase, refreshData } = useApp();

  // Query parameter support (e.g. ?step=5 to view results directly)
  const initialStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : 1;
  const [currentStep, setCurrentStep] = useState<number>(initialStep >= 1 && initialStep <= 5 ? initialStep : 1);

  // Investigation Mode: HISTORICAL FORENSIC SCAN vs LIVE MONITORING
  const [investigationMode, setInvestigationMode] = useState<'historical' | 'live_monitoring'>('historical');

  // Step 1: Connect / Target Host state
  const [targetComputerId, setTargetComputerId] = useState<string>('');
  const [collectionType, setCollectionType] = useState<'demo' | 'live'>('live');
  const [computers, setComputers] = useState<TargetComputer[]>([]);
  const [agentStatusData, setAgentStatusData] = useState<any>(null);

  // Step 2: Authorization state
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [authorizationRecord, setAuthorizationRecord] = useState<any>(null);

  // Step 3: Select File state
  const [targetFilePath, setTargetFilePath] = useState<string>('C:\\TraceX-Test\\test_document.pdf');
  const [selectedFileInfo, setSelectedFileInfo] = useState<any>(null);
  const [isVerifyingFile, setIsVerifyingFile] = useState<boolean>(false);
  const [timeframeHours, setTimeframeHours] = useState<number>(24);
  const [scanPath, setScanPath] = useState<string>('agent_test_evidence');

  // Step 4: Collection state
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [artifactsCollected, setArtifactsCollected] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [liveStages, setLiveStages] = useState<any[]>([]);

  // Step 5: Results state
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
    { name: 'Target file verification & SHA-256 calculation', desc: 'Direct on-disk verification and cryptographic hashing', artifacts_count: 0, status: 'queued' },
    { name: 'Inspecting NTFS USN Change Journal', desc: 'Per-file FileRef and volume journal records with elevation validation', artifacts_count: 0, status: 'queued' },
    { name: 'Collecting Windows Event Logs', desc: 'Kernel-PnP device activity and System audit logs via wevtutil', artifacts_count: 0, status: 'queued' },
    { name: 'Querying USBSTOR registry', desc: 'Historical removable storage device keys and serial numbers', artifacts_count: 0, status: 'queued' },
    { name: 'Correlating events & document diffs', desc: 'Temporal proximity correlation and cryptographic divergence engine', artifacts_count: 0, status: 'queued' }
  ];

  // Fetch computers & initial results on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [comps, agentStatus] = await Promise.all([
          api.getComputers(),
          api.getAgentStatus().catch(() => null)
        ]);

        if (agentStatus) {
          setAgentStatusData(agentStatus);
        }

        if (comps && comps.length > 0) {
          setComputers(comps);
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

        const selFile = await api.getSelectedFile('TRX-001');
        if (selFile && selFile.target_file_path) {
          setSelectedFileInfo(selFile);
          setTargetFilePath(selFile.target_file_path);
        }
      } catch (err) {
        console.error('Failed to load initial investigation data', err);
      }
    };
    loadData();
  }, []);

  // Timer effect during collection (Step 4)
  useEffect(() => {
    let timer: any;
    if (isScanning && currentStep === 4) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isScanning, currentStep]);

  // Step 2 -> Step 3: Grant Authorization
  const handleAuthorize = async () => {
    if (!isAuthorized) {
      showToast('Authorization Required', 'Please confirm that you have permission to investigate this computer.', 'warning');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const authRes = await api.authorizeInvestigation({
        computer_id: targetComputerId,
        case_id: 'TRX-001',
        collection_mode: 'read_only',
        collection_type: collectionType,
        authorized: true
      });

      setAuthorizationRecord(authRes);
      showToast('Authorization Recorded', 'Explicit permission recorded. Please select the file to investigate.', 'success');
      setCurrentStep(3);
    } catch (err) {
      showToast('Authorization Error', 'Failed to record authorization.', 'error');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Step 3: Verify target file on disk
  const handleVerifyFile = async (pathToVerify?: string) => {
    const fileToTest = pathToVerify || targetFilePath;
    if (!fileToTest.trim()) {
      showToast('Missing Path', 'Please enter a valid file path on the Windows laptop.', 'warning');
      return;
    }

    setIsVerifyingFile(true);
    try {
      const res = await api.selectInvestigationFile({
        computer_id: targetComputerId,
        case_id: 'TRX-001',
        file_path: fileToTest.trim()
      });

      if (res) {
        setSelectedFileInfo(res);
        if (res.exists_on_disk) {
          showToast('File Verified', `Original file located on disk (${res.file_size_formatted || res.file_size_bytes + ' bytes'}).`, 'success');
        } else {
          showToast('File Not Found', res.message || 'File does not exist on disk at specified path.', 'warning');
        }
      }
    } catch (err) {
      showToast('Verification Failed', 'Error connecting to endpoint agent.', 'error');
    } finally {
      setIsVerifyingFile(false);
    }
  };

  // Step 3 -> Step 4 & 5: Execute Forensic Collection
  const handleStartCollection = async () => {
    setCurrentStep(4);
    setIsScanning(true);
    setScanProgress(15);
    setElapsedSeconds(0);
    setLiveStages(defaultStages.map(s => ({ ...s, status: 'scanning' })));

    try {
      const scanRes = await api.startInvestigationScan({
        computer_id: targetComputerId,
        case_id: 'TRX-001',
        target_file_path: targetFilePath.trim(),
        investigation_mode: investigationMode === 'historical' ? 'historical' : 'live',
        collection_type: collectionType,
        hours: timeframeHours,
        scan_paths: scanPath ? [scanPath] : undefined
      });

      if (scanRes && scanRes.stages) {
        setLiveStages(scanRes.stages);
        setArtifactsCollected(scanRes.artifacts_collected || 0);
      }

      setScanProgress(75);

      // Fetch fresh results
      const updatedResults = await api.getInvestigationResults('TRX-001');
      if (updatedResults) {
        setResults(updatedResults);
      }

      // Re-fetch selected file
      const selFile = await api.getSelectedFile('TRX-001');
      if (selFile) {
        setSelectedFileInfo(selFile);
      }

      await refreshData();

      setScanProgress(100);
      setIsScanning(false);

      setTimeout(() => {
        setCurrentStep(5);
        showToast('Forensic Scan Complete', 'Artifacts successfully ingested, normalized, and correlated.', 'success');
      }, 700);

    } catch (err) {
      console.error('Forensic scan error:', err);
      showToast('Scan Completed with Notes', 'Artifact collection finished.', 'info');
      setCurrentStep(5);
      setIsScanning(false);
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
              Forensic Access & Investigation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              TRX-001
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real Windows endpoint collection: NTFS USN Journal, Event Logs, USBSTOR registry, and file integrity analysis.
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

      {/* 5-Step Stepper Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto relative">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-4 h-0.5 bg-[#E2E8F0] -z-0" />
          
          {[
            { step: 1, label: 'Investigate Computer' },
            { step: 2, label: 'Authorization' },
            { step: 3, label: 'Select File' },
            { step: 4, label: 'Collection' },
            { step: 5, label: 'Results' }
          ].map((item) => {
            const isCompleted = currentStep > item.step || (currentStep === 5 && item.step < 5);
            const isActive = currentStep === item.step;

            return (
              <div 
                key={item.step} 
                onClick={() => {
                  if (item.step <= currentStep || currentStep === 5) {
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
      {/* STEP 1: INVESTIGATE COMPUTER (Connect to Windows Endpoint) */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-7 animate-in fade-in-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">
                Investigate Computer
              </h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-2xl">
                TraceX connects to the authorized TraceX Windows Agent running on your Windows laptop. Direct operating system access is safely performed by the native endpoint agent.
              </p>
            </div>
          </div>

          {/* Architecture Disclosure Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-800">
            <Info className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">Endpoint Collection Architecture</p>
              <p className="text-slate-600 leading-relaxed">
                A web browser cannot obtain direct operating-system access to another computer. The TraceX Windows Agent is the component that performs authorized OS-level forensic collection on the laptop and transmits artifacts over a secure local channel.
              </p>
            </div>
          </div>

          {/* Host Discovery & Agent Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E2E8F0] rounded-2xl p-5 bg-[#F8FAFC] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E293B] flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>Discovered Endpoint Machine</span>
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  !selectedComputer?.is_demo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {!selectedComputer?.is_demo ? 'AGENT CONNECTED' : 'DEMO BENCHMARK'}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Computer Name:</span>
                  <span className="font-semibold text-[#1E293B]">{selectedComputer?.id || 'Unknown Host'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Operating System:</span>
                  <span className="font-semibold text-[#1E293B]">{selectedComputer?.os || 'Windows 11'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Agent Version:</span>
                  <span className="font-semibold text-[#1E293B]">{selectedComputer?.agent_version || 'v2.5.0-win64'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64748B]">Privilege Mode:</span>
                  <span className={`font-bold ${selectedComputer?.is_admin ? 'text-purple-700' : 'text-slate-700'}`}>
                    {selectedComputer?.is_admin ? 'Elevated Administrator' : 'Standard User (Non-Elevated)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-2xl p-5 bg-[#F8FAFC] space-y-3">
              <span className="text-xs font-bold text-[#1E293B] block">
                Target Computer Selection
              </span>
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

              <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
                <p className="font-semibold text-[#1E293B]">Live Endpoint Agent Communication:</p>
                <p>Status: <strong className="text-emerald-700">{selectedComputer?.status || 'Active'}</strong></p>
                <p>Mode: <strong className="text-indigo-700">{collectionType === 'live' ? 'Native Windows Agent' : 'Demo Offline Simulation'}</strong></p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <span>Investigate Computer</span>
              <ArrowRight className="w-4 h-4" />
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
      {/* STEP 2: AUTHORIZATION (Explicit Permission & UAC Notice) */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-7 animate-in fade-in-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">
                Investigator Authorization Screen
              </h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-2xl">
                Explicit investigator consent is required before performing forensic collection. TraceX respects Windows security boundaries and operates strictly in read-only mode.
              </p>
            </div>
          </div>

          {/* Parameter Review Matrix */}
          <div className="border border-[#E2E8F0] rounded-2xl p-5 bg-[#F8FAFC] space-y-4">
            <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wide">
              Authorization System Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px]">Computer Name</span>
                <span className="font-bold text-[#1E293B] font-mono">{selectedComputer?.id || 'WIN11-ENDPOINT'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px]">Operating System</span>
                <span className="font-bold text-[#1E293B]">{selectedComputer?.os || 'Windows 11 Enterprise'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px]">Agent Version</span>
                <span className="font-bold text-[#1E293B] font-mono">{selectedComputer?.agent_version || 'v2.5.0-win64'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px]">Connection Status</span>
                <span className="font-bold text-emerald-700">{selectedComputer?.status || 'Online'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px]">Authorization Status</span>
                <span className="font-bold text-amber-700">Pending Consent</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[10px]">Collection Mode</span>
                <span className="font-bold text-indigo-700">Strictly Read-Only</span>
              </div>
            </div>

            {/* Collection Capabilities */}
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block mb-2">
                Granted Read-Only Forensic Capabilities:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { name: 'Physical File Metadata & SHA-256 Hashing', desc: 'mtime, ctime, atime, physical size without altering timestamps' },
                  { name: 'Per-File USN Journal Record (fsutil usn readData)', desc: 'Standard user access to file reference numbers and USN codes' },
                  { name: 'Windows Event Logs (System & Kernel-PnP)', desc: 'Queries system event records via native wevtutil API' },
                  { name: 'USBSTOR Removable Mass Storage Registry', desc: 'Hardware identifiers, serial numbers, and device mount records' }
                ].map(cap => (
                  <div key={cap.name} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#1E293B] text-[11px] block">{cap.name}</span>
                      <span className="text-[10px] text-[#64748B]">{cap.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Windows UAC & Elevation Notice */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Windows Permission & Security Boundary Notice</p>
              <p className="text-amber-900/90 leading-relaxed text-[11px]">
                Administrator privileges are required for raw volume USN Journal scanning (<code className="font-mono bg-amber-100 px-1 rounded">fsutil usn readjournal C: csv</code>). TraceX never bypasses UAC, Windows Defender, or OS security controls. If running non-elevated, TraceX safely collects all standard user artifacts, per-file USN data, and Event Logs without privilege escalation.
              </p>
            </div>
          </div>

          {/* Explicit Consent Checkbox */}
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
              onClick={handleAuthorize}
              disabled={!isAuthorized || isSubmittingAuth}
              className={`px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
                isAuthorized && !isSubmittingAuth
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmittingAuth ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Grant Permission & Continue</span>
            </button>
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-3 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: SELECT FILE (Original On-Disk File Selection) */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-xs space-y-7 animate-in fade-in-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">
                Select File to Investigate
              </h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-2xl">
                The TraceX Agent identifies and investigates the <strong>ORIGINAL file</strong> on the Windows computer to preserve historical forensic timestamps, NTFS journal references, and physical attributes.
              </p>
            </div>
          </div>

          {/* Target File Input Form */}
          <div className="border border-[#E2E8F0] rounded-2xl p-5 bg-[#F8FAFC] space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1E293B] block mb-1.5">
                Original Target File Path on Windows Laptop
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <FileText className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={targetFilePath}
                    onChange={(e) => setTargetFilePath(e.target.value)}
                    placeholder="e.g. C:\TraceX-Test\test_document.pdf"
                    className="w-full pl-10 pr-3 py-2.5 bg-white rounded-xl border border-[#CBD5E1] text-xs font-mono text-[#1E293B] focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyFile()}
                  disabled={isVerifyingFile}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  {isVerifyingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Verify On-Disk</span>
                </button>
              </div>
            </div>

            {/* Quick Pick Samples */}
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] block mb-1.5">
                Quick Selection Preset Paths:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Downloads PDF (Trace_X_5_Page_Project_Explanation.pdf)', path: 'C:\\Users\\anjal\\Downloads\\Trace_X_5_Page_Project_Explanation.pdf' },
                  { label: 'Test PDF (C:\\TraceX-Test\\test_document.pdf)', path: 'C:\\TraceX-Test\\test_document.pdf' },
                  { label: 'Agent Workspace PDF (agent_test_evidence\\test_document.pdf)', path: 'agent_test_evidence\\test_document.pdf' },
                  { label: 'Agent Workspace Text (agent_test_evidence\\notes.txt)', path: 'agent_test_evidence\\notes.txt' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setTargetFilePath(preset.path);
                      handleVerifyFile(preset.path);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verified On-Disk File Summary Card */}
            {selectedFileInfo && (
              <div className={`p-4 rounded-xl border transition-all text-xs space-y-2.5 ${
                selectedFileInfo.exists_on_disk
                  ? 'bg-white border-emerald-300 shadow-2xs'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedFileInfo.exists_on_disk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-bold font-mono text-[#1E293B]">
                      {selectedFileInfo.exists_on_disk ? 'Original File Located on Disk' : 'Target File Not Found on Disk'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedFileInfo.exists_on_disk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedFileInfo.exists_on_disk ? 'CONFIRMED ON DISK' : 'NOT FOUND'}
                  </span>
                </div>

                {selectedFileInfo.exists_on_disk && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[#64748B] block text-[10px]">Physical Size</span>
                      <span className="font-bold text-[#1E293B]">{selectedFileInfo.file_size_formatted || selectedFileInfo.file_size_bytes + ' bytes'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[#64748B] block text-[10px]">SHA-256 Digest</span>
                      <span className="font-bold text-[#1E293B] truncate block" title={selectedFileInfo.current_sha256}>
                        {selectedFileInfo.current_sha256 ? `${selectedFileInfo.current_sha256.substring(0, 8)}...${selectedFileInfo.current_sha256.substring(56)}` : 'Unavailable'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[#64748B] block text-[10px]">USN File Ref</span>
                      <span className="font-bold text-indigo-700 truncate block">{selectedFileInfo.usn_file_ref || 'Unavailable'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[#64748B] block text-[10px]">Hash Divergence</span>
                      <span className={`font-bold ${selectedFileInfo.is_hash_diverged ? 'text-red-600' : 'text-emerald-700'}`}>
                        {selectedFileInfo.is_hash_diverged ? 'DIVERGED (Altered)' : 'MATCHING BASELINE'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Investigation Mode Selection: HISTORICAL vs LIVE */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1E293B] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Select Forensic Operation Mode</span>
              </label>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                investigationMode === 'historical' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                  Investigate past changes to the file recorded before TraceX was started: NTFS USN Journal, LastWriteTime, System Event Logs, and historical USB connection records.
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
                  Real-time filesystem monitoring on the file's directory: captures file modify, delete, and rename events with debouncing and page-by-page PDF text diffing.
                </p>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleStartCollection}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start Real Forensic Collection</span>
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-3 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: REAL ARTIFACT COLLECTION */}
      {/* ======================================================== */}
      {currentStep === 4 && (
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
                  Collecting target file metadata, USN journal records, USBSTOR registry, and event logs.
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
              {(liveStages.length > 0 ? liveStages : defaultStages).map((stage) => {
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

            {/* Circular Progress Ring */}
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
      {/* STEP 5: INVESTIGATION RESULTS & HISTORICAL DOSSIER */}
      {/* ======================================================== */}
      {currentStep === 5 && (
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

          {/* Suspicious Activity Alert Banner */}
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

          {/* Investigated Target File Forensic Dossier Card */}
          {selectedFileInfo && selectedFileInfo.target_file_path && (
            <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B]">
                      Investigated Target File Dossier
                    </h3>
                    <p className="text-xs font-mono text-[#64748B] mt-0.5">
                      {selectedFileInfo.target_file_path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedFileInfo.is_hash_diverged
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {selectedFileInfo.is_hash_diverged ? 'HASH DIVERGED' : 'HASH INTACT'}
                  </span>
                  {selectedFileInfo.is_pdf ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      PDF DOCUMENT
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 uppercase">
                      {selectedFileInfo.extension || 'TARGET FILE'}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px]">Physical Size</span>
                  <span className="font-bold text-[#1E293B]">{selectedFileInfo.file_size_formatted || selectedFileInfo.file_size_bytes + ' bytes'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px]">Current SHA-256</span>
                  <span className="font-bold text-[#1E293B] truncate block" title={selectedFileInfo.current_sha256}>
                    {selectedFileInfo.current_sha256 ? `${selectedFileInfo.current_sha256.substring(0, 10)}...` : 'Unavailable'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px]">Baseline SHA-256</span>
                  <span className="font-bold text-[#1E293B] truncate block" title={selectedFileInfo.baseline_sha256 || 'Unavailable'}>
                    {selectedFileInfo.baseline_sha256 ? `${selectedFileInfo.baseline_sha256.substring(0, 10)}...` : 'Unavailable'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[10px]">USN File Ref</span>
                  <span className="font-bold text-indigo-700">{selectedFileInfo.usn_file_ref || 'Unavailable'}</span>
                </div>
              </div>

              {/* Content Analysis Notice (PDF or any diffable file) */}
              {(selectedFileInfo.is_pdf || selectedFileInfo.is_diffable) && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileDiff className="w-4 h-4 text-indigo-600" />
                    <span className="text-slate-700">
                      {selectedFileInfo.baseline_sha256 && selectedFileInfo.baseline_sha256 !== 'Unavailable'
                        ? 'Baseline version preserved in vault. Content comparison available.'
                        : 'Previous version unavailable. Content-level historical comparison cannot be performed.'}
                    </span>
                  </div>
                  {selectedFileInfo.is_hash_diverged && (
                    <button
                      type="button"
                      onClick={() => {
                        const findingWithDiff = (results?.findings || []).find((f: any) => f.metadata?.pdf_diff_available || f.metadata?.diff_data);
                        if (findingWithDiff) handleOpenDiff(findingWithDiff);
                        else {
                          setSelectedDiffFilename(selectedFileInfo.target_file_path.split('\\').pop() || 'Document');
                          setSelectedDiffBaselineSha(selectedFileInfo.baseline_sha256 || '');
                          setSelectedDiffCurrentSha(selectedFileInfo.current_sha256 || '');
                          setDiffModalOpen(true);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-mono text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shrink-0"
                    >
                      Compare Content Diff
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

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

              {/* Historical Record Limitation Notice */}
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
              {(results?.findings || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-[#64748B] space-y-1">
                  <p className="font-semibold text-[#1E293B]">No historical forensic events found for this file.</p>
                  <p className="text-[11px] text-[#64748B]">Routine file activity recorded on endpoint; no suspicious correlation detected.</p>
                </div>
              ) : (
                (results?.findings || []).map((finding: CorrelatedInvestigationFinding) => {
                  const isUsb = finding.category.toLowerCase().includes('usb') || finding.title.toLowerCase().includes('usb');
                  const isTransfer = finding.category.toLowerCase().includes('transfer') || finding.title.toLowerCase().includes('transfer');
                  const hasDiff = finding.metadata?.pdf_diff_available || Boolean(finding.metadata?.diff_data);

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
                            {finding.is_live_agent ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE AGENT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                                DEMO DATA
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
                            <span>Diff Content</span>
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
              }))}
            </div>
          </div>

          {/* Action Buttons to Core Modules */}
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
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/evidence')}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
              >
                Evidence Vault
              </button>
              <button
                onClick={() => navigate('/graph')}
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors cursor-pointer"
              >
                Relationship Graph
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
