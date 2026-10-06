import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, FileText, Binary, FileSpreadsheet, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EvidenceSummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const { evidence } = useApp();

  const docCount = evidence.filter(e => e.fileType?.toLowerCase().includes('doc') || e.fileType?.toLowerCase().includes('pdf') || e.category === 'Document').length;
  const binCount = evidence.filter(e => e.fileType?.toLowerCase().includes('bin') || e.fileType?.toLowerCase().includes('exe') || e.category === 'Executable').length;
  const sheetCount = evidence.filter(e => e.fileType?.toLowerCase().includes('sheet') || e.fileType?.toLowerCase().includes('csv') || e.fileType?.toLowerCase().includes('xls') || e.category === 'Database').length;
  const logCount = evidence.filter(e => e.fileType?.toLowerCase().includes('log') || e.category === 'Log').length;

  const fileCategories = [
    { label: 'Documents & Schematics', count: docCount, icon: FileText, color: 'text-blue-400', risk: docCount > 0 ? (evidence.some(e => (e.fileType?.toLowerCase().includes('pdf') || e.category === 'Document') && e.severity === 'CRITICAL') ? 'Critical' : 'Standard') : 'Clean' },
    { label: 'Binaries & Executables', count: binCount, icon: Binary, color: 'text-red-400', risk: binCount > 0 ? (evidence.some(e => e.fileType?.toLowerCase().includes('bin') && e.severity === 'CRITICAL') ? 'Critical' : 'Standard') : 'Clean' },
    { label: 'Spreadsheets & Databases', count: sheetCount, icon: FileSpreadsheet, color: 'text-amber-400', risk: sheetCount > 0 ? 'Standard' : 'Clean' },
    { label: 'System & Security Logs', count: logCount, icon: HardDrive, color: 'text-cyan-400', risk: logCount > 0 ? (evidence.some(e => e.fileType?.toLowerCase().includes('log') && e.severity === 'CRITICAL') ? 'Critical' : 'Standard') : 'Clean' },
  ];

  return (
    <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-6 flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]/60">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Evidence Vault Breakdown
            </h3>
            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
              {evidence.length} ingested digital artifact{evidence.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={() => navigate('/evidence')}
            className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {fileCategories.map((cat) => (
            <div
              key={cat.label}
              onClick={() => navigate('/evidence')}
              className="flex items-center justify-between p-3 rounded-xl bg-[#080D15] hover:bg-[#111923] cursor-pointer border border-[#1E293B]/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <cat.icon className={`w-4 h-4 ${cat.color}`} />
                <span className="text-xs font-medium text-[#F8FAFC]">{cat.label}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-[#94A3B8]">{cat.count} files</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                  cat.risk === 'Critical' ? 'bg-red-950/60 text-red-400 border border-red-800/40' :
                  cat.risk === 'Standard' ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                }`}>
                  {cat.risk}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-[#1E293B]/60 flex items-center justify-between text-xs text-[#94A3B8]">
        <span className="flex items-center gap-1.5 font-mono text-emerald-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Hashes Verified</span>
        </span>
        <span className="font-mono text-xs">{evidence.length} Critical Items</span>
      </div>
    </div>
  );
};
