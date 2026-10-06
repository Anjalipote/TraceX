import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Shield, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Terminal,
  Activity
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuditLogItem } from '../types';
import { api } from '../services/api';

const DEFAULT_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-001',
    action: 'PIPELINE_RUN',
    userEmail: 'investigator@tracex.demo',
    userRole: 'ADMIN',
    caseId: 'CASE-2026-001',
    objectType: 'Case',
    objectId: 'CASE-2026-001',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1',
    createdAt: '2026-10-06T10:15:22Z',
    timeFormatted: '06 Oct 2026 10:15:22 UTC'
  },
  {
    id: 'aud-002',
    action: 'REPORT_GENERATE',
    userEmail: 'investigator@tracex.demo',
    userRole: 'ADMIN',
    caseId: 'CASE-2026-001',
    objectType: 'Report',
    objectId: 'TX-REP-2026-001',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1',
    createdAt: '2026-10-06T10:12:00Z',
    timeFormatted: '06 Oct 2026 10:12:00 UTC'
  },
  {
    id: 'aud-003',
    action: 'CASE_ACCESS',
    userEmail: 'sarah.chen@tracex.demo',
    userRole: 'VIEWER',
    caseId: 'CASE-RESTRICTED-099',
    objectType: 'Case',
    objectId: 'CASE-RESTRICTED-099',
    result: 'DENIED',
    ipAddress: '10.0.4.55',
    createdAt: '2026-10-06T09:58:14Z',
    timeFormatted: '06 Oct 2026 09:58:14 UTC'
  },
  {
    id: 'aud-004',
    action: 'EVIDENCE_UPLOAD',
    userEmail: 'marcus.thorne@tracex.demo',
    userRole: 'INVESTIGATOR',
    caseId: 'CASE-2026-001',
    objectType: 'Evidence',
    objectId: 'ev-007',
    result: 'SUCCESS',
    ipAddress: '10.0.4.12',
    createdAt: '2026-10-06T09:45:00Z',
    timeFormatted: '06 Oct 2026 09:45:00 UTC'
  },
  {
    id: 'aud-005',
    action: 'INTEGRITY_CHECK',
    userEmail: 'system-agent@tracex.internal',
    userRole: 'ADMIN',
    caseId: 'CASE-2026-001',
    objectType: 'EvidenceVault',
    objectId: 'ALL',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1',
    createdAt: '2026-10-06T09:30:00Z',
    timeFormatted: '06 Oct 2026 09:30:00 UTC'
  },
  {
    id: 'aud-006',
    action: 'USER_ROLE_UPDATE',
    userEmail: 'investigator@tracex.demo',
    userRole: 'ADMIN',
    objectType: 'User',
    objectId: 'user-02',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1',
    createdAt: '2026-10-06T08:00:00Z',
    timeFormatted: '06 Oct 2026 08:00:00 UTC'
  },
  {
    id: 'aud-007',
    action: 'LOGIN',
    userEmail: 'investigator@tracex.demo',
    userRole: 'ADMIN',
    objectType: 'AuthSession',
    objectId: 'sess-8491',
    result: 'SUCCESS',
    ipAddress: '127.0.0.1',
    createdAt: '2026-10-06T07:45:00Z',
    timeFormatted: '06 Oct 2026 07:45:00 UTC'
  }
];

export const AuditPage: React.FC = () => {
  const { currentCase, showToast } = useApp();
  const [logs, setLogs] = useState<AuditLogItem[]>(DEFAULT_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(
        currentCase.id,
        selectedAction !== 'ALL' ? selectedAction : undefined,
        undefined,
        searchQuery || undefined,
        25,
        (page - 1) * 25
      );
      if (data && data.logs && data.logs.length > 0) {
        setLogs(data.logs.map((l: any) => ({
          id: l.id,
          action: l.action,
          userEmail: l.user_email || l.userEmail,
          userRole: (l.user_role || l.userRole || 'INVESTIGATOR') as any,
          caseId: l.case_id || l.caseId,
          objectType: l.object_type || l.objectType,
          objectId: l.object_id || l.objectId,
          result: (l.result || 'SUCCESS') as any,
          ipAddress: l.ip_address || l.ipAddress || '127.0.0.1',
          createdAt: l.created_at || l.createdAt,
          timeFormatted: l.time_formatted || l.timeFormatted || new Date(l.created_at || Date.now()).toUTCString()
        })));
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentCase.id, selectedAction, selectedResult, page]);

  const filteredLogs = logs.filter((log) => {
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    const matchesResult = selectedResult === 'ALL' || log.result === selectedResult;
    const matchesSearch = 
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.objectId && log.objectId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(searchQuery));
    return matchesAction && matchesResult && matchesSearch;
  });

  const handleExport = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      ['ID,Timestamp,UserEmail,UserRole,Action,ObjectType,ObjectId,Result,IPAddress']
      .concat(filteredLogs.map(l => `${l.id},${l.timeFormatted},${l.userEmail},${l.userRole},${l.action},${l.objectType || ''},${l.objectId || ''},${l.result},${l.ipAddress}`))
      .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TraceX-Audit-Log-${currentCase.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit Log Exported', 'Downloaded immutable forensic audit trail CSV.', 'success');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#1E293B]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              IMMUTABLE AUDIT TRAIL
            </span>
            <span className="text-xs font-mono text-[#64748B]">
              Total Events: <strong className="text-[#94A3B8]">{filteredLogs.length}</strong>
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Forensic Audit & Action Ledger
          </h1>
          <p className="text-xs text-[#94A3B8] max-w-2xl">
            Cryptographically sealed and immutable system audit log capturing all investigator authentications, evidence operations, analysis pipeline executions, and access control authorizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#0B1017] hover:bg-[#111923] text-xs font-mono text-[#94A3B8] hover:text-white border border-[#1E293B] flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E293B] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by user, action, object, or IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#94A3B8] focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CASE_ACCESS">CASE_ACCESS</option>
            <option value="EVIDENCE_UPLOAD">EVIDENCE_UPLOAD</option>
            <option value="PIPELINE_RUN">PIPELINE_RUN</option>
            <option value="REPORT_GENERATE">REPORT_GENERATE</option>
            <option value="INTEGRITY_CHECK">INTEGRITY_CHECK</option>
            <option value="USER_ROLE_UPDATE">USER_ROLE_UPDATE</option>
          </select>

          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs font-mono text-[#94A3B8] focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED (Security Alert)</option>
            <option value="FAILURE">FAILURE</option>
            <option value="WARNING">WARNING</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B] overflow-hidden shadow-forensic">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#070A0F] border-b border-[#1E293B] text-[#64748B] uppercase text-[10px] tracking-wider">
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Investigator / User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target Object</th>
                <th className="p-4">Client IP</th>
                <th className="p-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-[#111923]/60 transition-colors"
                >
                  <td className="p-4 text-[#94A3B8] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>{log.timeFormatted}</span>
                    </div>
                  </td>

                  <td className="p-4 text-[#F8FAFC] whitespace-nowrap font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>{log.userEmail}</span>
                    </div>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      log.userRole === 'ADMIN'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                        : log.userRole === 'INVESTIGATOR'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                    }`}>
                      {log.userRole}
                    </span>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                      {log.action}
                    </span>
                  </td>

                  <td className="p-4 text-[#CBD5E1] whitespace-nowrap">
                    <span className="text-[#64748B]">{log.objectType || 'Target'}: </span>
                    <strong className="text-[#F8FAFC]">{log.objectId || 'N/A'}</strong>
                  </td>

                  <td className="p-4 text-[#64748B] whitespace-nowrap">
                    {log.ipAddress}
                  </td>

                  <td className="p-4 text-right whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                      log.result === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : log.result === 'DENIED'
                        ? 'bg-red-500/10 text-red-400 border-red-500/25 animate-pulse'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    }`}>
                      {log.result === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : log.result === 'DENIED' ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>{log.result}</span>
                    </span>
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
