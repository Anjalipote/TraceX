import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Usb, 
  FileText, 
  Copy, 
  Terminal, 
  Trash2, 
  ArrowRight, 
  ShieldAlert, 
  ExternalLink, 
  Clock, 
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { SeverityBadge } from '../common/SeverityBadge';
import { InvestigationStoryStep } from '../../types';
import { useApp } from '../../context/AppContext';

export const InvestigationStory: React.FC = () => {
  const navigate = useNavigate();
  const { currentCase, timeline, evidence, findings, riskSummary } = useApp();
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  const currentScore = riskSummary?.score ?? 0;
  const isClean = currentScore === 0 && findings.length === 0;

  const demoSteps: (InvestigationStoryStep & {
    stepNum: string;
    sourceArtifact: string;
    details: string;
    targetRoute: string;
  })[] = [
    {
      stepNum: '01',
      time: '09:45',
      title: 'USB Device Connected',
      description: 'Unauthorized Kingston DataTraveler 3.0 inserted into USB Port 1.',
      severity: 'HIGH',
      iconType: 'usb',
      sourceArtifact: 'setupapi.dev.log (VID_0951&PID_1666)',
      details: 'Device serial 001A4D5978C1 mounted as removable volume E:\\ with FAT32 partition. No DLP exception token found.',
      targetRoute: '/timeline?filter=USB'
    },
    {
      stepNum: '02',
      time: '09:47',
      title: 'confidential.pdf Accessed',
      description: 'Sensitive patent blueprint opened by Admin account.',
      severity: 'CRITICAL',
      iconType: 'file',
      sourceArtifact: 'Security.evtx (Event ID 4663)',
      details: 'ReadData access handle granted to AcroRd32.exe. File classified as Tier 1 Trade Secret with SHA-256 hash ending in ...d45e90.',
      targetRoute: '/evidence?selected=ev-001'
    },
    {
      stepNum: '03',
      time: '09:48',
      title: 'confidential.pdf Copied',
      description: 'Duplicated directly onto removable drive E:\\Backup.',
      severity: 'CRITICAL',
      iconType: 'copy',
      sourceArtifact: 'NTFS USN Journal ($J) Entry #8911029',
      details: 'Volume write transaction confirmed file write of 2.4 MB to external storage target E:\\Backup\\confidential.pdf.',
      targetRoute: '/graph?node=node-confidential-pdf'
    },
    {
      stepNum: '04',
      time: '09:50',
      title: 'suspicious.exe Executed',
      description: 'Unsigned executable spawned from %TEMP% directory.',
      severity: 'CRITICAL',
      iconType: 'exe',
      sourceArtifact: 'Sysmon Event ID 1 (PID 4892)',
      details: 'High-entropy unsigned binary launched with elevated rights using command line flag "-wipe -all". Parent process: explorer.exe.',
      targetRoute: '/findings?finding=find-001'
    },
    {
      stepNum: '05',
      time: '09:55',
      title: 'Multiple Files Deleted',
      description: 'Anti-forensic purge of 42 files and Volume Shadow Copies.',
      severity: 'CRITICAL',
      iconType: 'delete',
      sourceArtifact: 'Security.evtx Event 1102 & $MFT',
      details: 'Rapid batch unlinking of audit artifacts and execution of "vssadmin delete shadows /all /quiet" to hinder forensic recovery.',
      targetRoute: '/timeline?filter=SUSPICIOUS'
    }
  ];

  const cleanSteps: (InvestigationStoryStep & {
    stepNum: string;
    sourceArtifact: string;
    details: string;
    targetRoute: string;
  })[] = [
    {
      stepNum: '01',
      time: 'Phase 1',
      title: 'Cryptographic Ledger Ingestion',
      description: `Ingested ${evidence.length} artifact(s) with verified SHA-256 checksums.`,
      severity: 'LOW',
      iconType: 'file',
      sourceArtifact: 'Integrity Ledger',
      details: 'Inert binary analysis confirmed zero byte-tampering. All cryptographic hashes match chain-of-custody intake.',
      targetRoute: '/integrity'
    },
    {
      stepNum: '02',
      time: 'Phase 2',
      title: 'Forensic Metadata Inspection',
      description: 'Passive in-memory header scan confirmed authentic file formats.',
      severity: 'LOW',
      iconType: 'exe',
      sourceArtifact: 'Metadata Extractor',
      details: 'Magic bytes match extensions. Zero obfuscated scripts, leaked credentials, or malicious shell patterns identified.',
      targetRoute: '/evidence'
    },
    {
      stepNum: '03',
      time: 'Phase 3',
      title: 'Timeline & Correlation Baseline',
      description: `Correlated ${timeline.length} event(s) across host journal sequence.`,
      severity: 'LOW',
      iconType: 'copy',
      sourceArtifact: 'Timeline Correlation Engine',
      details: 'Normal operational sequence. Zero anomalous rapid staging, off-hours execution, or mass-deletion anti-forensics detected.',
      targetRoute: '/timeline'
    },
    {
      stepNum: '04',
      time: 'Phase 4',
      title: 'Deterministic Risk Evaluation',
      description: 'Case evaluated at 0/100 (NO RISK - Clean Baseline).',
      severity: 'LOW',
      iconType: 'usb',
      sourceArtifact: 'TraceX Risk Service',
      details: 'Multi-dimensional risk score calculated 0 severity contribution, 0 anomaly points, and 0 integrity penalties.',
      targetRoute: '/risk'
    },
    {
      stepNum: '05',
      time: 'Phase 5',
      title: 'Compliance & Admissibility Verified',
      description: 'Audit logging and evidentiary chain-of-custody sealed.',
      severity: 'LOW',
      iconType: 'delete',
      sourceArtifact: 'Audit & Compliance Engine',
      details: 'System state verified clean under DFIR evidentiary standards. No threat remediation or endpoint isolation required.',
      targetRoute: '/reports'
    }
  ];

  const storySteps = isClean ? cleanSteps : demoSteps;

  const getStepIcon = (iconType: InvestigationStoryStep['iconType']) => {
    if (isClean) {
      return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    }
    switch (iconType) {
      case 'usb':
        return <Usb className="w-4 h-4 text-amber-400" />;
      case 'file':
        return <FileText className="w-4 h-4 text-red-400" />;
      case 'copy':
        return <Copy className="w-4 h-4 text-red-400" />;
      case 'exe':
        return <Terminal className="w-4 h-4 text-red-400" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const activeStep = storySteps[selectedStepIndex] || storySteps[0];

  return (
    <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-6 lg:p-8 shadow-xl space-y-7 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${isClean ? 'bg-emerald-400' : 'bg-red-500 animate-ping'}`} />
            <h2 className="text-lg font-bold tracking-tight text-[#F8FAFC] font-mono">
              AUTOMATIC INVESTIGATION STORY
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
              isClean ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
            }`}>
              {isClean ? 'Clean Baseline' : 'Correlated Incident'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            {isClean 
              ? `Synthesized baseline for ${currentCase.id} — 0 threats identified across ${evidence.length} evidence items and ${timeline.length} events.`
              : `Synthesized sequence generated from ${timeline.length || 286} timeline events across NTFS, Security logs, USBSTOR, and Sysmon.`}
          </p>
        </div>

        <button
          onClick={() => navigate('/timeline')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <span>View Full Timeline</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Spacious 5-Step Flow Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        {storySteps.map((step, idx) => {
          const isSelected = selectedStepIndex === idx;

          return (
            <div
              key={step.stepNum}
              onClick={() => setSelectedStepIndex(idx)}
              className={`group cursor-pointer rounded-2xl p-4.5 transition-all duration-200 border flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#111923] border-blue-500/80 ring-1 ring-blue-500/40 shadow-md'
                  : 'bg-[#080D15] border-[#1E293B]/60 hover:border-blue-500/30 hover:bg-[#0E1522]'
              }`}
            >
              <div>
                {/* Header: Step Number & Time Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold text-[#64748B]">
                    #{step.stepNum}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-blue-400 bg-blue-950/40 border border-blue-800/30 px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>{step.time}</span>
                  </div>
                </div>

                {/* Title & Icon */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-[#0B1017] border border-[#1E293B]/70 shrink-0">
                    {getStepIcon(step.iconType)}
                  </div>
                  <h4 className="text-xs font-bold text-[#F8FAFC] leading-snug group-hover:text-blue-300 transition-colors">
                    {step.title}
                  </h4>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
                  {step.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1E293B]/50 flex items-center justify-between text-[10px] text-[#64748B]">
                <SeverityBadge severity={step.severity} size="sm" />
                <span className={`font-mono text-xs flex items-center gap-0.5 ${
                  isSelected ? 'text-blue-400 font-semibold' : 'text-[#64748B]'
                }`}>
                  Details <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Step Spotlight Banner */}
      <div className="rounded-2xl bg-[#080D15] border border-blue-500/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md">
              MILESTONE #{activeStep.stepNum} [{activeStep.time}]
            </span>
            <span className="text-sm font-bold text-[#F8FAFC]">
              {activeStep.title}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed pt-1">
            {activeStep.details}
          </p>
          <p className="text-[11px] font-mono text-[#64748B] pt-0.5">
            Forensic Artifact: {activeStep.sourceArtifact}
          </p>
        </div>

        <button
          onClick={() => navigate(activeStep.targetRoute)}
          className="shrink-0 px-4 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 text-xs font-semibold border border-blue-500/30 flex items-center gap-1.5 transition-colors font-mono self-start md:self-center"
        >
          <span>Inspect Artifact</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Risk Score Callout */}
      <div className="rounded-2xl bg-gradient-to-r from-red-950/20 via-[#0B1017] to-[#0B1017] border border-red-900/40 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-red-950/50 border border-red-800/60 text-red-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-wider text-[#94A3B8] uppercase">
                INVESTIGATION RISK SCORE
              </span>
              <span className="font-mono text-xl font-black text-red-400">
                87 <span className="text-xs font-normal text-[#94A3B8]">/ 100</span>
              </span>
              <SeverityBadge severity="CRITICAL" size="sm" />
            </div>
            <p className="text-xs text-[#F8FAFC] leading-relaxed max-w-3xl">
              &quot;A potentially suspicious sequence was detected involving external-device activity, access to sensitive evidence, execution of an unidentified executable, and subsequent file deletion.&quot;
            </p>
            <p className="text-[10px] text-[#64748B] font-mono">
              * Score calculation: USB Activity (+15) + Sensitive File Access (+20) + File Copy (+20) + Unknown Executable (+20) + Mass Deletion (+12)
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/risk')}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-[#080D15] hover:bg-[#111923] text-[#F8FAFC] border border-[#1E293B] hover:border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors font-mono self-start lg:self-center"
        >
          <span>RISK BREAKDOWN</span>
          <ChevronRight className="w-4 h-4 text-blue-400" />
        </button>
      </div>
    </div>
  );
};
