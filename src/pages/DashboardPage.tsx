import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Laptop, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  FolderLock,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentCase, selectCase } = useApp();

  const recentInvestigations = [
    {
      id: 'TRX-001',
      computer: 'EMP-LT-001',
      investigator: 'Alex Vance',
      status: 'Completed',
      statusColor: 'emerald',
      suspiciousEvents: 5,
      lastScan: '10 mins ago',
      isTarget: true
    },
    {
      id: 'CASE-2026-001',
      computer: 'WORKSTATION-CORP-FIN09',
      investigator: 'Alex Vance',
      status: 'Active',
      statusColor: 'blue',
      suspiciousEvents: 5,
      lastScan: '12 mins ago',
      isTarget: false
    },
    {
      id: 'CASE-2026-002',
      computer: 'DEV-SRV-NORTH-04',
      investigator: 'Elena Rostova',
      status: 'Closed',
      statusColor: 'slate',
      suspiciousEvents: 0,
      lastScan: '2 days ago',
      isTarget: false
    },
    {
      id: 'CASE-2026-003',
      computer: 'GATEWAY-VPN-02',
      investigator: 'Alex Vance',
      status: 'Under Review',
      statusColor: 'amber',
      suspiciousEvents: 3,
      lastScan: '5 hours ago',
      isTarget: false
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
          Dashboard
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Welcome back! Start a new investigation or view recent activity.
        </p>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Investigations */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Total Investigations</p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">12</p>
            <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
              +2 this week
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Suspicious Events */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Suspicious Events</p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">5</p>
            <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
              +3 since last scan
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Reports Generated */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Reports Generated</p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">8</p>
            <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
              +4 this week
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Active Cases */}
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Active Cases</p>
            <p className="text-2xl font-bold text-[#1E293B] mt-1">3</p>
            <p className="text-xs font-medium text-indigo-600 mt-1 flex items-center gap-1">
              1 ongoing
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FolderLock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3 Main Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Hero Investigate Host */}
        <div className="bg-indigo-600 text-white rounded-2xl p-6 shadow-md shadow-indigo-600/20 flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white mb-4">
              <Laptop className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Investigate Host
            </h3>
            <p className="text-xs text-indigo-100 mt-1.5 leading-relaxed">
              Collect and analyze forensic artifacts from a target computer.
            </p>
          </div>
          <div className="pt-6">
            <button
              onClick={() => navigate('/forensic-access')}
              className="w-full sm:w-auto bg-white hover:bg-indigo-50 text-indigo-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: View Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
              <Clock className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-lg font-bold text-[#1E293B]">
              View Timeline
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Explore correlated events and activity timeline.
            </p>
          </div>
          <div className="pt-6">
            <button
              onClick={() => navigate('/timeline')}
              className="w-full sm:w-auto bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Timeline</span>
            </button>
          </div>
        </div>

        {/* Card 3: Generate Report */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
              <FileText className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-lg font-bold text-[#1E293B]">
              Generate Report
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Create detailed investigation reports.
            </p>
          </div>
          <div className="pt-6">
            <button
              onClick={() => navigate('/reports')}
              className="w-full sm:w-auto bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Investigations Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1E293B]">
              Recent Investigations
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Overview of ongoing and completed forensic investigations across systems.
            </p>
          </div>
          <button
            onClick={() => navigate('/forensic-access')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Investigate Host</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-5">Case ID</th>
                <th className="py-3 px-5">Target Computer</th>
                <th className="py-3 px-5">Investigator</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Suspicious Events</th>
                <th className="py-3 px-5">Last Scan</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
              {recentInvestigations.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-indigo-600">
                    {inv.id}
                  </td>
                  <td className="py-3.5 px-5 font-medium text-[#1E293B]">
                    {inv.computer}
                  </td>
                  <td className="py-3.5 px-5 text-[#64748B]">
                    {inv.investigator}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      inv.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : inv.status === 'Active'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : inv.status === 'Under Review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-medium">
                    {inv.suspiciousEvents > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        {inv.suspiciousEvents} events
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">0 events</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-[#64748B]">
                    {inv.lastScan}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => {
                        if (inv.isTarget) {
                          navigate('/forensic-access?step=4');
                        } else {
                          selectCase(inv.id);
                          navigate('/timeline');
                        }
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      {inv.isTarget ? 'View Results' : 'View Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
