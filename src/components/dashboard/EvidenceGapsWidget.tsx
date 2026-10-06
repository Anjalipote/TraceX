import React from 'react';
import { HelpCircle, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SeverityBadge } from '../common/SeverityBadge';

export const EvidenceGapsWidget: React.FC = () => {
  const { evidenceGaps } = useApp();

  const gaps = evidenceGaps.length > 0 ? evidenceGaps : [
    {
      id: 'gap-01',
      caseId: 'CASE-2026-001',
      title: 'Missing Network PCAP Capture during Exfiltration Window',
      gapType: 'missing_telemetry' as const,
      severity: 'HIGH' as const,
      confidence: 'HIGH' as const,
      whyItMatters: 'Network session egress telemetry is absent between 09:48 and 09:55 UTC to verify whether confidential.pdf was transmitted off-premise.',
      suggestedStep: 'Request perimeter firewall NAT session table and NetFlow records for IP 10.0.4.12.',
      isResolved: false
    },
    {
      id: 'gap-02',
      caseId: 'CASE-2026-001',
      title: 'Removable Storage Hardware Serial Discrepancy',
      gapType: 'weak_support' as const,
      severity: 'MEDIUM' as const,
      confidence: 'MEDIUM' as const,
      whyItMatters: 'Vendor VID/PID indicates Kingston DataTraveler, but volume serial was purged from Windows registry MountPoints2.',
      suggestedStep: 'Extract USN Journal from physical drive partition to identify unmounted volume identifiers.',
      isResolved: false
    }
  ];

  return (
    <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B]/80 p-5 space-y-4 shadow-forensic">
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] font-mono tracking-tight flex items-center gap-2">
              <span>EVIDENCE GAPS & ACQUISITION LEADS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                {gaps.length} GAPS DETECTED
              </span>
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              Automated detection of missing telemetry and weak evidentiary links
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {gaps.map((gap) => (
          <div
            key={gap.id}
            className="p-3.5 rounded-xl bg-[#070A0F] border border-[#1E293B] hover:border-amber-500/30 transition-all space-y-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-[#F8FAFC]">
                  {gap.title}
                </span>
              </div>
              <SeverityBadge severity={gap.severity} size="sm" />
            </div>

            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              <strong className="text-[#CBD5E1] font-mono">Why it matters:</strong> {gap.whyItMatters}
            </p>

            <div className="pt-1.5 border-t border-[#1E293B]/60 flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-blue-400 flex items-center gap-1.5 truncate">
                <ArrowRight className="w-3 h-3 shrink-0" />
                <span className="truncate">{gap.suggestedStep}</span>
              </span>
              <span className="text-[10px] text-[#64748B] shrink-0">
                Confidence: <strong className="text-[#94A3B8]">{gap.confidence}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
