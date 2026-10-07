import React, { useState } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  FileText, 
  HardDrive, 
  Upload, 
  UserCheck, 
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  Search
} from 'lucide-react';
import { EvidenceDetailModal } from '../components/evidence/EvidenceDetailModal';
import { CorrelatedInvestigationFinding } from '../types';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

interface TimelineEventData {
  id: string;
  time: string;
  date: string;
  title: string;
  category: 'user' | 'file' | 'usb' | 'transfer' | 'network' | 'live';
  description: string;
  path?: string;
  isSuspicious: boolean;
  isLiveAgent?: boolean;
  source?: string;
  metadata: {
    user: string;
    fileName?: string;
    filePath?: string;
    action?: string;
    process?: string;
    deviceName?: string;
    serialNumber?: string;
    mountPoint?: string;
    sha256?: string;
    whySuspicious?: string;
    relatedEvents?: string[];
  };
}

export const TimelinePage: React.FC = () => {
  const { timeline: appTimeline, investigationMode } = useApp();
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<CorrelatedInvestigationFinding | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const events: TimelineEventData[] = [
    {
      id: 'tl-1',
      time: '14:31:45',
      date: '2 Oct 2026',
      title: 'User Login',
      category: 'user',
      description: 'Employee01 logged in to the system',
      isSuspicious: false,
      metadata: {
        user: 'Employee01',
        action: 'Interactive Logon',
        process: 'winlogon.exe',
        filePath: 'Host: EMP-LT-001 (Console Session 1)',
        whySuspicious: 'Logon is normal baseline activity preceding document operations.',
        relatedEvents: ['File Access (14:32:15)']
      }
    },
    {
      id: 'tl-2',
      time: '14:32:15',
      date: '2 Oct 2026',
      title: 'File Access',
      category: 'file',
      description: 'confidential.pdf was accessed',
      path: 'Path: C:\\Users\\Employee01\\Documents\\confidential.pdf',
      isSuspicious: true,
      metadata: {
        user: 'Employee01',
        fileName: 'confidential.pdf',
        filePath: 'C:\\Users\\Employee01\\Documents\\confidential.pdf',
        action: 'Read',
        process: 'Acrobat.exe (PID: 4521)',
        sha256: '8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90',
        whySuspicious: 'This file was accessed shortly before a USB device was connected and file transfer activity was detected. The sequence of events suggests potential data exfiltration.',
        relatedEvents: [
          'USB Device Connected (14:33:02)',
          'File Transfer Activity (14:34:18)',
          'USB Device Disconnected (14:36:05)'
        ]
      }
    },
    {
      id: 'tl-3',
      time: '14:33:02',
      date: '2 Oct 2026',
      title: 'USB Device Connected',
      category: 'usb',
      description: 'SanDisk USB (Serial: 4C530001230912098134)',
      path: 'Mount: E:\\ (SanDisk Ultra 64GB)',
      isSuspicious: true,
      metadata: {
        user: 'Employee01',
        deviceName: 'SanDisk Ultra 64GB',
        serialNumber: '4C530001230912098134',
        mountPoint: 'E:\\',
        action: 'Device Connected & Mounted',
        process: 'PnP Manager',
        whySuspicious: 'Unauthorized mass storage hardware was mounted 47 seconds after accessing confidential intellectual property.',
        relatedEvents: [
          'File Access (14:32:15)',
          'File Transfer Activity (14:34:18)',
          'USB Device Disconnected (14:36:05)'
        ]
      }
    },
    {
      id: 'tl-4',
      time: '14:34:18',
      date: '2 Oct 2026',
      title: 'File Transfer',
      category: 'transfer',
      description: 'confidential.pdf copied to E: drive',
      path: 'Destination: E:\\confidential.pdf',
      isSuspicious: true,
      metadata: {
        user: 'Employee01',
        fileName: 'confidential.pdf',
        filePath: 'C:\\Users\\Employee01\\Documents\\confidential.pdf -> E:\\confidential.pdf',
        action: 'Copy / Write',
        process: 'explorer.exe (PID: 4120)',
        sha256: '8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90',
        whySuspicious: 'File copy operation written directly to newly connected removable media E:\\.',
        relatedEvents: [
          'USB Device Connected (14:33:02)',
          'USB Device Disconnected (14:36:05)'
        ]
      }
    },
    {
      id: 'tl-5',
      time: '14:36:05',
      date: '2 Oct 2026',
      title: 'USB Device Disconnected',
      category: 'usb',
      description: 'SanDisk USB removed from system',
      path: 'Unmounted safely: E:\\',
      isSuspicious: false,
      metadata: {
        user: 'Employee01',
        deviceName: 'SanDisk Ultra 64GB',
        serialNumber: '4C530001230912098134',
        action: 'Device Ejection',
        process: 'PnP Manager',
        whySuspicious: 'USB drive unmounted less than two minutes after file copy completion.',
        relatedEvents: [
          'USB Device Connected (14:33:02)',
          'File Transfer (14:34:18)'
        ]
      }
    }
  ];

  const [dbTimelineEvents, setDbTimelineEvents] = useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    api.getTimeline().then((res: any) => {
      if (isMounted && res && Array.isArray(res)) {
        setDbTimelineEvents(res);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const parsedDbEvents: TimelineEventData[] = dbTimelineEvents.map(e => {
    const dt = new Date(e.timestamp);
    const timeStr = !isNaN(dt.getTime()) ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recorded';
    const dateStr = !isNaN(dt.getTime()) ? dt.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';
    const catLower = (e.event_type || e.category || '').toLowerCase();
    const cat = catLower.includes('usb') ? 'usb' : catLower.includes('file') ? 'file' : catLower.includes('user') ? 'user' : 'file';

    let eventType = e.event_type ? e.event_type.toUpperCase() : 'EVENT';
    let filePath = '';
    let extractedSource = e.source || 'Endpoint Forensic Agent';

    // Parse multiline format if present:
    // FILE MODIFIED\nFile: ...\nTime: ...\nSource: ...\nEvent: ...
    if (typeof e.description === 'string' && e.description.includes('\n')) {
      const lines = e.description.split('\n');
      for (const line of lines) {
        if (line.startsWith('File:')) filePath = line.replace('File:', '').trim();
        if (line.startsWith('Source:')) extractedSource = line.replace('Source:', '').trim();
        if (line.startsWith('Event:')) eventType = line.replace('Event:', '').trim();
      }
    }

    const isHistorical = extractedSource.includes('USN') || extractedSource.includes('Metadata') || extractedSource.includes('USBSTOR') || extractedSource.includes('Event Log');

    return {
      id: e.id,
      time: timeStr,
      date: dateStr,
      title: eventType.replace('_', ' ').title ? eventType.replace('_', ' ') : e.description.split('\n')[0],
      category: cat as any,
      description: e.description,
      path: filePath || (e.details?.file_path) || `Host: Real Telemetry (${e.actor || 'SYSTEM'})`,
      isSuspicious: e.is_suspicious || false,
      isLiveAgent: e.is_live_agent || false,
      source: extractedSource,
      metadata: {
        user: e.actor || 'SYSTEM',
        action: eventType,
        process: extractedSource,
        filePath: filePath,
        whySuspicious: e.is_suspicious ? `Flagged: Correlated forensic artifact from ${extractedSource}.` : 'Routine forensic record.',
        relatedEvents: []
      }
    };
  });

  const liveEvents: TimelineEventData[] = (appTimeline || [])
    .filter(e => e.isLiveAgent || e.sourceArtifact === 'LIVE AGENT')
    .map(e => {
      const dt = new Date(e.timestamp);
      const timeStr = !isNaN(dt.getTime()) ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live';
      const dateStr = !isNaN(dt.getTime()) ? dt.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';
      const catLower = (e.category || '').toLowerCase();
      const cat = catLower.includes('usb') ? 'usb' : catLower.includes('file') ? 'file' : catLower.includes('user') ? 'user' : 'file';

      return {
        id: e.id,
        time: timeStr,
        date: dateStr,
        title: e.title,
        category: cat as any,
        description: e.description,
        path: `Endpoint Host: Real Windows Telemetry (${e.actor || 'SYSTEM'})`,
        isSuspicious: e.isSuspicious,
        isLiveAgent: true,
        source: e.sourceArtifact || 'LIVE AGENT',
        metadata: {
          user: e.actor || 'LIVE_USER',
          action: e.title,
          process: 'TraceX Windows Agent',
          whySuspicious: e.isSuspicious ? 'Captured by Windows live endpoint collector and deviated from baseline.' : 'Normal endpoint telemetry captured by Live Agent.',
          relatedEvents: []
        }
      };
    });

  // Combine database events, live app events, and baseline events (avoiding ID duplicates)
  const seenIds = new Set<string>();
  const allEvents: TimelineEventData[] = [];
  const sourceEvents = investigationMode === 'real' 
    ? [...parsedDbEvents, ...liveEvents]
    : [...parsedDbEvents, ...liveEvents, ...events];

  for (const ev of sourceEvents) {
    if (!seenIds.has(ev.id)) {
      seenIds.add(ev.id);
      allEvents.push(ev);
    }
  }

  const filteredEvents = allEvents.filter((e) => {
    if (activeFilter === 'LIVE' && !e.isLiveAgent) return false;
    if (activeFilter === 'HISTORICAL' && !(e.source && (e.source.includes('USN') || e.source.includes('Metadata') || e.source.includes('USBSTOR') || e.source.includes('Event Log')))) return false;
    if (activeFilter === 'DEMO' && e.isLiveAgent) return false;
    if (activeFilter === 'SUSPICIOUS' && !e.isSuspicious) return false;
    if (activeFilter === 'FILES' && e.category !== 'file' && e.category !== 'transfer') return false;
    if (activeFilter === 'USB' && e.category !== 'usb') return false;
    if (activeFilter === 'USER' && e.category !== 'user') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.path && e.path.toLowerCase().includes(q)) ||
        (e.source && e.source.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleEventClick = (event: TimelineEventData) => {
    const finding: CorrelatedInvestigationFinding = {
      id: event.id,
      title: event.title,
      description: event.description,
      timestamp: `${event.date}, ${event.time}`,
      severity: event.isSuspicious ? 'High' : 'Low',
      category: event.category === 'usb' ? 'USB Activity' : event.category === 'transfer' ? 'Data Transfer' : 'File Access',
      whySuspicious: event.metadata.whySuspicious || 'Event logged during forensic investigation timeline.',
      relatedEvents: event.metadata.relatedEvents || [],
      metadata: event.metadata
    };
    setSelectedFinding(finding);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
            Investigation Timeline
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Chronological forensic audit trail across NTFS USN Journal, Windows Event Logs, and Live Monitoring.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex-wrap">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'HISTORICAL', label: '📜 Historical Scan' },
            { id: 'LIVE', label: '🟢 Live Agent' },
            { id: 'DEMO', label: '🔵 Demo Data' },
            { id: 'FILES', label: 'Files' },
            { id: 'USB', label: 'USB' },
            { id: 'SUSPICIOUS', label: 'Suspicious' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Event Cards List */}
      <div className="space-y-3 relative">
        {allEvents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
            <Clock className="w-8 h-8 text-[#94A3B8] mx-auto opacity-60" />
            <h3 className="text-sm font-bold text-[#1E293B]">No forensic events collected.</h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              No timeline artifacts have been acquired for this investigation yet. Run a historical scan or start live monitoring to capture events.
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
            <Clock className="w-8 h-8 text-[#94A3B8] mx-auto opacity-60" />
            <h3 className="text-sm font-bold text-[#1E293B]">Historical record unavailable for current filter</h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Artifact may have rotated or require administrator elevation for raw volume extraction. Execute a historical scan in Forensic Investigation to ingest records.
            </p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isHistoricalSource = evt.source && (evt.source.includes('USN') || evt.source.includes('Metadata') || evt.source.includes('USBSTOR') || evt.source.includes('Event Log'));

            return (
              <div
                key={evt.id}
                onClick={() => handleEventClick(evt)}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4.5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
              >
                {/* Left: Time & Icon & Details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Time Block */}
                  <div className="text-left shrink-0 w-20 pt-1">
                    <p className="font-mono text-xs font-bold text-[#1E293B]">
                      {evt.time}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] font-medium">
                      {evt.date}
                    </p>
                  </div>

                  {/* Icon Circle */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    evt.category === 'user'
                      ? 'bg-blue-50 text-blue-600'
                      : evt.category === 'file'
                      ? 'bg-red-50 text-red-600'
                      : evt.category === 'usb'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {evt.category === 'user' ? (
                      <UserCheck className="w-5 h-5" />
                    ) : evt.category === 'file' ? (
                      <FileText className="w-5 h-5" />
                    ) : evt.category === 'usb' ? (
                      <HardDrive className="w-5 h-5" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>

                  {/* Text Information & Structured Source Block */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-[#1E293B] group-hover:text-indigo-600 transition-colors uppercase">
                        {evt.title}
                      </h3>
                      {evt.source && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Source: {evt.source}
                        </span>
                      )}
                    </div>

                    {/* Pre-formatted Structured Forensic Record Display */}
                    <div className="mt-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] text-[#334155] space-y-0.5 leading-relaxed">
                      {evt.description.split('\n').map((line, lIdx) => (
                        <div key={lIdx} className="truncate">
                          {line.startsWith('File:') ? (
                            <span><strong className="text-[#64748B]">File: </strong><span className="text-[#0F172A]">{line.replace('File:', '').trim()}</span></span>
                          ) : line.startsWith('Source:') ? (
                            <span><strong className="text-[#64748B]">Source: </strong><span className="text-indigo-600 font-semibold">{line.replace('Source:', '').trim()}</span></span>
                          ) : line.startsWith('Event:') ? (
                            <span><strong className="text-[#64748B]">Event: </strong><span className="text-emerald-700 font-semibold">{line.replace('Event:', '').trim()}</span></span>
                          ) : line.startsWith('Time:') ? (
                            <span><strong className="text-[#64748B]">Time: </strong><span className="text-[#475569]">{line.replace('Time:', '').trim()}</span></span>
                          ) : (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {evt.path && !evt.description.includes(evt.path) && (
                      <p className="text-[11px] font-mono text-[#94A3B8] truncate mt-1">
                        Path: {evt.path}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Mode Badge & Chevron */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-start pt-1">
                  {evt.isLiveAgent ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {isHistoricalSource ? 'HISTORICAL SCAN' : 'LIVE AGENT'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      DEMO DATA
                    </span>
                  )}
                  {evt.isSuspicious && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                      Suspicious
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 mt-0.5" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Evidence Detail Modal */}
      <EvidenceDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        finding={selectedFinding}
      />
    </div>
  );
};
