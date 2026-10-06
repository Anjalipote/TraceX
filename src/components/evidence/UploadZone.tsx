import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileArchive, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SimulatedFile {
  name: string;
  size: string;
  type: string;
}

export const UploadZone: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SimulatedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const simulationSteps = [
    { title: 'Uploading forensic images & containers...', desc: 'Reading raw sectors and verifying container header magic bytes' },
    { title: 'Calculating SHA-256 cryptographic hashes...', desc: 'Verifying MD5 / SHA-256 digests against NIST NSRL RDS database' },
    { title: 'Extracting metadata & timestamps...', desc: 'Parsing NTFS $MFT, ShellBags, LNK shortcuts, and prefetch records' },
    { title: 'Building unified forensic timeline...', desc: 'Aligning UTC timestamps across OS event logs, USN journals, and USB hives' },
    { title: 'Correlating evidence entities...', desc: 'Graphing actor-to-device-to-file relationships and access patterns' },
    { title: 'Detecting suspicious activity & anti-forensics...', desc: 'Heuristic pattern matching against MITRE ATT&CK enterprise tactics' },
    { title: 'Analysis Complete!', desc: '128 files analyzed, 286 events extracted, 12 findings detected' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Simulate accepted files from drop
    const files: SimulatedFile[] = [
      { name: 'evidence_seizure_vault.zip', size: '2.4 GB', type: 'Forensic ZIP Archive' },
      { name: 'corp_workstation_e01.dd', size: '48.2 GB', type: 'Raw Disk Image' },
      { name: 'triage_triage_package.tar.gz', size: '320 MB', type: 'Compressed Artifacts' },
    ];
    setSelectedFiles(files);
    showToast('Files Queued', '3 forensic evidence containers ready for analysis pipeline.', 'info');
  };

  const handleSelectFiles = () => {
    // Simulated selection
    const mockFiles: SimulatedFile[] = [
      { name: 'seizure_case_2026_001.zip', size: '1.8 GB', type: 'E01/ZIP Evidence Package' },
      { name: 'security_event_dumps.evtx', size: '142 MB', type: 'Windows Event Logs' },
      { name: 'memory_dump_win11.raw', size: '16.0 GB', type: 'Physical RAM Dump' },
    ];
    setSelectedFiles(mockFiles);
    showToast('Evidence Selected', 'Forensic archive containers attached.', 'info');
  };

  const startAnalysisSimulation = () => {
    if (selectedFiles.length === 0) return;
    setIsAnalyzing(true);
    setCurrentStep(0);
    setIsCompleted(false);

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < simulationSteps.length) {
        setCurrentStep(step);
      } else {
        clearInterval(interval);
        setIsAnalyzing(false);
        setIsCompleted(true);
        showToast('Pipeline Finished', '128 files analyzed, 286 events correlated, Risk Score: 87/100.', 'success');
        if (onComplete) onComplete();
      }
    }, 900);
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setIsAnalyzing(false);
    setCurrentStep(0);
    setIsCompleted(false);
  };

  return (
    <div className="rounded-2xl bg-[#0D131C] border border-[#1D2939] p-6 lg:p-8 space-y-6">
      {/* Synthetic Demo Banner Notice */}
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300">
        <Info className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-mono">
          <strong>DEMO / SYNTHETIC PROCESSING MODE:</strong> Forensic ingestion simulation demonstrates the TraceX workflow and event correlation pipeline. Browser-side processing uses synthetic simulation.
        </span>
      </div>

      {!isCompleted && !isAnalyzing && (
        <>
          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-600/10 scale-[1.01]'
                : 'border-[#1D2939] hover:border-blue-500/50 bg-[#070A0F]'
            }`}
            onClick={handleSelectFiles}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={handleSelectFiles}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#111923] border border-[#1D2939] flex items-center justify-center text-blue-400 shadow-forensic">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#F8FAFC] tracking-wide font-mono">
                  DROP DIGITAL EVIDENCE HERE
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Supports raw disk images (.E01, .dd), memory dumps (.raw), event logs (.evtx), and forensic ZIP packages
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectFiles();
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wider font-mono uppercase transition-colors shadow-forensic"
                >
                  SELECT FILES
                </button>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="rounded-xl bg-[#070A0F] border border-[#1D2939] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#94A3B8] font-bold uppercase">Attached Evidence Containers ({selectedFiles.length})</span>
                <button
                  onClick={resetUpload}
                  className="text-red-400 hover:text-red-300 underline"
                >
                  Clear Selection
                </button>
              </div>

              <div className="space-y-2">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D131C] border border-[#1D2939] text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileArchive className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-[#F8FAFC]">{file.name}</span>
                      <span className="text-[10px] font-mono text-[#64748B]">({file.type})</span>
                    </div>
                    <span className="font-mono text-[#94A3B8]">{file.size}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={startAnalysisSimulation}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all shadow-forensic"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>START FORENSIC ANALYSIS PIPELINE</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analysis In Progress Simulation */}
      {isAnalyzing && (
        <div className="rounded-2xl bg-[#070A0F] border border-[#1D2939] p-8 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-blue-400 font-bold">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>PROCESSING FORENSIC EVIDENCE PIPELINE</span>
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">
                {simulationSteps[currentStep].title}
              </h3>
              <p className="text-xs text-[#94A3B8] font-mono">
                {simulationSteps[currentStep].desc}
              </p>
            </div>
            <span className="text-xl font-mono font-bold text-blue-400">
              {Math.round(((currentStep + 1) / simulationSteps.length) * 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#111923] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / simulationSteps.length) * 100}%` }}
            />
          </div>

          {/* Steps Timeline Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
            {simulationSteps.slice(0, 6).map((step, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                    isPast
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : isCurrent
                      ? 'bg-blue-950/40 border-blue-500/60 text-blue-300 shadow-forensic'
                      : 'bg-[#0D131C] border-[#1D2939] text-[#64748B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-[#1D2939] flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                    )}
                    <span className="font-semibold truncate">{step.title.split('...')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="rounded-2xl bg-[#070A0F] border border-emerald-800/60 p-8 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                FORENSIC PIPELINE COMPLETE
              </span>
              <h3 className="text-xl font-bold text-[#F8FAFC]">
                Evidence Ingestion & Correlation Succeeded
              </h3>
              <p className="text-xs text-[#94A3B8]">
                All cryptographic signatures calculated and aligned to unified timeline.
              </p>
            </div>
          </div>

          {/* Result Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1D2939]">
              <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">Files Analyzed</span>
              <span className="text-2xl font-bold font-mono text-[#F8FAFC]">128</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1D2939]">
              <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">Events Extracted</span>
              <span className="text-2xl font-bold font-mono text-blue-400">286</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1D2939]">
              <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">Findings Detected</span>
              <span className="text-2xl font-bold font-mono text-amber-400">12</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0D131C] border border-red-900/60">
              <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">Risk Score</span>
              <span className="text-2xl font-bold font-mono text-red-400">87/100</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={resetUpload}
              className="px-4 py-2 rounded-xl bg-[#111923] hover:bg-[#1D2939] text-[#94A3B8] hover:text-white text-xs font-mono transition-colors"
            >
              Analyze Another Dataset
            </button>
            <button
              onClick={() => {
                if (onComplete) onComplete();
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all shadow-forensic"
            >
              <span>Explore Ingested Evidence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
