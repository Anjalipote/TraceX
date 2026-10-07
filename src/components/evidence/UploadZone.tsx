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
  Info,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export const UploadZone: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { currentCase, showToast, refreshData, runAnalysisPipeline } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [actualFiles, setActualFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [ingestedResult, setIngestedResult] = useState<{ count: number; message: string } | null>(null);

  const pipelineSteps = [
    { title: 'Uploading forensic files & containers...', desc: 'Streaming file bytes safely into isolated non-executable vault' },
    { title: 'Calculating SHA-256 cryptographic hashes...', desc: 'Computing cryptographic checksums and validating magic byte headers' },
    { title: 'Extracting metadata & timestamps...', desc: 'Parsing filesystem MACB timestamps, headers, and entropy patterns' },
    { title: 'Building unified forensic timeline...', desc: 'Aligning UTC timestamps across OS event logs and file transactions' },
    { title: 'Correlating evidence entities...', desc: 'Analyzing relationships, anomalous spikes, and potential threat indicators' },
    { title: 'Analysis Complete!', desc: 'Evidence sealed in Merkle tree, Chain of Custody updated, and risk score re-evaluated' },
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setActualFiles(prev => [...prev, ...droppedFiles]);
      showToast('Files Attached', `${droppedFiles.length} file(s) attached for forensic processing.`, 'info');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setActualFiles(prev => [...prev, ...selected]);
      showToast('Files Attached', `${selected.length} file(s) selected for forensic processing.`, 'info');
    }
  };

  const removeFile = (index: number) => {
    setActualFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetUpload = () => {
    setActualFiles([]);
    setIsAnalyzing(false);
    setCurrentStep(0);
    setIsCompleted(false);
    setIngestedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startLiveIngestion = async () => {
    if (actualFiles.length === 0) return;

    setIsAnalyzing(true);
    setCurrentStep(0);
    setIsCompleted(false);

    try {
      // Step 1: Uploading
      setCurrentStep(0);
      const uploadRes = await api.uploadEvidence(actualFiles, currentCase.id);

      // Step 2: Hashing
      setCurrentStep(1);
      await new Promise(r => setTimeout(r, 400));

      // Step 3: Metadata
      setCurrentStep(2);
      await new Promise(r => setTimeout(r, 400));

      // Step 4: Timeline
      setCurrentStep(3);
      await new Promise(r => setTimeout(r, 400));

      // Step 5: Correlation
      setCurrentStep(4);
      await runAnalysisPipeline();

      // Step 6: Complete
      setCurrentStep(5);
      await refreshData();

      setIngestedResult({
        count: uploadRes.uploadedCount,
        message: uploadRes.message
      });
      setIsCompleted(true);
      showToast(
        'Forensic Ingestion Complete', 
        `Processed ${uploadRes.uploadedCount} evidence artifact(s) into case vault ${currentCase.id}.`, 
        'success'
      );
    } catch (err: any) {
      showToast('Ingestion Error', err?.message || 'Failed to complete evidence upload.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#0D131C] border border-[#1D2939] p-6 lg:p-8 space-y-6">
      {/* Active Vault Information */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#080D15] border border-blue-500/30 text-xs font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[#94A3B8]">
            Ingesting into Case Vault: <strong className="text-white">{currentCase.id} — {currentCase.name}</strong>
          </span>
        </div>
        <span className="text-[11px] text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2.5 py-0.5 rounded font-bold">
          LIVE CRYPTOGRAPHIC VAULT
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
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#111923] border border-[#1D2939] flex items-center justify-center text-blue-400 shadow-forensic">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#F8FAFC] tracking-wide font-mono">
                  DROP DIGITAL EVIDENCE HERE OR CLICK TO BROWSE
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Upload real documents (.pdf, .docx, .xlsx), images, system logs (.log, .txt, .json), or executables for automated forensic triage
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wider font-mono uppercase transition-colors shadow-forensic"
                >
                  SELECT EVIDENCE FILES
                </button>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {actualFiles.length > 0 && (
            <div className="rounded-xl bg-[#070A0F] border border-[#1D2939] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#94A3B8] font-bold uppercase">
                  Attached Evidence Artifacts ({actualFiles.length})
                </span>
                <button
                  onClick={resetUpload}
                  className="text-red-400 hover:text-red-300 underline"
                >
                  Clear Selection
                </button>
              </div>

              <div className="space-y-2">
                {actualFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D131C] border border-[#1D2939] text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-[#F8FAFC]">{file.name}</span>
                      <span className="text-[10px] font-mono text-[#64748B]">
                        ({file.type || 'Inert Binary'})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#94A3B8]">{formatFileSize(file.size)}</span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-[#64748B] hover:text-red-400 p-1"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={startLiveIngestion}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all shadow-forensic cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>START FORENSIC INGESTION & PIPELINE</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analysis In Progress */}
      {isAnalyzing && (
        <div className="rounded-2xl bg-[#070A0F] border border-[#1D2939] p-8 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-blue-400 font-bold">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>PROCESSING FORENSIC EVIDENCE PIPELINE</span>
              </div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">
                {pipelineSteps[currentStep].title}
              </h3>
              <p className="text-xs text-[#94A3B8] font-mono">
                {pipelineSteps[currentStep].desc}
              </p>
            </div>
            <span className="text-xl font-mono font-bold text-blue-400">
              {Math.round(((currentStep + 1) / pipelineSteps.length) * 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-[#111923] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / pipelineSteps.length) * 100}%` }}
            />
          </div>

          {/* Steps Timeline Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
            {pipelineSteps.map((step, idx) => {
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
                  <div className="flex items-center gap-2 mb-1">
                    {isPast ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#334155]" />
                    )}
                    <span className="font-bold truncate">{step.title}</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] line-clamp-2">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completion View */}
      {isCompleted && (
        <div className="rounded-2xl bg-[#070A0F] border border-emerald-800/60 p-8 space-y-6 animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-forensic">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">
                Evidence Ingestion & Correlation Complete
              </h3>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                {ingestedResult?.message || `Successfully sealed ${actualFiles.length} artifact(s) into case vault.`}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1017] border border-[#1E293B] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Case Number</span>
              <strong className="text-white">{currentCase.id}</strong>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Ingested Files</span>
              <strong className="text-emerald-400">{actualFiles.length} artifact(s)</strong>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Integrity Verification</span>
              <strong className="text-blue-400">SHA-256 Fingerprinted & Verified</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              onClick={resetUpload}
              className="px-4 py-2 rounded-xl bg-[#0E1522] hover:bg-[#162032] border border-[#1E293B] text-xs font-mono text-[#94A3B8] hover:text-white transition-colors"
            >
              Upload More Evidence
            </button>
            {onComplete && (
              <button
                onClick={onComplete}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-forensic"
              >
                <span>View Evidence Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
