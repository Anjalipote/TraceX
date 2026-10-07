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

interface TimelineEventData {
  id: string;
  time: string;
  date: string;
  title: string;
  category: 'user' | 'file' | 'usb' | 'transfer' | 'network';
  description: string;
  path?: string;
  isSuspicious: boolean;
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

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'SUSPICIOUS' && !e.isSuspicious) return false;
    if (activeFilter === 'FILES' && e.category !== 'file' && e.category !== 'transfer') return false;
    if (activeFilter === 'USB' && e.category !== 'usb') return false;
    if (activeFilter === 'USER' && e.category !== 'user') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.path && e.path.toLowerCase().includes(q))
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
            Chronological view of all relevant events.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'FILES', label: 'File Activity' },
            { id: 'USB', label: 'USB Devices' },
            { id: 'USER', label: 'User' },
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

      {/* Chronological Event Cards List matching reference UI Panel 5 */}
      <div className="space-y-3 relative">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            onClick={() => handleEventClick(evt)}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-4.5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            {/* Left: Time & Icon & Details */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Time Block */}
              <div className="text-left shrink-0 w-20">
                <p className="font-mono text-xs font-bold text-[#1E293B]">
                  {evt.time}
                </p>
                <p className="text-[10px] text-[#94A3B8] font-medium">
                  {evt.date}
                </p>
              </div>

              {/* Icon Circle */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
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

              {/* Text Information */}
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#1E293B] group-hover:text-indigo-600 transition-colors">
                  {evt.title}
                </h3>
                <p className="text-xs text-[#64748B] truncate mt-0.5">
                  {evt.description}
                </p>
                {evt.path && (
                  <p className="text-[11px] font-mono text-[#94A3B8] truncate mt-0.5">
                    {evt.path}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Badge & Chevron */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {evt.isSuspicious && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                  Suspicious
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        ))}
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
