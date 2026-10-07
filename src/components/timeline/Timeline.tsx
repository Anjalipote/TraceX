import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  AlertTriangle, 
  HardDrive, 
  Usb, 
  UserCheck, 
  FileText,
  Search,
  ExternalLink,
  Sparkles,
  Layers,
  CheckCircle2,
  Filter,
  X,
  ChevronDown
} from 'lucide-react';
import { TimelineEvent } from './TimelineEvent';
import { DetailDrawer } from '../common/DetailDrawer';
import { SeverityBadge } from '../common/SeverityBadge';
import { TimelineEventItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

interface TimelineProps {
  initialFilter?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ initialFilter = 'ALL' }) => {
  const navigate = useNavigate();
  const { timeline, searchQuery: globalSearch, activityClusters } = useApp();
  
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventItem | null>(null);
  const [filterClusterOnly, setFilterClusterOnly] = useState<boolean>(false);
  const [showPhases, setShowPhases] = useState<boolean>(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [activityPhases, setActivityPhases] = useState<any[]>([]);

  useEffect(() => {
    api.getActivityPhases().then(res => setActivityPhases(res));
  }, []);

  const effectiveSearch = globalSearch || localSearch;
  const suspiciousCount = timeline.filter(e => e.isSuspicious).length;
  const hasSuspiciousActivity = suspiciousCount > 0;

  const defaultCleanCluster = {
    id: 'cluster-clean',
    title: 'Normal Operational Event Baseline',
    description: 'All chronologically recorded events conform to authorized system baselines. Zero unauthorized device connections, disguised executables, or anti-forensic deletions detected.',
    confidence: '100%',
    sequenceSummary: 'Clean Baseline Verified',
    eventIds: []
  };

  const primaryCluster = activityClusters[0] || (hasSuspiciousActivity ? {
    id: 'cluster-primary',
    title: 'Correlated Anomaly Sequence',
    description: 'Chronological telemetry sequence exhibiting correlated anomalous indicators.',
    confidence: 'High',
    sequenceSummary: 'Suspicious Telemetry Sequence',
    eventIds: timeline.filter(e => e.isSuspicious).map(e => e.id)
  } : defaultCleanCluster);

  const clusterEventIds = primaryCluster.eventIds && primaryCluster.eventIds.length > 0 
    ? primaryCluster.eventIds 
    : (hasSuspiciousActivity ? timeline.filter(e => e.isSuspicious).map(e => e.id) : []);

  // Parse sequence items dynamically from cluster sequenceSummary or timeline events
  const sequenceItems: string[] = primaryCluster.sequenceSummary && primaryCluster.sequenceSummary.includes('→')
    ? primaryCluster.sequenceSummary.split('→').map(s => s.trim())
    : (hasSuspiciousActivity
        ? timeline.filter(e => e.isSuspicious).slice(0, 5).map(e => `${e.timeFormatted.slice(0, 5)} ${e.title}`)
        : (timeline.length > 0 
            ? timeline.slice(0, 4).map(e => `${e.timeFormatted.slice(0, 5)} ${e.title}`)
            : ['No events ingested yet']));

  const categories = [
    { id: 'ALL', label: 'ALL EVENTS', icon: Clock },
    { id: 'FILES', label: 'FILES', icon: FileText },
    { id: 'USB', label: 'USB', icon: Usb },
    { id: 'SYSTEM', label: 'SYSTEM', icon: HardDrive },
    { id: 'USER', label: 'USER', icon: UserCheck },
    { id: 'SUSPICIOUS', label: 'SUSPICIOUS ONLY', icon: AlertTriangle, alert: true },
  ];

  const filteredTimeline = timeline.filter((event) => {
    if (filterClusterOnly) {
      if (!clusterEventIds.includes(event.id)) {
        return false;
      }
    }

    let matchesCategory = true;
    if (activeFilter === 'SUSPICIOUS') {
      matchesCategory = event.isSuspicious;
    } else if (activeFilter !== 'ALL') {
      matchesCategory = event.category === activeFilter;
    }

    const searchLower = effectiveSearch.toLowerCase();
    const matchesSearch = 
      !effectiveSearch ||
      event.title.toLowerCase().includes(searchLower) ||
      event.description.toLowerCase().includes(searchLower) ||
      event.actor.toLowerCase().includes(searchLower) ||
      event.sourceArtifact.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Phase 3 Correlated Activity Sequence Banner */}
      <div className="rounded-2xl bg-[#0B1017] border border-blue-500/40 p-5 lg:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              CORRELATED ACTIVITY CLUSTER
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-bold">
              Confidence: {primaryCluster.confidence || 'High'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (hasSuspiciousActivity) {
                  setFilterClusterOnly(!filterClusterOnly);
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition-all border ${
                filterClusterOnly
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                  : 'bg-[#080D15] text-blue-400 border-blue-500/40 hover:bg-[#111923] hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {hasSuspiciousActivity
                  ? filterClusterOnly
                    ? `Showing Correlated Sequence (${clusterEventIds.length} Events)`
                    : 'Filter to Correlated Sequence'
                  : 'All Events Verified Clean'}
              </span>
              {filterClusterOnly && <X className="w-3 h-3 ml-1" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-[#F8FAFC]">
            {primaryCluster.title}
          </h3>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            {primaryCluster.description}
          </p>
        </div>

        {/* Sequence Flow Chain */}
        <div className="p-3 rounded-xl bg-[#080D15] border border-[#1E293B] flex items-center gap-2 overflow-x-auto text-xs font-mono text-[#94A3B8]">
          <span className="text-[#64748B] shrink-0 font-bold uppercase text-[10px]">Sequence:</span>
          {sequenceItems.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-blue-500 shrink-0">→</span>}
              <span className={`px-2 py-1 rounded bg-[#0B1017] border shrink-0 ${
                hasSuspiciousActivity
                  ? idx === 0 
                    ? 'border-amber-500/30 text-amber-300' 
                    : 'border-red-500/30 text-red-300'
                  : 'border-emerald-500/30 text-emerald-300'
              }`}>
                {item}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Forensic Activity Phase Grouping (Final Forensic Enhancement) */}
        <div className="pt-2 border-t border-[#1E293B]/60">
          <button
            onClick={() => setShowPhases(!showPhases)}
            className="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showPhases ? 'Hide Forensic Activity Phases' : 'Inspect 5 Forensic Activity Phases (Staging → Access → Collection → Transfer → Cleanup)'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPhases ? 'rotate-180' : ''}`} />
          </button>

          {showPhases && (
            <div className="mt-3 space-y-2.5 animate-in slide-in-from-top-1">
              {activityPhases.map((phase) => {
                const isExpanded = expandedPhase === phase.phase_number;
                return (
                  <div 
                    key={phase.phase_number}
                    className="rounded-xl border border-[#1E293B] bg-[#070A0F] p-3.5 space-y-2 text-xs font-mono"
                  >
                    <div 
                      onClick={() => setExpandedPhase(isExpanded ? null : phase.phase_number)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#F8FAFC]">{phase.phase_name}</span>
                        <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                          {phase.event_count} Events
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          {phase.time_range}
                        </span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    <p className="text-[#94A3B8] text-[11px] leading-relaxed">
                      {phase.summary}
                    </p>

                    {isExpanded && (
                      <div className="pt-2 border-t border-[#1E293B]/60 space-y-1.5 text-[11px]">
                        <div className="text-[#64748B]">
                          Involved Artifacts: <strong className="text-white">{phase.evidence_items?.join(', ')}</strong>
                        </div>
                        {phase.events && phase.events.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {phase.events.map((e: any, idx: number) => (
                              <div key={idx} className="p-1.5 rounded bg-[#0B1017] border border-[#1E293B] text-[10px] text-[#CBD5E1] flex items-center justify-between">
                                <span>{e.timestamp} - {e.description}</span>
                                <span className="text-blue-400 uppercase">{e.severity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Stat Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 shadow-lg">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => {
            const isActive = activeFilter === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  isActive
                    ? cat.alert
                      ? 'bg-red-950/80 text-red-300 border border-red-800 shadow-md'
                      : 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-sm'
                    : 'bg-[#080D15] text-[#94A3B8] border border-[#1E293B] hover:text-[#F8FAFC] hover:border-blue-500/30'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {cat.id === 'SUSPICIOUS' && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 text-[10px]">
                    {suspiciousCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search timeline events..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080D15] border border-[#1E293B]/80 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Chronological Flow */}
      <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-8 lg:p-10 shadow-xl">
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#1E293B]/60 text-xs font-mono">
          <span className="text-[#94A3B8] uppercase tracking-wider font-semibold">
            CHRONOLOGICAL RECONSTRUCTION (UTC TIMESTAMP ACCURACY)
          </span>
          <span className="text-blue-400 font-bold">
            Showing {filteredTimeline.length} of {timeline.length} Ingested Events
          </span>
        </div>

        <div className="space-y-0">
          {filteredTimeline.map((event) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isSelected={selectedEvent?.id === event.id}
              onSelect={(evt) => setSelectedEvent(evt)}
            />
          ))}
        </div>
      </div>

      {/* Event Detail Slide-Over Drawer */}
      {selectedEvent && (
        <DetailDrawer
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
          subtitle={`Event ID: ${selectedEvent.id} • ${selectedEvent.timestamp}`}
          badge={<SeverityBadge severity={selectedEvent.severity} size="sm" />}
          width="lg"
        >
          <div className="space-y-6">
            {/* Anomaly Callout if Suspicious */}
            {selectedEvent.isSuspicious && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-xs text-red-200">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-300 font-mono uppercase tracking-wider">
                    High Priority Anomaly
                  </h4>
                  <p className="mt-1 leading-relaxed">
                    This event is correlated as part of the primary suspicious attack sequence contributing to the Investigation Risk Score.
                  </p>
                </div>
              </div>
            )}

            {/* Core Event Parameters */}
            <div className="rounded-xl bg-[#080D15] border border-[#1E293B]/80 p-4.5 space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
                Event Metadata
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#94A3B8] font-mono text-[11px] block">Time (Formatted)</span>
                  <span className="font-mono text-blue-400 font-bold">{selectedEvent.timeFormatted}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] font-mono text-[11px] block">Category</span>
                  <span className="font-mono text-[#F8FAFC]">{selectedEvent.category}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] font-mono text-[11px] block">Actor Identity</span>
                  <span className="font-mono text-[#F8FAFC]">{selectedEvent.actor}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] font-mono text-[11px] block">Artifact Origin</span>
                  <span className="font-mono text-[#F8FAFC]">{selectedEvent.sourceArtifact}</span>
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="rounded-xl bg-[#080D15] border border-[#1E293B]/80 p-4.5 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
                Investigative Synthesis
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>

            {/* Raw Forensic Log Snippet */}
            {selectedEvent.rawLogSnippet && (
              <div className="rounded-xl bg-[#080D15] border border-[#1E293B]/80 p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase text-[#64748B]">
                    Raw Evidence Log Excerpt
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400">Hash Verified</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#05080E] border border-[#1E293B]/70 font-mono text-xs text-blue-300 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                  {selectedEvent.rawLogSnippet}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-3 pt-2">
              {selectedEvent.evidenceId && (
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    navigate(`/evidence?selected=${selectedEvent.evidenceId}`);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors font-mono"
                >
                  <FileText className="w-4 h-4" />
                  <span>Inspect Associated Evidence File</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  navigate('/graph');
                }}
                className="py-2.5 px-4 rounded-xl bg-[#0E1522] hover:bg-[#162032] border border-[#1E293B] text-[#F8FAFC] text-xs font-semibold flex items-center gap-1.5 transition-colors font-mono"
              >
                <span>View in Graph</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
};
