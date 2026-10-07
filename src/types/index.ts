export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus = 'Active' | 'Under Review' | 'Closed' | 'Archived';
export type IntegrityStatus = 'VERIFIED' | 'MODIFIED' | 'CORRUPTED' | 'UNVERIFIED';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface CaseItem {
  id: string;
  name: string;
  investigator: string;
  status: CaseStatus;
  evidenceCount: number;
  timelineEventCount: number;
  riskScore: number;
  severity: Severity;
  createdAt: string;
  description: string;
  targetSystem: string;
  tags: string[];
}

export interface EvidenceItem {
  id: string;
  filename: string;
  fileType: string;
  category: 'Document' | 'Executable' | 'Log' | 'Database' | 'Archive' | 'Hardware';
  sizeFormatted: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  riskScore: number;
  severity: Severity;
  sha256: string;
  originalSha256: string;
  integrity: IntegrityStatus;
  sourceLocation: string;
  relatedEvents: string[];
  relatedFindings: string[];
  relatedGraphNodes: string[];
  description: string;
  isLiveAgent?: boolean;
  baselineSha256?: string;
  pdfDiffData?: any;
  source?: string;
  notes?: string;
}

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  title: string;
  description: string;
  category: 'FILES' | 'USB' | 'SYSTEM' | 'USER' | 'SUSPICIOUS';
  isSuspicious: boolean;
  severity: Severity;
  sourceArtifact: string;
  evidenceId?: string;
  actor: string;
  relatedFindings?: string[];
  rawLogSnippet?: string;
  mitreTechnique?: string;
  isLiveAgent?: boolean;
  source?: string;
}

export interface FindingItem {
  id: string;
  title: string;
  severity: Severity;
  timestamp: string;
  relatedFile: string;
  isLiveAgent?: boolean;
  source?: string;
  evidenceId: string;
  riskContribution: number;
  summary: string;
  suspiciousReasons: string[];
  mitreTechnique?: string;
  recommendedAction: string;
  status: 'Flagged' | 'Confirmed' | 'Dismissed';
  
  // Phase 3 Explainability & Confidence
  confidence?: ConfidenceLevel;
  confidenceReason?: string;
  whatHappened?: string;
  whyDetected?: string;
  whySuspicious?: string;
  recommendedNextStep?: string;
  supportingFactors?: string[];
  relatedEntities?: string[];
  relatedTimelineEventIds?: string[];
}

export interface ActivityClusterItem {
  id: string;
  caseId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  eventCount: number;
  severity: Severity;
  confidence: ConfidenceLevel;
  confidenceReason?: string;
  sequenceSummary: string;
  eventIds?: string[];
  evidenceIds?: string[];
}

export interface AnomalyItem {
  id: string;
  caseId: string;
  title: string;
  anomalyType: string;
  severity: Severity;
  confidence: ConfidenceLevel;
  confidenceReason?: string;
  description: string;
  detectedAt: string;
  supportingEvidence?: string[];
  explanation: string;
}

export interface AnalysisJobItem {
  id: string;
  caseId: string;
  status: 'Queued' | 'In Progress' | 'Completed' | 'Failed';
  currentStep: string;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  resultSummary?: Record<string, unknown>;
}

export interface GlobalSearchItem {
  category: 'evidence' | 'finding' | 'timeline' | 'anomaly' | 'cluster' | 'entity';
  id: string;
  title: string;
  subtitle?: string;
  snippet: string;
  severity?: Severity;
  confidence?: ConfidenceLevel;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface RiskFactorItem {
  id: string;
  title: string;
  contribution: number;
  severity: Severity;
  category: string;
  description: string;
  evidenceIds: string[];
  eventIds: string[];
  mitreTactic: string;
  confidence?: ConfidenceLevel;
}

export interface GraphNodeData {
  label: string;
  subtitle: string;
  nodeType: 'user' | 'device' | 'file' | 'executable' | 'system' | 'event' | 'evidence' | 'finding';
  risk: Severity;
  evidenceId?: string;
  timestamp?: string;
  details?: Record<string, string>;
  relatedFindings?: string[];
  relatedEvents?: string[];
  [key: string]: unknown;
}

export interface InvestigationStoryStep {
  time: string;
  title: string;
  description: string;
  severity: Severity;
  iconType: 'usb' | 'file' | 'copy' | 'exe' | 'delete' | 'user';
  evidenceId?: string;
  eventId?: string;
}

export interface UploadSimulationStep {
  step: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'VIEWER';

export interface AuditLogItem {
  id: string;
  action: string;
  userEmail: string;
  userRole: UserRole;
  caseId?: string;
  objectType?: string;
  objectId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'WARNING';
  ipAddress: string;
  createdAt: string;
  timeFormatted: string;
}

export interface CaseActivityItem {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  timeFormatted: string;
  result: string;
  description: string;
  objectType?: string;
  objectId?: string;
}

export interface EvidenceGapItem {
  id: string;
  caseId: string;
  title: string;
  gapType: 'missing_telemetry' | 'weak_support' | 'unexplained_timeline_gap' | 'missing_expected_evidence' | 'low_confidence_correlation';
  severity: Severity;
  confidence: ConfidenceLevel;
  whyItMatters: string;
  suggestedStep: string;
  relatedFindingId?: string;
  relatedEventId?: string;
  isResolved: boolean;
  createdAt?: string;
}

export interface ExplainabilityTraceItem {
  id: string;
  category: 'Finding' | 'Anomaly' | 'Activity Cluster' | 'Topological Relationship';
  targetTitle: string;
  inputEvidence: string;
  analysisRule: string;
  detectedPattern: string;
  result: string;
  confidence: ConfidenceLevel | string;
  confidenceReason?: string;
  whySuspicious?: string;
  recommendedCheck?: string;
}

export interface UserManagementItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  badgeNumber?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface CaseComparisonItem {
  caseA: {
    id: string;
    caseNumber: string;
    name: string;
    targetSystem: string;
    riskScore: number;
    severity: Severity;
    evidenceCount: number;
    timelineCount: number;
    findingsCount: number;
    criticalFindings: number;
    anomaliesCount: number;
    correlationsCount: number;
    fileTypes: Record<string, number>;
    integrity: { verified: number; compromised: number; status: string };
  };
  caseB: {
    id: string;
    caseNumber: string;
    name: string;
    targetSystem: string;
    riskScore: number;
    severity: Severity;
    evidenceCount: number;
    timelineCount: number;
    findingsCount: number;
    criticalFindings: number;
    anomaliesCount: number;
    correlationsCount: number;
    fileTypes: Record<string, number>;
    integrity: { verified: number; compromised: number; status: string };
  };
  deltas: {
    riskScoreDelta: number;
    evidenceCountDelta: number;
    timelineCountDelta: number;
    findingsCountDelta: number;
    anomaliesCountDelta: number;
  };
  insights: string[];
}

export interface ReportItem {
  id: string;
  caseId: string;
  title: string;
  reportType: string;
  status: 'Ready' | 'Generating' | 'Failed';
  generatedAt: string;
  fileSize: string;
  classification: string;
  reportHash?: string;
  reportVersion?: string;
  verifiedAt?: string;
  filePath?: string;
}

export interface TargetComputer {
  id: string;
  name: string;
  os: string;
  status: string;
  collectionMode?: string;
  collection_mode?: string;
  collectionType?: string;
  collection_type?: string;
  lastSeen?: string;
  last_seen?: string;
  agentVersion?: string;
  agent_version?: string;
  isDemo?: boolean;
  is_demo?: boolean;
  isAdmin?: boolean;
  is_admin?: boolean;
}

export interface InvestigationStage {
  id: string;
  name: string;
  status: 'completed' | 'scanning' | 'queued' | 'unavailable';
  artifactsCount?: number;
  artifacts_count?: number;
  description: string;
}

export interface CorrelatedInvestigationFinding {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'High' | 'Medium' | 'Low' | 'Critical';
  category: string;
  whySuspicious?: string;
  why_suspicious?: string;
  relatedEvents?: string[];
  related_events?: string[];
  is_live_agent?: boolean;
  metadata?: {
    user?: string;
    fileName?: string;
    file_name?: string;
    filePath?: string;
    file_path?: string;
    action?: string;
    process?: string;
    sha256?: string;
    baseline_sha256?: string;
    integrityStatus?: string;
    integrity_status?: string;
    deviceName?: string;
    device_name?: string;
    serialNumber?: string;
    serial_number?: string;
    mountPoint?: string;
    mount_point?: string;
    sizeBytes?: number;
    pdf_diff_available?: boolean;
    diff_data?: any;
    [key: string]: any;
  };
}



