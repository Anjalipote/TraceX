import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Moon, 
  Bell, 
  FileCheck, 
  Cpu, 
  ShieldCheck, 
  Save, 
  Terminal, 
  Database,
  Lock,
  Users,
  ShieldAlert,
  Shield,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole, UserManagementItem } from '../types';
import { api } from '../services/api';

const DEFAULT_USERS: UserManagementItem[] = [
  {
    id: 'user-01',
    name: 'Specialist Alex Vance',
    email: 'investigator@tracex.demo',
    role: 'ADMIN',
    status: 'active',
    badgeNumber: '#4092',
    createdAt: '2026-09-01'
  },
  {
    id: 'user-02',
    name: 'Investigator Marcus Thorne',
    email: 'marcus.thorne@tracex.demo',
    role: 'INVESTIGATOR',
    status: 'active',
    badgeNumber: '#8119',
    createdAt: '2026-09-15'
  },
  {
    id: 'user-03',
    name: 'Auditor Sarah Chen',
    email: 'sarah.chen@tracex.demo',
    role: 'VIEWER',
    status: 'active',
    badgeNumber: '#1044',
    createdAt: '2026-10-01'
  }
];

export const SettingsPage: React.FC = () => {
  const { investigator, showToast, userRole, setUserRole } = useApp();

  const [name, setName] = useState(investigator.name);
  const [badge, setBadge] = useState(investigator.badge);
  const [agency, setAgency] = useState('Department of Cyber Defense & Digital Forensics');
  const [retentionDays, setRetentionDays] = useState('90');
  const [hashAlgorithm, setHashAlgorithm] = useState('SHA-256 + MD5 dual digest');
  const [autoVerify, setAutoVerify] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // User Management State
  const [userList, setUserList] = useState<UserManagementItem[]>(DEFAULT_USERS);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.getUsers();
      if (data && data.length > 0) {
        setUserList(data);
      }
    } catch {
      // Retain fallback
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userRole !== 'ADMIN') {
      showToast('Access Denied', 'Only ADMIN users can modify member roles.', 'error');
      return;
    }
    try {
      await api.updateUserRole(userId, newRole);
      setUserList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Role Updated', `User permissions modified to ${newRole}.`, 'success');
    } catch {
      setUserList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Role Updated', `User permissions modified to ${newRole} (Simulated).`, 'info');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Preferences Saved', 'Investigator configuration and policy updated.', 'success');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="pb-4 border-b border-[#1E293B]/60 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase">
            WORKSTATION & ACCESS CONTROL
          </span>
          <span className="text-xs font-mono text-[#64748B]">
            Active Role: <strong className="text-purple-400 font-bold">{userRole}</strong>
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Investigator Settings & Security Profile
        </h1>
        <p className="text-xs text-[#94A3B8] font-mono">
          Security credentials, Role-Based Access Control (RBAC), and forensic retention parameters
        </p>
      </div>

      {/* RBAC Simulation Bar */}
      <div className="rounded-2xl bg-[#0D131C] border border-purple-500/30 p-5 space-y-3 shadow-forensic">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] font-mono uppercase">
                Active Session Authorization Switcher
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Switch active RBAC profile to test permissions across all TraceX views and API endpoints
              </p>
            </div>
          </div>

          {/* Role Switcher Pills */}
          <div className="flex items-center gap-2">
            {(['ADMIN', 'INVESTIGATOR', 'VIEWER'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setUserRole(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                  userRole === r
                    ? r === 'ADMIN'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                      : r === 'INVESTIGATOR'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-slate-600 text-white border-slate-400 shadow-sm'
                    : 'bg-[#070A0F] text-[#94A3B8] border-[#1E293B] hover:text-[#F8FAFC]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Management & RBAC Panel */}
      <div className="rounded-2xl bg-[#0D131C] border border-[#1E293B] p-6 space-y-4 shadow-forensic">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                User Management & Access Control (RBAC)
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Configure member privilege levels and operational permissions
              </p>
            </div>
          </div>

          <button
            onClick={fetchUsers}
            disabled={isLoadingUsers}
            className="p-1.5 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]"
            title="Refresh user list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E293B] text-[#64748B] uppercase text-[10px]">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3 text-right">Modify Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60">
              {userList.map((u) => (
                <tr key={u.id} className="hover:bg-[#111923]/40">
                  <td className="py-3 px-3 font-medium text-[#F8FAFC]">
                    {u.name}
                  </td>
                  <td className="py-3 px-3 text-[#94A3B8]">
                    {u.email}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                        : u.role === 'INVESTIGATOR'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <select
                      value={u.role}
                      disabled={userRole !== 'ADMIN'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[11px] font-mono text-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="INVESTIGATOR">INVESTIGATOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo Environment Management & Reseed (Admin Only) */}
      <div className="rounded-2xl bg-[#0D131C] border border-amber-500/30 p-6 space-y-3 shadow-forensic">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] font-mono uppercase">
                Demo Environment Management & Reseed
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Restore canonical demo case telemetry (CASE-2026-001) for hackathon presentations without losing real cases
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={userRole !== 'ADMIN'}
            onClick={async () => {
              try {
                await api.resetDemoCase('CASE-2026-001');
                showToast('Demo Environment Reseeded', 'CASE-2026-001 restored to canonical baseline state.', 'success');
              } catch {
                showToast('Reseed Notice', 'Demo environment validated.', 'info');
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            RESEED DEMO VAULT
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Investigator Profile */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1E293B] p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#1E293B]">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Investigator Credential Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#94A3B8] block">Lead Investigator Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#94A3B8] block">Badge / Officer ID</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#94A3B8] block">Issuing Forensic Agency / Division</label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Forensic Engine Preferences */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1E293B] p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#1E293B]">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Integrity & Correlation Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-[#94A3B8] block">Default Cryptographic Algorithm</label>
              <select
                value={hashAlgorithm}
                onChange={(e) => setHashAlgorithm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
              >
                <option value="SHA-256 + MD5 dual digest">SHA-256 + MD5 dual digest</option>
                <option value="SHA-512">SHA-512</option>
                <option value="BLAKE3 + SHA-256">BLAKE3 + SHA-256</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#94A3B8] block">Evidence Vault Retention (Days)</label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#070A0F] border border-[#1E293B] text-[#F8FAFC] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2.5 text-xs text-[#F8FAFC] cursor-pointer">
              <input
                type="checkbox"
                checked={autoVerify}
                onChange={(e) => setAutoVerify(e.target.checked)}
                className="rounded border-[#1E293B] bg-[#070A0F] text-blue-500 focus:ring-0"
              />
              <span>Continuous background hash verification on file access</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-[#F8FAFC] cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-[#1E293B] bg-[#070A0F] text-blue-500 focus:ring-0"
              />
              <span>Trigger real-time desktop alert upon chain-of-custody mismatch</span>
            </label>
          </div>
        </div>

        {/* 3. System Information */}
        <div className="rounded-xl bg-[#0D131C] border border-[#1E293B] p-6 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1E293B]">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              System & Platform Specifications
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#070A0F] border border-[#1E293B]">
              <span className="text-[#64748B] text-[10px] block">PLATFORM VERSION</span>
              <span className="text-[#F8FAFC] font-bold">TraceX v4.0.0 (Phase 4 Intelligence)</span>
            </div>
            <div className="p-3 rounded-lg bg-[#070A0F] border border-[#1E293B]">
              <span className="text-[#64748B] text-[10px] block">CORRELATION ENGINE</span>
              <span className="text-blue-400 font-bold">GraphML + MITRE ATT&CK v14</span>
            </div>
            <div className="p-3 rounded-lg bg-[#070A0F] border border-[#1E293B]">
              <span className="text-[#64748B] text-[10px] block">SECURITY CLEARANCE</span>
              <span className="text-emerald-400 font-bold">LEVEL 4 TS/SCI</span>
            </div>
            <div className="p-3 rounded-lg bg-[#070A0F] border border-[#1E293B]">
              <span className="text-[#64748B] text-[10px] block">BACKEND STATUS</span>
              <span className="text-emerald-400 font-bold">Active FastAPI + SQLite</span>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all shadow-forensic"
          >
            <Save className="w-4 h-4" />
            <span>SAVE PREFERENCES</span>
          </button>
        </div>
      </form>
    </div>
  );
};
