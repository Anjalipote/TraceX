import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  HardDrive, 
  Upload, 
  ListFilter, 
  FolderLock, 
  ShieldCheck, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { EvidenceTable } from '../components/evidence/EvidenceTable';
import { EvidenceDrawer } from '../components/evidence/EvidenceDrawer';
import { UploadZone } from '../components/evidence/UploadZone';
import { EvidenceItem } from '../types';
import { useApp } from '../context/AppContext';

export const EvidencePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { evidence } = useApp();

  const [activeTab, setActiveTab] = useState<'vault' | 'upload'>('vault');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  // Auto-open evidence if query parameter "selected" is present (e.g. from Dashboard or Findings)
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId) {
      const found = evidence.find(e => e.id === selectedId);
      if (found) {
        setSelectedEvidence(found);
        setActiveTab('vault');
      }
    }
  }, [searchParams, evidence]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1D2939]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Digital Evidence Vault
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
            Cryptographically registered artifacts, raw binaries, system logs, and triage containers
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0D131C] border border-[#1D2939] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-forensic'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Vault Explorer ({evidence.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-forensic'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingestion & Upload</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'vault' ? (
        <EvidenceTable
          onSelectEvidence={(item) => setSelectedEvidence(item)}
          selectedEvidenceId={selectedEvidence?.id}
        />
      ) : (
        <UploadZone
          onComplete={() => setActiveTab('vault')}
        />
      )}

      {/* Right Slide-Over Detail Drawer */}
      <EvidenceDrawer
        evidence={selectedEvidence}
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
};
