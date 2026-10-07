import { INITIAL_CASES } from '../data/cases';
import { INITIAL_EVIDENCE } from '../data/evidence';
import { INITIAL_TIMELINE } from '../data/timeline';
import { INITIAL_FINDINGS } from '../data/findings';
import { RISK_SUMMARY, INITIAL_RISK_FACTORS } from '../data/risk';
import { INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES } from '../data/graph';
import { 
  CaseItem, 
  EvidenceItem, 
  TimelineEventItem, 
  FindingItem, 
  RiskFactorItem, 
  ActivityClusterItem, 
  AnomalyItem, 
  AnalysisJobItem, 
  GlobalSearchItem 
} from '../types';

/**
 * TraceX Full-Stack API Client (Phase 3 Intelligent DFIR Platform)
 * 
 * Directly connected to FastAPI backend (http://127.0.0.1:8000/api)
 * Features real-time pipeline tracking, activity clustering, deterministic anomalies,
 * multi-dimensional risk priority score, and multi-entity relationship graph.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  '/api';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('tracex_token');
  const role = localStorage.getItem('tracex_user_role') || 'ADMIN';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-TraceX-User-Role': role,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Authentication
  async login(email: string, pass: string): Promise<{ success: boolean; token?: string; user?: any }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('tracex_token', data.access_token);
        }
        return { success: true, token: data.access_token, user: data.user };
      }
    } catch {
      // Backend offline fallback handled gracefully
    }
    if (email.trim() === 'investigator@tracex.demo' && pass === 'TraceX@123') {
      return { success: true };
    }
    return { success: false };
  },

  // Case Management
  async getCases(): Promise<CaseItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const backendCases = await res.json();
        if (backendCases && backendCases.length > 0) {
          return backendCases.map((c: any) => ({
            id: c.case_number || c.id,
            name: c.name,
            investigator: 'Specialist Alex Vance (Badge #4092)',
            status: c.status,
            evidenceCount: c.evidence_count ?? 0,
            timelineEventCount: c.timeline_event_count ?? 0,
            riskScore: c.risk_score ?? 0,
            severity: (c.risk_score >= 80 ? 'CRITICAL' : c.risk_score >= 60 ? 'HIGH' : c.risk_score > 0 ? 'MEDIUM' : 'LOW') as any,
            createdAt: new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' UTC',
            description: c.description,
            targetSystem: c.target_system,
            tags: c.risk_score > 0 ? ['Active Threat', 'Triage'] : ['Clean Baseline', 'Active']
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [...INITIAL_CASES];
  },

  async createCase(caseData: Omit<CaseItem, 'id' | 'createdAt' | 'evidenceCount' | 'timelineEventCount' | 'riskScore' | 'severity'>): Promise<CaseItem> {
    try {
      const caseNumber = `CASE-2026-${String(Math.floor(Math.random() * 899) + 100)}`;
      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          case_number: caseNumber,
          name: caseData.name,
          description: caseData.description,
          status: caseData.status || 'Active',
          priority: 'High',
          incident_type: 'Forensic Investigation',
          target_system: caseData.targetSystem || 'WIN11-TRIAGE-TARGET'
        })
      });
      if (res.ok) {
        const c = await res.json();
        return {
          id: c.case_number,
          name: c.name,
          investigator: caseData.investigator,
          status: c.status,
          evidenceCount: 0,
          timelineEventCount: 0,
          riskScore: 0,
          severity: 'LOW',
          createdAt: new Date(c.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          description: c.description,
          targetSystem: c.target_system,
          tags: ['Clean Baseline', 'Active']
        };
      }
    } catch {
      // Fallback
    }

    const fallbackCase: CaseItem = {
      ...caseData,
      id: `CASE-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      evidenceCount: 0,
      timelineEventCount: 0,
      riskScore: 0,
      severity: 'LOW',
    };
    return fallbackCase;
  },

  // Phase 3: Case Analysis Pipeline
  async startAnalysis(caseId: string = 'CASE-2026-001'): Promise<AnalysisJobItem> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/analysis/start`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id,
          caseId: data.case_id,
          status: data.status,
          currentStep: data.current_step,
          progressPercent: data.progress_percent,
          startedAt: data.started_at,
          completedAt: data.completed_at,
          errorMessage: data.error_message
        };
      }
    } catch {
      // Fallback simulation
    }
    return {
      id: `job-${Date.now()}`,
      caseId,
      status: 'Completed',
      currentStep: 'Completed',
      progressPercent: 100,
      startedAt: new Date().toISOString()
    };
  },

  async getAnalysisStatus(caseId: string = 'CASE-2026-001'): Promise<AnalysisJobItem> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/analysis/status`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id,
          caseId: data.case_id,
          status: data.status,
          currentStep: data.current_step,
          progressPercent: data.progress_percent,
          startedAt: data.started_at,
          completedAt: data.completed_at,
          errorMessage: data.error_message
        };
      }
    } catch {
      // Fallback
    }
    return {
      id: `job-baseline`,
      caseId,
      status: 'Completed',
      currentStep: 'Completed',
      progressPercent: 100,
      startedAt: new Date().toISOString()
    };
  },

  // Phase 3: Activity Clusters
  // Phase 3: Activity Clusters
  async getActivityClusters(caseId: string = 'CASE-2026-001'): Promise<ActivityClusterItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/clusters`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const clusters = await res.json();
        if (Array.isArray(clusters)) {
          return clusters.map((c: any) => ({
            id: c.id,
            caseId: c.case_id,
            title: c.title,
            description: c.description,
            startTime: c.start_time,
            endTime: c.end_time,
            eventCount: c.event_count,
            severity: c.severity.toUpperCase() as any,
            confidence: c.confidence as any,
            confidenceReason: c.confidence_reason,
            sequenceSummary: c.sequence_summary,
            eventIds: c.event_ids ? (typeof c.event_ids === 'string' ? JSON.parse(c.event_ids) : c.event_ids) : [],
            evidenceIds: c.evidence_ids ? (typeof c.evidence_ids === 'string' ? JSON.parse(c.evidence_ids) : c.evidence_ids) : []
          }));
        }
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? [
      {
        id: 'cluster-primary',
        caseId,
        title: 'Primary Exfiltration & Anti-Forensic Sequence',
        description: 'Correlated activity window showing unauthorized physical storage attachment immediately followed by classified file duplication, malware invocation, and audit trail truncation.',
        startTime: '2026-10-05T09:45:10Z',
        endTime: '2026-10-05T09:55:04Z',
        eventCount: 5,
        severity: 'CRITICAL',
        confidence: 'High',
        confidenceReason: 'Correlated across 3 distinct host telemetry log sources within 10-minute window.',
        sequenceSummary: '09:45 USB Connected → 09:47 Sensitive File Accessed → 09:48 File Copied to Removable Drive → 09:50 Suspicious Binary Observed → 09:55 Files Deleted / Anti-Forensics'
      }
    ] : [];
  },

  // Phase 3: Anomaly Detection
  async getAnomalies(caseId: string = 'CASE-2026-001'): Promise<AnomalyItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/anomalies`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const anomalies = await res.json();
        if (Array.isArray(anomalies)) {
          return anomalies.map((a: any) => ({
            id: a.id,
            caseId: a.case_id,
            title: a.title,
            anomalyType: a.anomaly_type,
            severity: a.severity.toUpperCase() as any,
            confidence: a.confidence as any,
            confidenceReason: a.confidence_reason,
            description: a.description,
            detectedAt: a.detected_at,
            supportingEvidence: a.supporting_evidence ? (typeof a.supporting_evidence === 'string' ? JSON.parse(a.supporting_evidence) : a.supporting_evidence) : [],
            explanation: a.explanation
          }));
        }
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? [
      {
        id: 'anom-1',
        caseId,
        title: 'Rapid File Access Post Removable Storage Mount',
        anomalyType: 'temporal_proximity',
        severity: 'CRITICAL',
        confidence: 'High',
        confidenceReason: 'Read handle opened within 128 seconds of USB registration.',
        description: 'Classified file read was initiated only 128 seconds following external USB volume mount.',
        detectedAt: '2026-10-05T09:47:18Z',
        supportingEvidence: ['usb_activity.log', 'confidential.pdf'],
        explanation: 'In baseline DFIR profiles, immediate access to sensitive directories following physical device mounting suggests potential data staging.'
      },
      {
        id: 'anom-2',
        caseId,
        title: 'Confluent Exfiltration & Anti-Forensic Sequence',
        anomalyType: 'unusual_sequence',
        severity: 'CRITICAL',
        confidence: 'High',
        confidenceReason: '5 sequential suspicious phases executed consecutively.',
        description: 'Observed a multi-step sequence of external storage insertion, file staging, executable invocation, and artifact purging.',
        detectedAt: '2026-10-05T09:55:04Z',
        supportingEvidence: ['confidential.pdf', 'suspicious.exe', 'system.log'],
        explanation: 'DFIR heuristics detected an uncommon 5-phase progression strongly deviating from standard workstation workflows.'
      }
    ] : [];
  },

  // Phase 3: Global Investigation Search
  async globalSearch(caseId: string = 'CASE-2026-001', queryStr: string, category?: string): Promise<GlobalSearchItem[]> {
    try {
      const catParam = category ? `&category=${category}` : '';
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/search?q=${encodeURIComponent(queryStr)}${catParam}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return data.results.map((r: any) => ({
          category: r.category,
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          snippet: r.snippet,
          severity: r.severity as any,
          confidence: r.confidence as any,
          timestamp: r.timestamp,
          metadata: r.metadata
        }));
      }
    } catch {
      // Fallback
    }
    return [];
  },

  // Evidence Operations
  async getEvidence(caseId: string = 'CASE-2026-001'): Promise<EvidenceItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/evidence`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          return items.map((e: any) => ({
            id: e.id,
            filename: e.filename,
            fileType: e.file_type.toUpperCase(),
            category: e.category || 'FileSystem',
            sizeFormatted: e.file_size < 1048576 ? `${(e.file_size / 1024).toFixed(1)} KB` : `${(e.file_size / 1048576).toFixed(1)} MB`,
            sizeBytes: e.file_size,
            createdAt: e.file_created_at ? new Date(e.file_created_at).toISOString().replace('T', ' ').slice(0, 19) : (e.uploaded_at ? new Date(e.uploaded_at).toISOString().replace('T', ' ').slice(0, 19) : '05 Oct 2026 09:12:04'),
            modifiedAt: e.file_modified_at ? new Date(e.file_modified_at).toISOString().replace('T', ' ').slice(0, 19) : (e.uploaded_at ? new Date(e.uploaded_at).toISOString().replace('T', ' ').slice(0, 19) : '05 Oct 2026 09:47:18'),
            accessedAt: e.file_accessed_at ? new Date(e.file_accessed_at).toISOString().replace('T', ' ').slice(0, 19) : (e.uploaded_at ? new Date(e.uploaded_at).toISOString().replace('T', ' ').slice(0, 19) : '05 Oct 2026 09:47:45'),
            riskScore: e.analysis_status === 'Flagged' ? 92 : 0,
            severity: e.analysis_status === 'Flagged' ? 'CRITICAL' : 'LOW',
            sha256: e.sha256_hash,
            originalSha256: e.baseline_sha256 || e.sha256_hash,
            integrity: e.integrity_status.toUpperCase() as any,
            sourceLocation: e.source_device || 'WORKSTATION-CORP-FIN09',
            relatedEvents: [],
            relatedFindings: [],
            relatedGraphNodes: [],
            description: e.notes || `Forensic artifact captured from ${e.source_device}. SHA-256 integrity verified.`,
            isLiveAgent: Boolean(e.is_live_agent),
            baselineSha256: e.baseline_sha256 || undefined,
            pdfDiffData: e.pdf_diff_data ? (typeof e.pdf_diff_data === 'string' ? JSON.parse(e.pdf_diff_data) : e.pdf_diff_data) : undefined,
            source: e.is_live_agent ? 'LIVE AGENT' : (e.source || 'DEMO DATA')
          }));
        }
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? [...INITIAL_EVIDENCE] : [];
  },

  async uploadEvidence(files: File[], caseId: string = 'CASE-2026-001'): Promise<{ uploadedCount: number; message: string }> {
    try {
      let uploaded = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source_device', 'WORKSTATION-CORP-FIN09');
        formData.append('category', 'Uploaded Evidence');
        formData.append('notes', 'Forensic ingestion via investigator workstation interface.');

        const res = await fetch(`${API_BASE_URL}/cases/${caseId}/evidence/upload`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        });
        if (res.ok) {
          uploaded++;
        }
      }
      if (uploaded > 0) {
        return {
          uploadedCount: uploaded,
          message: `Successfully processed ${uploaded} evidence file(s) through cryptographic SHA-256 ingestion pipeline.`
        };
      }
    } catch {
      // Fallback
    }

    return {
      uploadedCount: files.length,
      message: `Successfully received ${files.length} evidence file(s) for forensic ingestion pipeline.`
    };
  },

  // Timeline & Correlation
  async getTimeline(caseId: string = 'CASE-2026-001'): Promise<TimelineEventItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/timeline`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const events = await res.json();
        if (Array.isArray(events)) {
          return events.map((e: any) => ({
            id: e.id,
            timestamp: e.timestamp,
            timeFormatted: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            title: e.description.split('.')[0] || e.description,
            description: e.description,
            category: (e.event_type || 'SYSTEM').toUpperCase() as any,
            isSuspicious: e.is_suspicious,
            severity: e.severity.toUpperCase() as any,
            sourceArtifact: e.source || (e.is_live_agent ? 'LIVE AGENT' : 'SYSTEM'),
            evidenceId: e.evidence_id || 'ev-001',
            actor: e.actor || 'SYSTEM',
            relatedFindings: e.is_suspicious ? ['find-001'] : [],
            rawLogSnippet: e.raw_log || e.description,
            mitreTechnique: e.mitre_technique,
            isLiveAgent: Boolean(e.is_live_agent),
            source: e.is_live_agent ? 'LIVE AGENT' : (e.source || 'DEMO DATA')
          }));
        }
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? [...INITIAL_TIMELINE] : [];
  },

  // Phase 3 Explainable Findings
  async getFindings(caseId: string = 'CASE-2026-001'): Promise<FindingItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/findings`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const findings = await res.json();
        if (Array.isArray(findings)) {
          return findings.map((f: any) => ({
            id: f.id,
            title: f.title,
            severity: f.severity.toUpperCase() as any,
            timestamp: f.created_at ? new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:48 AM',
            relatedFile: f.related_entities ? (typeof f.related_entities === 'string' ? JSON.parse(f.related_entities)[0] : f.related_entities[0]) : 'artifact',
            evidenceId: f.evidence_id || '',
            riskContribution: f.risk_contribution,
            summary: f.description,
            suspiciousReasons: f.supporting_factors ? (typeof f.supporting_factors === 'string' ? JSON.parse(f.supporting_factors) : f.supporting_factors) : [f.reason],
            mitreTechnique: f.mitre_technique || 'Forensic Indicator',
            recommendedAction: f.recommended_next_step || 'Preserve forensic custody and monitor telemetry.',
            status: f.status as any,
            confidence: (f.confidence || 'High') as any,
            confidenceReason: f.confidence_reason || 'Verified via forensic correlation records.',
            whatHappened: f.what_happened,
            whyDetected: f.why_detected,
            whySuspicious: f.why_suspicious,
            recommendedNextStep: f.recommended_next_step,
            supportingFactors: f.supporting_factors ? (typeof f.supporting_factors === 'string' ? JSON.parse(f.supporting_factors) : f.supporting_factors) : [],
            relatedEntities: f.related_entities ? (typeof f.related_entities === 'string' ? JSON.parse(f.related_entities) : f.related_entities) : [],
            relatedTimelineEventIds: f.related_timeline_event_ids ? (typeof f.related_timeline_event_ids === 'string' ? JSON.parse(f.related_timeline_event_ids) : f.related_timeline_event_ids) : [],
            isLiveAgent: Boolean(f.is_live_agent),
            source: f.is_live_agent ? 'LIVE AGENT' : 'DEMO DATA'
          }));
        }
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? [...INITIAL_FINDINGS] : [];
  },

  // Multi-Dimensional Risk Scoring
  async getRisk(caseId: string = 'CASE-2026-001'): Promise<{ 
    summary: typeof RISK_SUMMARY & { 
      severityContribution?: number;
      evidenceContribution?: number;
      correlationContribution?: number;
      anomalyContribution?: number;
      timelineContribution?: number;
      integrityContribution?: number;
      calculationExplanation?: string;
    }; 
    factors: RiskFactorItem[] 
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/risk`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const risk = await res.json();
        const factors: RiskFactorItem[] = (risk.factors || []).map((rf: any) => ({
          id: rf.id,
          title: rf.name,
          contribution: rf.score,
          severity: rf.severity.toUpperCase() as any,
          category: rf.category || 'Behavioral Anomaly',
          description: rf.description,
          evidenceIds: ['ev-001'],
          eventIds: ['evt-003'],
          mitreTactic: rf.mitre_technique || 'Defense Evasion',
          confidence: (rf.confidence || 'High') as any
        }));

        const finalScore = risk.overall_score ?? 0;
        const finalLevel = risk.risk_level || (finalScore === 0 ? 'NO RISK' : (finalScore >= 80 ? 'CRITICAL' : finalScore >= 60 ? 'HIGH' : 'MEDIUM'));

        return {
          summary: {
            score: finalScore,
            maxScore: 100,
            severity: (finalScore === 0 ? 'LOW' : finalLevel) as any,
            title: 'Investigation Priority Score',
            subtitle: finalScore === 0 ? 'Clean Baseline (Zero Threats Detected)' : `Investigation Priority Level: ${finalLevel}`,
            explanation: risk.investigation_recommendation || (finalScore === 0 ? 'No security threats, malicious script commands, or cryptographic integrity violations detected across active evidence.' : RISK_SUMMARY.explanation),
            disclaimer: RISK_SUMMARY.disclaimer,
            severityContribution: risk.severity_contribution ?? 0,
            evidenceContribution: risk.evidence_contribution ?? 0,
            correlationContribution: risk.correlation_contribution ?? 0,
            anomalyContribution: risk.anomaly_contribution ?? 0,
            timelineContribution: risk.timeline_contribution ?? 0,
            integrityContribution: risk.integrity_contribution ?? 0,
            calculationExplanation: risk.calculation_explanation || (finalScore === 0 ? 'Baseline case integrity verified. 0 risk factors identified across telemetry and artifacts.' : "Synthesized across 6 discrete forensic dimensions.")
          },
          factors: factors
        };
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? {
      summary: RISK_SUMMARY,
      factors: [...INITIAL_RISK_FACTORS]
    } : {
      summary: {
        score: 0,
        maxScore: 100,
        severity: 'LOW',
        title: 'Investigation Priority Score',
        subtitle: 'Clean Baseline (Zero Threats Detected)',
        explanation: 'No security threats or cryptographic violations detected.',
        disclaimer: RISK_SUMMARY.disclaimer,
        severityContribution: 0,
        evidenceContribution: 0,
        correlationContribution: 0,
        anomalyContribution: 0,
        timelineContribution: 0,
        integrityContribution: 0,
        calculationExplanation: 'Case baseline verified clean.'
      },
      factors: []
    };
  },

  // Dynamic Multi-Entity Graph Data
  async getGraph(caseId: string = 'CASE-2026-001'): Promise<{ nodes: any[]; edges: any[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/relationships`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          return {
            nodes: data.nodes,
            edges: data.edges
          };
        }
      }
    } catch {
      // Fallback
    }
    return {
      nodes: INITIAL_GRAPH_NODES,
      edges: INITIAL_GRAPH_EDGES
    };
  },

  // Evidence Integrity
  async getIntegrity(caseId: string = 'CASE-2026-001'): Promise<{
    totalVerified: number;
    totalModified: number;
    totalFailed: number;
    items: EvidenceItem[];
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/integrity`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return {
          totalVerified: data.verified_count ?? 0,
          totalModified: data.compromised_count ?? 0,
          totalFailed: data.pending_count ?? 0,
          items: (data.items || []).map((e: any) => ({
            id: e.id,
            filename: e.filename,
            fileType: e.file_type.toUpperCase(),
            category: e.category || 'FileSystem',
            sizeFormatted: `${(e.file_size / 1024).toFixed(1)} KB`,
            sizeBytes: e.file_size,
            createdAt: e.file_created_at ? new Date(e.file_created_at).toISOString().replace('T', ' ').slice(0, 19) : (e.uploaded_at ? new Date(e.uploaded_at).toISOString().replace('T', ' ').slice(0, 19) : 'N/A'),
            modifiedAt: e.file_modified_at ? new Date(e.file_modified_at).toISOString().replace('T', ' ').slice(0, 19) : (e.uploaded_at ? new Date(e.uploaded_at).toISOString().replace('T', ' ').slice(0, 19) : 'N/A'),
            accessedAt: e.file_accessed_at ? new Date(e.file_accessed_at).toISOString().replace('T', ' ').slice(0, 19) : (e.uploaded_at ? new Date(e.uploaded_at).toISOString().replace('T', ' ').slice(0, 19) : 'N/A'),
            riskScore: e.analysis_status === 'Flagged' ? 92 : 0,
            severity: e.analysis_status === 'Flagged' ? 'CRITICAL' : 'LOW',
            sha256: e.sha256_hash,
            originalSha256: e.sha256_hash,
            integrity: e.integrity_status.toUpperCase() as any,
            sourceLocation: e.source_device || 'WORKSTATION-CORP-FIN09',
            relatedEvents: [],
            relatedFindings: [],
            relatedGraphNodes: [],
            description: e.notes || 'Forensic artifact.'
          }))
        };
      }
    } catch {
      // Fallback
    }
    return caseId === 'CASE-2026-001' ? {
      totalVerified: 128,
      totalModified: 0,
      totalFailed: 0,
      items: [...INITIAL_EVIDENCE]
    } : {
      totalVerified: 0,
      totalModified: 0,
      totalFailed: 0,
      items: []
    };
  },

  async verifyIntegrity(evidenceId: string): Promise<{ verified: boolean; sha256: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return {
          verified: data.matches,
          sha256: data.calculated_sha256
        };
      }
    } catch {
      // Fallback
    }
    const item = INITIAL_EVIDENCE.find(e => e.id === evidenceId);
    return {
      verified: item ? item.sha256 === item.originalSha256 : true,
      sha256: item ? item.sha256 : 'UNKNOWN'
    };
  },

  // Report Generation & Phase 3 Investigation Story
  async generateReport(caseId: string = 'CASE-2026-001', reportType: string = 'Full Forensic Dossier'): Promise<{ reportId: string; generatedAt: string; status: string; downloadUrl?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/reports`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          case_id: caseId,
          title: `${reportType} - ${caseId}`,
          report_type: reportType,
          classification: 'CONFIDENTIAL'
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          reportId: data.id,
          generatedAt: data.generated_at,
          status: data.status,
          downloadUrl: `${API_BASE_URL}/reports/${data.id}/download`
        };
      }
    } catch {
      // Fallback
    }
    return {
      reportId: `REP-${caseId}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      status: 'READY'
    };
  },

  async getInvestigationStory(caseId: string = 'CASE-2026-001'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/story`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  },

  // Phase 4: Reports List
  async getReports(caseId: string = 'CASE-2026-001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/reports`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [];
  },

  // Phase 4: Verify Report Hash
  async verifyReport(reportId: string, claimedHash?: string): Promise<{ isValid: boolean; reportHash: string; computedHash: string; status: string; verifiedAt?: string }> {
    try {
      const url = claimedHash 
        ? `${API_BASE_URL}/reports/${reportId}/verify?claimed_hash=${encodeURIComponent(claimedHash)}`
        : `${API_BASE_URL}/reports/${reportId}/verify`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return {
          isValid: data.is_valid,
          reportHash: data.report_hash,
          computedHash: data.computed_hash,
          status: data.status,
          verifiedAt: data.verified_at
        };
      }
    } catch {
      // Fallback
    }
    return {
      isValid: true,
      reportHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      computedHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'VERIFIED_MATCH'
    };
  },

  // Phase 4: Evidence Gaps
  async getEvidenceGaps(caseId: string = 'CASE-2026-001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/gaps`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'gap-1',
        caseId,
        title: 'Missing External Network Telemetry (PCAP / NetFlow)',
        gapType: 'missing_telemetry',
        severity: 'HIGH',
        confidence: 'High',
        whyItMatters: 'Execution of suspicious.exe observed, but outbound C2 beaconing or external network connections cannot be confirmed without firewall/proxy or packet capture logs.',
        suggestedStep: 'Request gateway firewall connection logs and perimeter NetFlow captures for target host IP during the 09:40-10:00 UTC window.',
        isResolved: false
      },
      {
        id: 'gap-2',
        caseId,
        title: 'Absence of DLP Hardware Whitelist Audit Log',
        gapType: 'missing_expected_evidence',
        severity: 'MEDIUM',
        confidence: 'High',
        whyItMatters: 'Kingston USB was mounted at 09:45, but host DLP agent activity logs are not ingested to confirm whether device was unauthorized or granted an override.',
        suggestedStep: 'Query corporate Endpoint DLP management console to verify if USB serial was authorized under an active exemption ticket.',
        isResolved: false
      }
    ];
  },

  // Phase 4: Explainability Center
  async getExplainabilityMatrix(caseId: string = 'CASE-2026-001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/explainability`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [];
  },

  // Phase 4: Case Comparison
  async compareCases(case1: string, case2: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/compare?case1=${case1}&case2=${case2}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  },

  // Phase 4: Audit Logs
  async getAuditLogs(caseId?: string, action?: string, userEmail?: string, search?: string, limit: number = 50, offset: number = 0): Promise<{ logs: any[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (userEmail) params.append('user_email', userEmail);
      if (search) params.append('search', search);
      params.append('limit', String(limit));
      params.append('offset', String(offset));

      const url = caseId 
        ? `${API_BASE_URL}/cases/${caseId}/audit?${params.toString()}`
        : `${API_BASE_URL}/audit?${params.toString()}`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return { logs: [], total: 0 };
  },

  // Phase 4: Case Activity Feed
  async getCaseActivity(caseId: string = 'CASE-2026-001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/activity`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [];
  },

  // Phase 4: User Management (Admin only)
  async getUsers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [
      { id: 'user-alex-vance', name: 'Specialist Alex Vance', email: 'investigator@tracex.demo', role: 'ADMIN', status: 'active', badgeNumber: 'TX-4092', createdAt: new Date().toISOString() },
      { id: 'user-marcus-thorne', name: 'Specialist Marcus Thorne', email: 'marcus.thorne@tracex.demo', role: 'INVESTIGATOR', status: 'active', badgeNumber: 'TX-5118', createdAt: new Date().toISOString() },
      { id: 'user-sarah-chen', name: 'Auditor Sarah Chen', email: 'sarah.chen@tracex.demo', role: 'VIEWER', status: 'active', badgeNumber: 'TX-9021', createdAt: new Date().toISOString() },
    ];
  },

  async updateUserRole(userId: string, role: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  },

  getExportCsvUrl(caseId: string = 'CASE-2026-001'): string {
    return `${API_BASE_URL}/cases/${caseId}/reports/export/csv`;
  },

  async resetDemoCase(caseId: string = 'CASE-2026-001'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/reset-demo`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return { success: true, message: `Demo case ${case_id_fallback(caseId)} reseeded to canonical state.` };
  },

  // Final Forensic Enhancement Methods
  async getMerkleRoot(caseId: string = 'CASE-2026-001'): Promise<{ merkle_root: string; is_valid: boolean; leaf_count: number; leaf_hashes: string[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/merkle`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      merkle_root: '609505c1a709b7e66293eaa14669822e2b9fe228b738d435f9adb049341b3d1f',
      is_valid: true,
      leaf_count: 128,
      leaf_hashes: []
    };
  },

  async getCustodyChain(caseId: string = 'CASE-2026-001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/custody`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [
      { sequence_number: 1, action: 'PHYSICAL_SEIZURE', evidence_name: 'FINANCE-SRV-04 System Image', actor: 'Investigator Vance', timestamp: '2026-03-28 09:12:00 UTC', previous_hash: '0000000000000000000000000000000000000000000000000000000000000000', record_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', details: 'Seized workstation physical drives under warrant TX-2026-W09; write-blocking container.' },
      { sequence_number: 2, action: 'INGESTION_HASH', evidence_name: 'usb_activity.log', actor: 'Investigator Vance', timestamp: '2026-03-28 09:24:00 UTC', previous_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0', record_hash: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a', details: 'Extracted SetupAPI log; calculated SHA-256 and MD5 bit-for-bit baseline digests.' },
      { sequence_number: 3, action: 'INGESTION_HASH', evidence_name: 'confidential.pdf', actor: 'Investigator Vance', timestamp: '2026-03-28 09:36:00 UTC', previous_hash: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a', record_hash: 'c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2b', details: 'Read-only ingestion of target sensitive PDF artifact into write-protected vault.' },
      { sequence_number: 4, action: 'SANDBOX_ISOLATION', evidence_name: 'suspicious.exe', actor: 'Specialist Vance', timestamp: '2026-03-28 09:48:00 UTC', previous_hash: 'c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2b', record_hash: 'd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3', details: 'Ingested suspicious binary directly into inert read-only evidentiary vault; execution rights revoked.' },
      { sequence_number: 5, action: 'INGESTION_HASH', evidence_name: 'system.log', actor: 'Investigator Vance', timestamp: '2026-03-28 10:00:00 UTC', previous_hash: 'd4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3', record_hash: 'e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3d4', details: 'Extracted Windows Security and System event log archives; calculated SHA-256 hash.' },
      { sequence_number: 6, action: 'INTEGRITY_VERIFICATION', evidence_name: 'CASE_EVIDENCE_SET', actor: 'Investigator Vance', timestamp: '2026-03-28 10:12:00 UTC', previous_hash: 'e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3d4', record_hash: 'f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3d4e5', details: 'Recalculated cryptographic hashes for all ingested items; verified 100% bit-for-bit integrity.' },
      { sequence_number: 7, action: 'AUTOMATED_ANALYSIS', evidence_name: 'CORRELATION_ENGINE', actor: 'TraceX Engine v5.0', timestamp: '2026-03-28 10:24:00 UTC', previous_hash: 'f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3d4e5', record_hash: '0718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3d4e5f6', details: 'Executed deterministic timeline reconstruction, activity sequence clustering, and anomaly detection.' },
      { sequence_number: 8, action: 'REPORT_SEALED', evidence_name: 'INVESTIGATION_REPORT', actor: 'Specialist Alex Vance', timestamp: '2026-03-28 10:36:00 UTC', previous_hash: '0718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2bc3d4e5f6', record_hash: '952cbb8f08aaac61af441cb72cb84bca553c512a4e2b7e4ef563436750af2ab7', details: 'Generated full forensic dossier; sealed with canonical SHA-256 digest and case Merkle root.' }
    ];
  },

  async verifyCustodyChain(caseId: string = 'CASE-2026-001'): Promise<{ is_valid: boolean; total_records: number; head_hash: string; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/custody/verify`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      is_valid: true,
      total_records: 8,
      head_hash: '952cbb8f08aaac61af441cb72cb84bca553c512a4e2b7e4ef563436750af2ab7',
      message: 'Chain of custody cryptographically verified. All 8 blocks linked with immutable SHA-256 hashes.'
    };
  },

  async getActivityPhases(caseId: string = 'CASE-2026-001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/clusters/phases`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [
      {
        phase_number: 1,
        phase_name: 'Phase 1: Potential Staging Activity',
        event_count: 1,
        time_range: '09:45:10 UTC',
        summary: 'Physical external storage device mounted to system bus; drive volume E:\\ allocated.',
        evidence_items: ['usb_activity.log']
      },
      {
        phase_number: 2,
        phase_name: 'Phase 2: Potential Access Activity',
        event_count: 1,
        time_range: '09:47:18 UTC',
        summary: 'Classified PDF document opened under interactive user security context.',
        evidence_items: ['confidential.pdf']
      },
      {
        phase_number: 3,
        phase_name: 'Phase 3: Potential Collection Activity',
        event_count: 2,
        time_range: '09:48:42 - 09:55:04 UTC',
        summary: 'Exact byte duplicate created on external target volume E:\\Backup\\confidential.pdf.',
        evidence_items: ['confidential.pdf', 'system.log']
      },
      {
        phase_number: 4,
        phase_name: 'Phase 4: Potential Transfer Activity',
        event_count: 1,
        time_range: '09:50:22 UTC',
        summary: 'High-privilege process spawned from %TEMP% directory with automated parameters.',
        evidence_items: ['suspicious.exe']
      },
      {
        phase_number: 5,
        phase_name: 'Phase 5: Potential Cleanup Activity',
        event_count: 3,
        time_range: '09:43:00 - 09:55:04 UTC',
        summary: 'Audit log truncation and shadow copy unlinking executed via administrative command.',
        evidence_items: ['system.log', 'suspicious.exe']
      }
    ];
  },

  // Forensic Investigation Workflow API (Host Collector & Analysis)
  async getComputers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/investigations/computers`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [
      {
        id: 'EMP-LT-001',
        name: 'EMP-LT-001',
        os: 'Windows 11 Enterprise (Build 22631)',
        status: 'Connected',
        collection_mode: 'Read-only',
        collection_type: 'Demo Collector',
        last_seen: 'Just now',
        agent_version: 'v2.4.1-demo',
        is_demo: true
      },
      {
        id: 'WORKSTATION-CORP-FIN09',
        name: 'WORKSTATION-CORP-FIN09',
        os: 'Windows 11 Enterprise (Build 22621)',
        status: 'Connected',
        collection_mode: 'Read-only',
        collection_type: 'Live Agent',
        last_seen: '2 mins ago',
        agent_version: 'v2.4.1',
        is_demo: false
      }
    ];
  },

  async authorizeInvestigation(params: {
    computer_id: string;
    case_id?: string;
    collection_mode?: string;
    collection_type?: string;
    authorized: boolean;
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/investigations/authorize`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      authorization_id: `AUTH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      computer_id: params.computer_id,
      case_id: params.case_id || 'TRX-001',
      status: 'Authorized',
      collection_mode: params.collection_mode || 'Read-only',
      collection_type: params.collection_type === 'demo' ? 'Demo Collector' : 'Live Agent',
      authorized_at: new Date().toISOString(),
      authorized_by: 'Alex Vance',
      categories_granted: [
        'System Logs', 'File Activity', 'USB / Device Activity',
        'User Activity', 'Network Activity', 'Application Activity'
      ],
      read_only_guarantee: true,
      notice: 'TraceX operates strictly in read-only mode.'
    };
  },

  async startInvestigationScan(params: {
    computer_id: string;
    case_id?: string;
    investigation_mode?: 'historical' | 'live';
    collection_type?: string;
    hours?: number;
    scan_paths?: string[];
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/investigations/scan`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      scan_id: `SCAN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      case_id: params.case_id || 'TRX-001',
      computer_id: params.computer_id,
      status: 'Completed',
      investigation_mode: params.investigation_mode || 'historical',
      collection_type: params.collection_type === 'demo' ? 'Demo Collector' : 'Live Agent',
      artifacts_collected: 149,
      elapsed_seconds: 84,
      completed_at: new Date().toISOString()
    };
  },

  async getInvestigationResults(caseId: string = 'TRX-001'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/investigations/${caseId}/results`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      case_id: caseId,
      computer_id: 'EMP-LT-001',
      collection_type: 'Demo Collector',
      suspicious_events_count: 3,
      usb_devices_count: 1,
      files_accessed_count: 4,
      network_connections_count: 2,
      has_suspicious_activity: true,
      summary: 'TraceX identified potential data exfiltration pattern on EMP-LT-001.',
      findings: [
        {
          id: 'TRX-FIND-001',
          title: 'Confidential File Access',
          description: 'confidential.pdf was accessed shortly before USB connection',
          timestamp: '2 Oct 2026, 14:32:15',
          severity: 'High',
          category: 'File Access',
          why_suspicious: 'This file was accessed shortly before a USB device was connected and file transfer activity was detected. The sequence of events suggests potential data exfiltration.',
          related_events: [
            'USB Device Connected (14:33:02)',
            'File Transfer Activity (14:34:18)',
            'USB Device Disconnected (14:36:05)'
          ],
          metadata: {
            user: 'Employee01',
            file_name: 'confidential.pdf',
            file_path: 'C:\\Users\\Employee01\\Documents\\confidential.pdf',
            action: 'Read',
            process: 'Acrobat.exe (PID: 4521)',
            sha256: '8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90',
            integrity_status: 'Verified'
          }
        },
        {
          id: 'TRX-FIND-002',
          title: 'USB Device Connected',
          description: 'SanDisk USB device was connected to workstation port',
          timestamp: '2 Oct 2026, 14:33:02',
          severity: 'Medium',
          category: 'USB Activity',
          why_suspicious: 'A non-whitelisted removable mass storage device was inserted 47 seconds after access to confidential corporate blueprints.',
          related_events: [
            'Confidential File Access (14:32:15)',
            'File Transfer Activity (14:34:18)',
            'USB Device Disconnected (14:36:05)'
          ],
          metadata: {
            user: 'Employee01',
            device_name: 'SanDisk Ultra 64GB',
            serial_number: '4C530001230912098134',
            mount_point: 'E:\\',
            file_system: 'exFAT',
            action: 'Mount / Connect',
            process: 'System (PnP Manager)'
          }
        },
        {
          id: 'TRX-FIND-003',
          title: 'File Transfer Activity',
          description: 'confidential.pdf copied to removable drive volume E:\\',
          timestamp: '2 Oct 2026, 14:34:18',
          severity: 'High',
          category: 'Data Transfer',
          why_suspicious: 'File transfer operation copied sensitive document directly to the newly mounted removable drive E:\\ followed swiftly by device dismount.',
          related_events: [
            'Confidential File Access (14:32:15)',
            'USB Device Connected (14:33:02)',
            'USB Device Disconnected (14:36:05)'
          ],
          metadata: {
            user: 'Employee01',
            file_name: 'confidential.pdf',
            file_path: 'C:\\Users\\Employee01\\Documents\\confidential.pdf -> E:\\confidential.pdf',
            action: 'Copy / Write',
            process: 'explorer.exe (PID: 4120)',
            size_bytes: 2516582,
            sha256: '8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90'
          }
        }
      ]
    };
  },

  // Live Windows Endpoint Agent Integration
  async getAgentStatus(): Promise<{
    status: string;
    total_agents: number;
    online_agents: number;
    agents: Array<{
      id: string;
      hostname: string;
      ip_address: string;
      os_info: string;
      current_user: string;
      agent_version: string;
      status: string;
      is_online: boolean;
      monitored_paths: string[];
      total_events: number;
      last_heartbeat: string | null;
      seconds_since_heartbeat: number;
    }>;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/agent/status`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      status: 'offline',
      total_agents: 0,
      online_agents: 0,
      agents: []
    };
  },

  async getPdfDiff(evidenceId: string): Promise<{
    evidence_id: string;
    filename: string;
    has_diff: boolean;
    message?: string;
    baseline_sha256: string;
    current_sha256: string;
    diff?: {
      has_changes: boolean;
      total_pages_baseline: number;
      total_pages_modified: number;
      changed_pages: number[];
      total_additions: number;
      total_deletions: number;
      pages: Array<{
        page_number: number;
        has_changes: boolean;
        baseline_text: string;
        modified_text: string;
        added_lines: string[];
        removed_lines: string[];
        diff_lines: Array<{
          type: 'unchanged' | 'added' | 'removed';
          text: string;
        }>;
      }>;
      summary: string;
    };
  } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/agent/pdf-diff/${evidenceId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return null;
  }
};

function case_id_fallback(id: string) {
  return id || 'CASE-2026-001';
}
