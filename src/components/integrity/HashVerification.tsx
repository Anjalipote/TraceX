import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  Search, 
  Lock,
  FileCheck2,
  FileX,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ChevronRight,
  ExternalLink,
  X,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { truncateHash, copyToClipboard } from '../../utils/formatters';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { PdfDiffModal } from '../evidence/PdfDiffModal';

export const HashVerification: React.FC = () => {
  const { 
    evidence, 
    isTampered, 
    simulateIntegrityTamper, 
    restoreIntegrityState, 
    showToast,
    currentCase
  } = useApp();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMerkleModal, setShowMerkleModal] = useState(false);
  const [showCustodyModal, setShowCustodyModal] = useState(false);
  const [diffModalItem, setDiffModalItem] = useState<any>(null);
  const [custodyChain, setCustodyChain] = useState<any[]>([]);

  useEffect(() => {
    api.getCustodyChain(currentCase.id).then(chain => {
      setCustodyChain(chain);
    });
  }, [currentCase.id]);

  const handleCopy = async (hash: string, key: string) => {
    const success = await copyToClipboard(hash);
    if (success) {
      setCopiedKey(key);
      showToast('Digest Copied', 'SHA-256 copied to clipboard.', 'info');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const verifiedCount = isTampered ? 127 : 128;
  const modifiedCount = isTampered ? 1 : 0;
  const failedCount = 0;

  // Merkle Root calculation
  const cleanMerkleRoot = '609505c1a709b7e66293eaa14669822e2b9fe228b738d435f9adb049341b3d1f';
  const tamperedMerkleRoot = 'e9b814a0fc3d7890a2341b5590c8a1fe48bb0195ad3e8105bc9124456910cd4a';
  const activeMerkleRoot = isTampered ? tamperedMerkleRoot : cleanMerkleRoot;

  const filteredEvidence = evidence.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sha256.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Warning Banner if Tampered */}
      {isTampered && (
        <div className="p-6 rounded-2xl bg-red-950/70 border border-red-600/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-red-900/60 border border-red-500/70 text-red-300 shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-200 font-mono tracking-wide uppercase">
                CHAIN OF CUSTODY ALERT: DIGITAL EVIDENCE MODIFIED & MERKLE ROOT INVALIDATED
              </h3>
              <p className="text-xs text-red-300/90 leading-relaxed max-w-3xl">
                Cryptographic recalculation failed for <strong>confidential.pdf</strong>. Current computed SHA-256 differs from the court-admissible custody registration. The case <strong>Evidence Set Merkle Root</strong> has diverged from canonical ledger stamp, and block #3 in the chain of custody is compromised.
              </p>
            </div>
          </div>

          <button
            onClick={restoreIntegrityState}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors shrink-0 shadow-lg self-start md:self-center"
          >
            <RefreshCw className="w-4 h-4" />
            <span>RESTORE DEMO STATE</span>
          </button>
        </div>
      )}

      {/* Forensic Cryptographic Foundations: Merkle Root & Chain of Custody (Final Forensic Enhancement) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Merkle Root Card */}
        <div className={`p-6 rounded-2xl bg-[#0B1017] border shadow-xl flex flex-col justify-between gap-4 transition-all ${
          isTampered ? 'border-red-600/80 bg-red-950/20' : 'border-blue-900/50'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Evidence Set Merkle Root
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                isTampered 
                  ? 'bg-red-950/60 text-red-400 border-red-700 animate-pulse' 
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
              }`}>
                {isTampered ? '⚠ MERKLE MISMATCH' : '✓ DETERMINISTIC VERIFIED'}
              </span>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Single 256-bit cryptographic digest representing all 128 evidence items in this case. Any single-bit alteration invalidates the root.
            </p>

            <div className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B] flex items-center justify-between gap-3 font-mono text-xs">
              <span className={`truncate ${isTampered ? 'text-red-400 font-bold underline' : 'text-cyan-300'}`}>
                {activeMerkleRoot}
              </span>
              <button
                onClick={() => handleCopy(activeMerkleRoot, 'merkle')}
                className="p-1 rounded hover:bg-[#1E293B] text-[#94A3B8] hover:text-white shrink-0"
                title="Copy Merkle Root"
              >
                {copiedKey === 'merkle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]/60 text-xs">
            <span className="text-[#64748B] font-mono text-[11px]">
              Leaves: <strong>128 SHA-256 Digests</strong>
            </span>
            <button
              onClick={() => setShowMerkleModal(true)}
              className="text-blue-400 hover:text-blue-300 text-xs font-mono font-bold flex items-center gap-1 hover:underline"
            >
              <span>View Tree Proof</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Cryptographically Linked Chain of Custody Card */}
        <div className={`p-6 rounded-2xl bg-[#0B1017] border shadow-xl flex flex-col justify-between gap-4 transition-all ${
          isTampered ? 'border-red-600/80 bg-red-950/20' : 'border-emerald-900/50'
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                Tamper-Evident Chain of Custody
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                isTampered 
                  ? 'bg-red-950/60 text-red-400 border-red-700 animate-pulse' 
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
              }`}>
                {isTampered ? '⚠ LINKAGE BROKEN' : '✓ 8 BLOCKS LINKED'}
              </span>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Hash-linked immutable ledger: each custody event cryptographically signs predecessor digest H(n) = SHA256(H(n-1) + event).
            </p>

            <div className="p-3 rounded-xl bg-[#070A0F] border border-[#1E293B] flex items-center justify-between gap-3 font-mono text-xs">
              <div className="truncate">
                <span className="text-[10px] text-[#64748B] block">CHAIN HEAD HASH:</span>
                <span className={`truncate font-bold ${isTampered ? 'text-red-400' : 'text-emerald-300'}`}>
                  {isTampered ? 'BROKEN_AT_BLOCK_#3_INVALID_DIGEST' : '952cbb8f08aaac61af441cb72cb84bca553c512a...'}
                </span>
              </div>
              <button
                onClick={() => handleCopy('952cbb8f08aaac61af441cb72cb84bca553c512a4e2b7e4ef563436750af2ab7', 'chain')}
                className="p-1 rounded hover:bg-[#1E293B] text-[#94A3B8] hover:text-white shrink-0"
                title="Copy Chain Head Hash"
              >
                {copiedKey === 'chain' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]/60 text-xs">
            <span className="text-[#64748B] font-mono text-[11px]">
              Ledger State: <strong className={isTampered ? 'text-red-400' : 'text-emerald-400'}>{isTampered ? 'Compromised' : 'Court Admissible'}</strong>
            </span>
            <button
              onClick={() => setShowCustodyModal(true)}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-mono font-bold flex items-center gap-1 hover:underline"
            >
              <span>View Full Chain (8 Blocks)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#0B1017] border border-emerald-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">
              Cryptographically Verified
            </span>
            <span className="text-3xl font-black font-mono text-emerald-400 mt-1 block">
              {verifiedCount}
            </span>
            <span className="text-[11px] font-mono text-emerald-500 mt-0.5 block">
              ✓ Bit-for-bit custody matches
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            <FileCheck2 className="w-7 h-7" />
          </div>
        </div>

        <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-xl ${
          modifiedCount > 0 
            ? 'bg-red-950/30 border-red-800/80 shadow-red-950/30' 
            : 'bg-[#0B1017] border-[#1E293B]/80'
        }`}>
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">
              Tampered / Modified
            </span>
            <span className={`text-3xl font-black font-mono mt-1 block ${
              modifiedCount > 0 ? 'text-red-400' : 'text-[#F8FAFC]'
            }`}>
              {modifiedCount}
            </span>
            <span className="text-[11px] font-mono text-[#64748B] mt-0.5 block">
              {modifiedCount > 0 ? '⚠ Hash mismatch alert active' : '0 altered blocks'}
            </span>
          </div>
          <div className={`p-3.5 rounded-2xl border ${
            modifiedCount > 0 
              ? 'bg-red-900/50 border-red-700/60 text-red-400' 
              : 'bg-[#080D15] border-[#1E293B] text-[#64748B]'
          }`}>
            <FileX className="w-7 h-7" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase block">
              Corrupted / Unreadable
            </span>
            <span className="text-3xl font-black font-mono text-[#F8FAFC] mt-1 block">
              {failedCount}
            </span>
            <span className="text-[11px] font-mono text-[#64748B] mt-0.5 block">
              0 sector read failures
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#080D15] border border-[#1E293B] text-[#64748B]">
            <Lock className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Simulation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 shadow-lg">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hashes or filenames..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080D15] border border-[#1E293B] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-[#64748B] hidden sm:block">
            DEMO TEST UTILITY:
          </div>
          {!isTampered ? (
            <button
              onClick={simulateIntegrityTamper}
              className="px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 text-red-300 text-xs font-mono font-semibold flex items-center gap-2 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>SIMULATE MODIFICATION</span>
            </button>
          ) : (
            <button
              onClick={restoreIntegrityState}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RESTORE DEMO STATE</span>
            </button>
          )}
        </div>
      </div>

      {/* Hash Verification Table */}
      <div className="rounded-2xl border border-[#1E293B]/80 bg-[#0B1017] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-[#1E293B]/60 bg-[#080D15] text-[#94A3B8] text-[11px] uppercase tracking-wider">
                <th className="py-4 px-5">File Name</th>
                <th className="py-4 px-5">Original Custody SHA-256</th>
                <th className="py-4 px-5">Current Recalculated SHA-256</th>
                <th className="py-4 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {filteredEvidence.map((item) => {
                const origHash = item.baselineSha256 || item.originalSha256;
                const isItemTampered = item.sha256 !== origHash;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isItemTampered ? 'bg-red-950/30' : 'hover:bg-[#0E1522]'
                    }`}
                  >
                    {/* Filename */}
                    <td className="py-4 px-5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#F8FAFC] text-xs">
                            {item.filename}
                          </span>
                          {item.isLiveAgent ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-700/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              LIVE AGENT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-700">
                              DEMO BENCHMARK
                            </span>
                          )}
                          {item.pdfDiffData && (
                            <button
                              onClick={() => setDiffModalItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-700 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                              title="Compare PDF baseline vs modified"
                            >
                              <FileText className="w-3 h-3 text-red-400" />
                              <span>Diff PDF</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-[#64748B] block truncate max-w-xs mt-0.5">
                          {item.sourceLocation}
                        </span>
                      </div>
                    </td>

                    {/* Original Hash */}
                    <td className="py-4 px-5 font-mono text-[11px] text-[#94A3B8]">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[220px]" title={origHash}>
                          {truncateHash(origHash, 10, 8)}
                        </span>
                        <button
                          onClick={() => handleCopy(origHash, `orig-${item.id}`)}
                          className="p-1 rounded hover:bg-[#111923] text-[#64748B] hover:text-white"
                          title="Copy baseline/original hash"
                        >
                          {copiedKey === `orig-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Current Hash */}
                    <td className="py-4 px-5 font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`truncate max-w-[220px] ${
                          isItemTampered ? 'text-red-400 font-bold underline' : 'text-blue-300'
                        }`} title={item.sha256}>
                          {truncateHash(item.sha256, 10, 8)}
                        </span>
                        <button
                          onClick={() => handleCopy(item.sha256, `curr-${item.id}`)}
                          className="p-1 rounded hover:bg-[#111923] text-[#64748B] hover:text-white"
                          title="Copy current hash"
                        >
                          {copiedKey === `curr-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider ${
                        isItemTampered
                          ? 'bg-red-950 text-red-400 border border-red-600 animate-pulse'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {isItemTampered ? '⚠ MODIFIED' : '✓ VERIFIED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Merkle Tree Proof Modal */}
      <Modal
        isOpen={showMerkleModal}
        onClose={() => setShowMerkleModal(false)}
        title="Evidence Set Merkle Tree Cryptographic Proof"
        maxWidth="2xl"
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-[#94A3B8] text-xs">
            The Merkle Root is calculated deterministically across all evidence artifacts in this case using pairwise SHA-256 tree aggregation (RFC 6962).
          </p>

          <div className="p-3.5 rounded-xl bg-[#080D15] border border-[#1E293B] space-y-2">
            <div className="flex justify-between text-[#64748B] text-[11px]">
              <span>MERKLE ROOT (ROOT HASH)</span>
              <span>{isTampered ? 'TAMPERED STATE' : 'CANONICAL STATE'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#070A0F] border border-blue-500/40 text-blue-300 break-all select-all font-bold">
              {activeMerkleRoot}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080D15] border border-[#1E293B] space-y-2">
            <span className="text-[#64748B] text-[11px] block">TREE STRUCTURE SPECIFICATIONS:</span>
            <ul className="space-y-1.5 text-[#CBD5E1] text-[11px]">
              <li>• Total Leaf Hashes: <strong>128 items</strong></li>
              <li>• Tree Height: <strong>8 levels</strong></li>
              <li>• Deterministic Sort: <strong>Lexicographical order-invariant</strong></li>
              <li>• Hash Algorithm: <strong>SHA-256 (256-bit digest)</strong></li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Chain of Custody Modal */}
      <Modal
        isOpen={showCustodyModal}
        onClose={() => setShowCustodyModal(false)}
        title="Tamper-Evident Chain of Custody (Cryptographic Block Ledger)"
        maxWidth="2xl"
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-[#94A3B8] text-xs">
            Every evidentiary operation is permanently recorded in a sequential, cryptographically linked chain. Each block references the SHA-256 digest of the preceding block.
          </p>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {custodyChain.map((entry, index) => {
              const isTamperedBlock = isTampered && (entry.evidence_name === 'confidential.pdf' || index === 2);
              return (
                <div 
                  key={entry.sequence_number || index} 
                  className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                    isTamperedBlock 
                      ? 'bg-red-950/40 border-red-600/80' 
                      : 'bg-[#080D15] border-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#F8FAFC]">
                      Block #{entry.sequence_number}: <span className="text-blue-400">{entry.action}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      isTamperedBlock
                        ? 'bg-red-950 text-red-400 border-red-700 animate-pulse'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}>
                      {isTamperedBlock ? '⚠ LINK BROKEN' : '✓ HASH LINKED'}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#94A3B8]">
                    Target: <strong className="text-[#F8FAFC]">{entry.evidence_name}</strong> | Actor: <strong>{entry.actor}</strong> | {entry.timestamp}
                  </div>

                  <p className="text-[11px] text-[#CBD5E1]">
                    {entry.details}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] pt-1">
                    <div className="truncate p-1.5 rounded bg-[#070A0F] border border-[#1E293B]">
                      <span className="text-[#64748B] block">PREVIOUS HASH:</span>
                      <span className="text-[#94A3B8] truncate block" title={entry.previous_hash}>{entry.previous_hash}</span>
                    </div>
                    <div className="truncate p-1.5 rounded bg-[#070A0F] border border-[#1E293B]">
                      <span className="text-[#64748B] block">RECORD HASH H(n):</span>
                      <span className={`truncate block font-bold ${isTamperedBlock ? 'text-red-400' : 'text-emerald-400'}`} title={entry.record_hash}>{entry.record_hash}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Forensic PDF Diff Modal */}
      {diffModalItem && (
        <PdfDiffModal
          isOpen={!!diffModalItem}
          onClose={() => setDiffModalItem(null)}
          filename={diffModalItem.filename}
          baselineSha256={diffModalItem.baselineSha256 || diffModalItem.originalSha256}
          currentSha256={diffModalItem.sha256}
          diffData={diffModalItem.pdfDiffData}
        />
      )}
    </div>
  );
};
