import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  FolderLock, 
  ChevronDown, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  Lock, 
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
      default:
        navigate('/evidence');
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
      title: 'Suspicious Sequence Correlated',
      text: 'EMP-LT-001: File Access -> USB Connect -> File Copy -> USB Disconnect correlated.',
      time: '12 min ago',
      urgent: false
    },
    {
      id: 'notif-2',
      title: 'Artifact Collection Complete',
      text: 'Host EMP-LT-001 completed read-only scan with 149 artifacts preserved.',
      time: '25 min ago',
      urgent: false
    }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      {/* Integrity Alert Ribbon if Tampered */}
      {isTampered && (
        <div className="bg-red-50 border-b border-red-200 px-8 py-2.5 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2.5 font-mono">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-red-800">FORENSIC ALERT:</span>
            <span>Evidence integrity failure detected on <strong>confidential.pdf</strong> (Calculated hash differs from original digest).</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/integrity"
              className="underline text-red-700 hover:text-red-900 flex items-center gap-1 font-semibold text-xs"
            >
              Examine Hash Mismatch <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={restoreIntegrityState}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs transition-colors"
            >
              Restore Original State
            </button>
          </div>
        </div>
      )}

      <div className="h-16 px-8 flex items-center justify-between gap-6">
        {/* Left: Active Case Badge */}
        <div className="relative">
          <button
            onClick={() => setCaseMenuOpen(!caseMenuOpen)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-indigo-300 transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
              <FolderLock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-600 tracking-wider">
                  {currentCase.id}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs font-medium text-[#334155] truncate max-w-[220px] group-hover:text-indigo-600 leading-tight">
                {currentCase.name}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] ml-1 group-hover:text-[#64748B]" />
          </button>

          {/* Case Dropdown */}
          {caseMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setCaseMenuOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl p-2 z-50">
                <div className="px-3 py-2 text-[10px] font-mono uppercase font-semibold text-[#64748B] border-b border-[#F1F5F9]">
                  Select Active Investigation
                </div>
                <div className="py-1 space-y-1">
                  {cases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        selectCase(c.id);
                        setCaseMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-start gap-3 transition-colors ${
                        c.id === currentCase.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-[#F8FAFC] text-[#334155]'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-indigo-600">{c.id}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            Risk {c.riskScore}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#64748B] truncate mt-0.5">{c.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Center/Right: Search bar, Bell notification, and Admin Avatar */}
        <div className="flex items-center gap-4">
          {/* Global Search Bar matching reference UI */}
          <div ref={searchContainerRef} className="relative w-64 md:w-80">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setSearchOpen(true);
              }}
              placeholder="Search..."
              className="w-full pl-10 pr-10 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-xs"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchOpen(false);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Live Search Results Dropdown */}
            {searchOpen && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl p-2 z-50 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[#64748B] border-b border-[#F1F5F9] flex items-center justify-between">
                  <span>Matches ({searchResults.length})</span>
                  <span className="text-[#94A3B8]">ESC to close</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#94A3B8]">
                    No artifacts found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="py-1 space-y-1">
                    {searchResults.map((item, idx) => (
                      <button
                        key={`${item.category}-${item.id}-${idx}`}
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-left p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors flex items-start gap-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1E293B] truncate">{item.title}</p>
                          <p className="text-[11px] text-[#64748B] line-clamp-1">{item.snippet}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bell Notification */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] border border-transparent hover:border-[#E2E8F0] transition-colors"
              title="Forensic Alerts"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setNotificationsOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9] mb-2">
                    <span className="text-xs font-bold text-[#1E293B]">Alerts</span>
                    <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{notifications.length} Active</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          n.urgent ? 'bg-red-50 border-red-200 text-red-800' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#1E293B]">{n.title}</span>
                          <span className="text-[10px] text-[#94A3B8]">{n.time}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Avatar & Title matching reference UI */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              A
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-bold text-[#1E293B]">Admin</p>
              <p className="text-[10px] text-[#64748B]">Investigator</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
