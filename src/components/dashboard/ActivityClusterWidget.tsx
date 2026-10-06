import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitCommit, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Usb, 
  FileText, 
  Copy, 
  Terminal, 
  Trash2,
  CheckCircle2,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SeverityBadge } from '../common/SeverityBadge';

export const ActivityClusterWidget: React.FC = () => {
  const navigate = useNavigate();
  const { activityClusters, anomalies } = useApp();

  const primaryCluster = activityClusters[0] || {
    id: 'cluster-primary',
    caseId: 'CASE-2026-001',
    title: 'Primary Exfiltration & Anti-Forensic Sequence',
    description: 'Correlated activity window showing unauthorized physical storage attachment immediately followed by classified file duplication, malware invocation, and audit trail truncation.',
    startTime: '2026-10-05T09:45:10Z',
    endTime: '2026-10-05T09:55:04Z',
    eventCount: 5,
    severity: 'CRITICAL',
    confidence: 'High',
    confidenceReason: 'Correlated across 3 distinct host telemetry log sources within 10-minute window.',
    sequenceSummary: '09:45 USB Connected → 09:47 Sensitive File Accessed → 09:48 File Copied to Removable Drive → 09:50 Suspicious Binary Observed → 09:55 Files Deleted / Anti-Forensics'
  };

  const steps = [
    { time: '09:45:10', title: 'USB Connected', sub: 'Kingston DataTraveler', icon: Usb, color: 'text-amber-400', border: 'border-amber-500/30' },
    { time: '09:47:18', title: 'Sensitive File Read', sub: 'confidential.pdf', icon: FileText, color: 'text-red-400', border: 'border-red-500/30' },
    { time: '09:48:42', title: 'File Copied', sub: 'E:\\Backup volume', icon: Copy, color: 'text-red-400', border: 'border-red-500/30' },
    { time: '09:50:22', title: 'Suspicious Binary', sub: 'suspicious.exe %TEMP%', icon: Terminal, color: 'text-red-400', border: 'border-red-500/30' },
    { time: '09:55:04', title: 'Anti-Forensics', sub: 'VSS & Log purge', icon: Trash2, color: 'text-red-400', border: 'border-red-500/30' },
  ];

  return (
    <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-6 lg:p-8 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]/60">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              INTELLIGENT CORRELATION ENGINE
            </span>
            <SeverityBadge severity="CRITICAL" size="sm" />
          </div>
          <h3 className="text-lg font-bold text-[#F8FAFC] tracking-tight">
            Correlated Activity Sequence & Heuristic Anomalies
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Automated event clustering grouping related events across distinct host telemetry sources into a unified operational sequence
          </p>
        </div>

        <button
          onClick={() => navigate('/timeline?filter=SUSPICIOUS')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#0E1522] hover:bg-[#111923] text-xs font-mono text-blue-400 hover:text-blue-300 border border-blue-500/30 flex items-center gap-2 transition-colors shrink-0"
        >
          <span>Correlated Timeline Stream</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid: Left is Activity Cluster Sequence, Right is Detected Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Correlated Sequence (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#080D15] border border-[#1E293B] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-mono font-bold text-[#F8FAFC] uppercase">
                {primaryCluster.title}
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
              Confidence: {primaryCluster.confidence || 'High'}
            </span>
          </div>

          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {primaryCluster.description}
          </p>

          {/* Sequential Step Chain */}
          <div className="pt-2">
            <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider mb-3">
              Sequential Reconstruction (10-Minute Exposure Window):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {steps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl bg-[#0B1017] border ${step.border} space-y-1.5 relative`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#64748B]">#{idx + 1}</span>
                    <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                  </div>
                  <div className="text-[11px] font-bold text-[#F8FAFC] truncate">
                    {step.title}
                  </div>
                  <div className="text-[10px] font-mono text-[#94A3B8] truncate">
                    {step.sub}
                  </div>
                  <div className="text-[9px] font-mono text-blue-400 pt-1 border-t border-[#1E293B]/40">
                    {step.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1017] border border-[#1E293B]/60 text-[11px] font-mono text-[#94A3B8] flex items-center justify-between">
            <span className="text-[#64748B]">Correlated Evidence IDs:</span>
            <span className="text-blue-400">usb_activity.log • confidential.pdf • suspicious.exe • system.log</span>
          </div>
        </div>

        {/* Right: Detected Forensic Anomalies (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#080D15] border border-[#1E293B] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-mono font-bold text-[#F8FAFC] uppercase">
                Detected Forensic Anomalies ({anomalies.length > 0 ? anomalies.length : 2})
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#64748B]">Deterministic</span>
          </div>

          <div className="space-y-3">
            {(anomalies.length > 0 ? anomalies.slice(0, 2) : [
              {
                id: 'anom-1',
                title: 'Rapid File Access Post Removable Storage Mount',
                severity: 'CRITICAL',
                confidence: 'High',
                detectedAt: '09:47:18 UTC',
                description: 'Classified file read handle was opened only 128 seconds following external USB volume mount.',
                explanation: 'Observed sequence deviates significantly from baseline workstation operational tempo.'
              },
              {
                id: 'anom-2',
                title: 'Confluent Exfiltration & Anti-Forensic Sequence',
                severity: 'CRITICAL',
                confidence: 'High',
                detectedAt: '09:55:04 UTC',
                description: 'Observed 5-stage progression spanning device mount, staging, execution, and volume shadow copy purge.',
                explanation: 'Observed sequence requires further investigation to evaluate potential intentional evidence destruction.'
              }
            ]).map((anom: any) => (
              <div 
                key={anom.id}
                className="p-3.5 rounded-xl bg-[#0B1017] border border-[#1E293B] space-y-2 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC] truncate">
                    {anom.title}
                  </span>
                  <SeverityBadge severity={anom.severity} size="sm" />
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  {anom.description}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-1 border-t border-[#1E293B]/60">
                  <span>Detected: {anom.detectedAt || '09:48 UTC'}</span>
                  <span className="text-emerald-400">Confidence: {anom.confidence || 'High'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/30 text-[10px] text-[#94A3B8] flex items-start gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Forensic Neutrality:</strong> Findings and anomalies are presented with explainable factors. Statements reflect observed telemetry and do not assert legal guilt.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
