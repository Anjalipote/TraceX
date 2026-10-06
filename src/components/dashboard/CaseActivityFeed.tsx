import React from 'react';
import { Activity, User, Shield, Terminal, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const CaseActivityFeed: React.FC = () => {
  const navigate = useNavigate();
  const { caseActivity } = useApp();

  const activities = caseActivity.length > 0 ? caseActivity.slice(0, 5) : [
    {
      id: 'act-01',
      action: 'PIPELINE_RUN',
      user: 'investigator@tracex.demo',
      role: 'ADMIN',
      timestamp: '2026-10-06T10:15:00Z',
      timeFormatted: '10:15 UTC',
      result: 'SUCCESS',
      description: 'Automated correlation pipeline executed for CASE-2026-001.'
    },
    {
      id: 'act-02',
      action: 'EVIDENCE_UPLOAD',
      user: 'marcus.thorne@tracex.demo',
      role: 'INVESTIGATOR',
      timestamp: '2026-10-06T09:50:00Z',
      timeFormatted: '09:50 UTC',
      result: 'SUCCESS',
      description: 'Ingested raw memory dump and WinEvent log.'
    },
    {
      id: 'act-03',
      action: 'REPORT_GENERATE',
      user: 'investigator@tracex.demo',
      role: 'ADMIN',
      timestamp: '2026-10-06T09:30:00Z',
      timeFormatted: '09:30 UTC',
      result: 'SUCCESS',
      description: 'Generated court-admissible forensic dossier TX-REP-2026-001.'
    }
  ];

  return (
    <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B]/80 p-5 space-y-4 shadow-forensic">
      <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] font-mono tracking-tight">
              INVESTIGATION ACTIVITY FEED
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              Real-time forensic operations & audit stream
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/audit')}
          className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <span>Full Audit Log</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((act) => (
          <div
            key={act.id}
            className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B] flex items-center justify-between gap-3 text-xs font-mono"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {act.action}
                </span>
                <span className="text-[#94A3B8] text-[11px] truncate">
                  {act.user}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#162032] text-[#64748B]">
                  {act.role}
                </span>
              </div>
              <p className="text-[11px] text-[#CBD5E1] truncate font-sans">
                {act.description}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-[#64748B] block">{act.timeFormatted}</span>
              <span className="text-[10px] text-emerald-400 font-bold">{act.result}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
