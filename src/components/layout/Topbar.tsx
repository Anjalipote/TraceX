import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  FolderLock, 
  ChevronDown, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Lock, 
  Command,
  FileText,
  Clock,
  Sparkles,
  Layers,
  Cpu,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { GlobalSearchItem } from '../../types';

export const Topbar: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentCase, 
    cases, 
    selectCase, 
    createCase,
    investigator, 
    isTampered, 
    searchQuery, 
    setSearchQuery,
    searchInvestigation,
    restoreIntegrityState
  } = useApp();

  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Live Forensic Search with Debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchInvestigation(searchQuery.trim());
        setSearchResults(results);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, currentCase.id]);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchResult = (item: GlobalSearchItem) => {
    setSearchOpen(false);
    setSearchQuery('');
    switch (item.category) {
      case 'evidence':
        navigate(`/evidence?selected=${item.id}`);
        break;
      case 'finding':
        navigate(`/findings?finding=${item.id}`);
        break;
      case 'timeline':
        navigate('/timeline');
        break;
      case 'anomaly':
      case 'cluster':
        navigate('/risk');
        break;
      default:
        navigate('/evidence');
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'evidence':
        return <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">EVIDENCE</span>;
      case 'finding':
        return <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">FINDING</span>;
      case 'timeline':
        return <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">TIMELINE</span>;
      case 'anomaly':
        return <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase">ANOMALY</span>;
      case 'cluster':
        return <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">CLUSTER</span>;
      default:
        return <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 uppercase">{category}</span>;
    }
  };

  const notifications = [
    ...(isTampered ? [{
      id: 'notif-tamper',
      title: 'INTEGRITY ALERT',
      text: 'File confidential.pdf SHA-256 hash mismatch detected. Chain of custody compromised.',
      time: 'Just now',
      urgent: true
    }] : []),
    {
      id: 'notif-1',
      title: 'Critical Correlation Detected',
      text: 'USB mount VID_0951 correlated with confidential.pdf exfiltration event at 09:48:42.',
      time: '12 min ago',
      urgent: false
    },
    {
      id: 'notif-2',
      title: 'Anti-Forensics Wiper Execution',
      text: 'suspicious.exe executed -wipe command sequence and deleted Volume Shadow Copies.',
      time: '25 min ago',
      urgent: false
    }
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#070A0F]/85 backdrop-blur-xl border-b border-[#1E293B]/60">
      {/* Integrity Alert Ribbon if Tampered */}
      {isTampered && (
        <div className="bg-red-950/80 border-b border-red-600/70 px-8 py-2.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2.5 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
            <span className="font-bold uppercase tracking-wider text-red-300">FORENSIC ALERT:</span>
            <span>Evidence integrity failure detected on <strong>confidential.pdf</strong> (Calculated hash differs from court custody digest).</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/integrity"
              className="underline text-red-300 hover:text-white flex items-center gap-1 font-semibold text-xs"
            >
              Examine Hash Mismatch <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={restoreIntegrityState}
              className="px-3 py-1 rounded-lg bg-red-800 hover:bg-red-700 text-white font-mono text-xs transition-colors"
            >
              Restore Original State
            </button>
          </div>
        </div>
      )}

      <div className="h-16 px-8 flex items-center justify-between gap-6">
        {/* Left: Active Case Selector */}
        <div className="relative">
          <button
            onClick={() => setCaseMenuOpen(!caseMenuOpen)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#0B1017] border border-[#1E293B]/80 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FolderLock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-400 tracking-wider">
                  {currentCase.id}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs font-medium text-[#F8FAFC] truncate max-w-[240px] group-hover:text-blue-300 leading-tight">
                {currentCase.name}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] ml-1 group-hover:text-[#94A3B8]" />
          </button>

          {/* Case Dropdown */}
          {caseMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setCaseMenuOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-88 rounded-2xl bg-[#0B1017] border border-[#1E293B] shadow-2xl p-2 z-50 animate-in fade-in-50">
                <div className="px-3 py-2 text-[10px] font-mono uppercase font-semibold text-[#64748B] border-b border-[#1E293B]/60">
                  Select Active Investigation Vault
                </div>
                <div className="py-1 space-y-1">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        selectCase(c.id);
                        setCaseMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-3 transition-colors ${
                        c.id === currentCase.id ? 'bg-blue-600/15 text-blue-400' : 'hover:bg-[#111923] text-[#F8FAFC]'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-[#64748B] mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-blue-400">{c.id}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                            c.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            Risk {c.riskScore}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#94A3B8] truncate mt-0.5">{c.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#1E293B]/60 flex items-center justify-between px-2">
                  <button
                    onClick={() => {
                      try {
                        const newCase = createCase({
                          name: `Live Investigation Vault #${cases.length + 1}`,
                          investigator: investigator.name,
                          description: 'Active digital evidence investigation vault for live artifact analysis.',
                          targetSystem: 'WIN11-WORKSTATION-EVID'
                        });
                        setCaseMenuOpen(false);
                        navigate('/evidence');
                      } catch {
                        navigate('/cases');
                      }
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-mono font-bold py-1.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ New Clean Case</span>
                  </button>
                  <Link
                    to="/cases"
                    onClick={() => setCaseMenuOpen(false)}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-mono py-1.5"
                  >
                    Manage Vaults →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Center: Global Forensic Search with Live Dropdown */}
        <div ref={searchContainerRef} className="flex-1 max-w-lg relative hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setSearchOpen(true);
              }}
              placeholder="Search evidence, hashes, events, entities, or findings..."
              className="w-full pl-10 pr-16 py-2 rounded-xl bg-[#0B1017] border border-[#1E293B]/80 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500/70 font-mono transition-colors"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchOpen(false);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#475569] bg-[#111923] border border-[#1E293B] px-1.5 py-0.5 rounded">
                /
              </span>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {searchOpen && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#0B1017] border border-[#1E293B] shadow-2xl p-2 z-50 animate-in fade-in-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-mono uppercase font-semibold text-[#64748B] border-b border-[#1E293B]/60 flex items-center justify-between">
                <span>Forensic Investigation Matches ({searchResults.length})</span>
                <span className="text-[#475569]">ESC to close</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-[#64748B]">
                  No matching artifacts found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-1 space-y-1">
                  {searchResults.map((item, idx) => (
                    <button
                      key={`${item.category}-${item.id}-${idx}`}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-[#111923] border border-transparent hover:border-[#1E293B] transition-colors group flex items-start gap-3"
                    >
                      <div className="pt-0.5">
                        {getCategoryBadge(item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-[#F8FAFC] group-hover:text-blue-400 truncate">
                            {item.title}
                          </span>
                          {item.severity && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              item.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/50' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {item.severity}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] font-mono text-[#64748B] truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                        <p className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5">
                          {item.snippet}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Notifications & Quick Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#0E1522] border border-transparent hover:border-[#1E293B]/60 transition-colors"
              title="Forensic Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
            </button>

            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setNotificationsOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-92 rounded-2xl bg-[#0B1017] border border-[#1E293B] shadow-2xl p-4 z-50 animate-in fade-in-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]/60 mb-3">
                    <span className="text-xs font-mono font-bold text-[#F8FAFC]">Forensic Intelligence Alerts</span>
                    <span className="text-[10px] font-mono text-[#94A3B8] bg-[#162032] px-2 py-0.5 rounded-full">{notifications.length} Active</span>
                  </div>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs ${
                          n.urgent 
                            ? 'bg-red-950/40 border-red-800/60 text-red-200' 
                            : 'bg-[#0E1522] border-[#1E293B]/60 text-[#94A3B8]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                            {n.urgent ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />}
                            {n.title}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B]">{n.time}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#94A3B8]">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Profile Pill */}
          <Link
            to="/settings"
            className="flex items-center gap-3 pl-2 pr-3.5 py-1.5 rounded-xl bg-[#0B1017] border border-[#1E293B]/80 hover:border-blue-500/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-xs font-mono font-bold text-blue-400">
              AV
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-[#F8FAFC] leading-none">
                {investigator.name.split(' ')[1]}
              </p>
              <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                Active Vault
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};
