import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Plus, 
  Search, 
  FolderLock, 
  CheckCircle2, 
  ExternalLink, 
  ShieldAlert, 
  Clock, 
  User,
  HardDrive,
  Calendar,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { Modal } from '../components/common/Modal';

export const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { cases, currentCase, selectCase, createCase, investigator } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [assignedInvestigator, setAssignedInvestigator] = useState(investigator.name);
  const [description, setDescription] = useState('');
  const [targetSystem, setTargetSystem] = useState('');

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCase({
      name,
      investigator: assignedInvestigator,
      description: description || 'Digital evidence investigation and anomaly reconstruction.',
      targetSystem: targetSystem || 'WIN11-WORKSTATION-EVID',
    });

    setIsModalOpen(false);
    setName('');
    setDescription('');
    setTargetSystem('');
  };

  const filteredCases = cases.filter(c =>
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.investigator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1D2939]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Case Management Vault
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
            Active and archived digital forensics incident investigation repositories
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-forensic shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ NEW CASE</span>
        </button>
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D131C] border border-[#1D2939]">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Case ID, title, or assigned investigator..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[#94A3B8]">
          <span>Total Vaults: <strong className="text-[#F8FAFC]">{cases.length}</strong></span>
          <span>•</span>
          <span>Active: <strong className="text-emerald-400">1</strong></span>
          <span>•</span>
          <span>Closed: <strong className="text-slate-400">1</strong></span>
        </div>
      </div>

      {/* Cases Table */}
      <div className="rounded-xl border border-[#1D2939] bg-[#0D131C] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1D2939] bg-[#0A0F17] text-[#94A3B8] font-mono text-[11px] uppercase tracking-wider select-none">
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Case Name</th>
                <th className="py-3.5 px-4">Investigator</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Evidence</th>
                <th className="py-3.5 px-4">Risk</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2939]">
              {filteredCases.map((c) => {
                const isActiveVault = currentCase.id === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => {
                      selectCase(c.id);
                      navigate('/dashboard');
                    }}
                    className={`group cursor-pointer transition-colors duration-150 ${
                      isActiveVault
                        ? 'bg-blue-600/10 hover:bg-blue-600/15'
                        : 'hover:bg-[#111923]'
                    }`}
                  >
                    {/* Case ID */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <FolderLock className={`w-4 h-4 ${isActiveVault ? 'text-blue-400' : 'text-[#64748B]'}`} />
                        <span className="font-mono font-bold text-blue-400 text-xs">
                          {c.id}
                        </span>
                        {isActiveVault && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active Case Vault" />
                        )}
                      </div>
                    </td>

                    {/* Case Name */}
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-semibold text-[#F8FAFC] group-hover:text-blue-300 transition-colors text-xs">
                          {c.name}
                        </span>
                        <p className="text-[11px] text-[#64748B] line-clamp-1 max-w-sm mt-0.5">
                          {c.description}
                        </p>
                      </div>
                    </td>

                    {/* Investigator */}
                    <td className="py-4 px-4 text-[#94A3B8]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>{c.investigator}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        c.status === 'Active' 
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : c.status === 'Under Review'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    {/* Evidence count */}
                    <td className="py-4 px-4 font-mono text-[#94A3B8]">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                        <span>{c.evidenceCount} Files</span>
                      </div>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-4 px-4">
                      <RiskBadge score={c.riskScore} severity={c.severity} size="sm" />
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 font-mono text-[11px] text-[#64748B]">
                      {c.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectCase(c.id);
                          navigate('/dashboard');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#070A0F] hover:bg-blue-600/20 text-blue-400 text-xs font-mono font-semibold border border-[#1D2939] hover:border-blue-500/40 transition-colors"
                      >
                        {isActiveVault ? 'Open Vault' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* + NEW CASE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initialize New Forensic Case Vault"
        subtitle="Create an encrypted chain-of-custody case repository"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCase} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-[#94A3B8] block">
              Case Name / Incident Designation *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ransomware Staging & Exfiltration Review"
              className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#94A3B8] block">
                Lead Investigator
              </label>
              <input
                type="text"
                value={assignedInvestigator}
                onChange={(e) => setAssignedInvestigator(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#94A3B8] block">
                Target Host / System ID
              </label>
              <input
                type="text"
                value={targetSystem}
                onChange={(e) => setTargetSystem(e.target.value)}
                placeholder="e.g., WORKSTATION-SEC-01"
                className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] placeholder-[#64748B] font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-medium text-[#94A3B8] block">
              Case Scope & Initial Triage Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details regarding digital evidence seizure, authorized custody scope, or suspected indicators of compromise..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono resize-none"
            />
          </div>

          <div className="pt-4 border-t border-[#1D2939] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-[#111923] hover:bg-[#1D2939] text-xs text-[#94A3B8] font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-forensic"
            >
              Initialize Vault
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
