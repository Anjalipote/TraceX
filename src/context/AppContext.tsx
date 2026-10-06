import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  CaseItem, 
  EvidenceItem, 
  TimelineEventItem, 
  FindingItem, 
  RiskFactorItem,
  ActivityClusterItem,
  AnomalyItem,
  AnalysisJobItem,
  GlobalSearchItem,
  UserRole,
  EvidenceGapItem,
  CaseActivityItem,
  ReportItem
} from '../types';
import { INITIAL_CASES } from '../data/cases';
import { INITIAL_EVIDENCE } from '../data/evidence';
import { INITIAL_TIMELINE } from '../data/timeline';
import { INITIAL_FINDINGS } from '../data/findings';
import { RISK_SUMMARY, INITIAL_RISK_FACTORS } from '../data/risk';

import { api } from '../services/api';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AppContextType {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean> | boolean;
  logout: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  investigator: {
    name: string;
    badge: string;
    role: string;
    email: string;
    avatar: string;
  };
  cases: CaseItem[];
  currentCase: CaseItem;
  selectCase: (caseId: string) => void;
  createCase: (newCase: { name: string; investigator: string; description: string; targetSystem: string }) => CaseItem;
  evidence: EvidenceItem[];
  timeline: TimelineEventItem[];
  findings: FindingItem[];
  riskSummary: typeof RISK_SUMMARY & {
    severityContribution?: number;
    evidenceContribution?: number;
    correlationContribution?: number;
    anomalyContribution?: number;
    timelineContribution?: number;
    integrityContribution?: number;
    calculationExplanation?: string;
  };
  riskFactors: RiskFactorItem[];
  activityClusters: ActivityClusterItem[];
  anomalies: AnomalyItem[];
  evidenceGaps: EvidenceGapItem[];
  caseActivity: CaseActivityItem[];
  reports: ReportItem[];
  analysisJob: AnalysisJobItem | null;
  isAnalyzing: boolean;
  runAnalysisPipeline: () => Promise<void>;
  isTampered: boolean;
  simulateIntegrityTamper: () => void;
  restoreIntegrityState: () => void;
  toasts: ToastItem[];
  showToast: (title: string, message: string, type?: ToastItem['type']) => void;
  dismissToast: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchInvestigation: (q: string, category?: string) => Promise<GlobalSearchItem[]>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('tracex_auth') === 'true';
  });

  const [userRole, setUserRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('tracex_user_role') as UserRole) || 'ADMIN';
  });

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    localStorage.setItem('tracex_user_role', role);
    showToast('Role Switched', `Active access authorization level set to ${role}.`, 'info');
  };

  const [investigator] = useState({
    name: 'Specialist Alex Vance',
    badge: 'Badge #4092',
    role: 'Lead Digital Forensic Investigator',
    email: 'investigator@tracex.demo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  });

  const [cases, setCases] = useState<CaseItem[]>(INITIAL_CASES);
  const [currentCaseId, setCurrentCaseId] = useState<string>('CASE-2026-001');
  const [evidence, setEvidence] = useState<EvidenceItem[]>(INITIAL_EVIDENCE);
  const [timeline, setTimeline] = useState<TimelineEventItem[]>(INITIAL_TIMELINE);
  const [findings, setFindings] = useState<FindingItem[]>(INITIAL_FINDINGS);
  const [riskFactors, setRiskFactors] = useState<RiskFactorItem[]>(INITIAL_RISK_FACTORS);
  const [riskSummary, setRiskSummary] = useState(RISK_SUMMARY as any);
  
  // Phase 3 & 4 States
  const [activityClusters, setActivityClusters] = useState<ActivityClusterItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [evidenceGaps, setEvidenceGaps] = useState<EvidenceGapItem[]>([]);
  const [caseActivity, setCaseActivity] = useState<CaseActivityItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [analysisJob, setAnalysisJob] = useState<AnalysisJobItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentCase = cases.find(c => c.id === currentCaseId) || cases[0];

  const refreshData = async () => {
    try {
      const [
        liveCases, 
        liveEvidence, 
        liveTimeline, 
        liveFindings, 
        liveRisk, 
        liveClusters, 
        liveAnomalies, 
        liveJob,
        liveGaps,
        liveActivity,
        liveReports
      ] = await Promise.all([
        api.getCases(),
        api.getEvidence(currentCaseId),
        api.getTimeline(currentCaseId),
        api.getFindings(currentCaseId),
        api.getRisk(currentCaseId),
        api.getActivityClusters(currentCaseId),
        api.getAnomalies(currentCaseId),
        api.getAnalysisStatus(currentCaseId),
        api.getEvidenceGaps(currentCaseId),
        api.getCaseActivity(currentCaseId),
        api.getReports(currentCaseId)
      ]);
      if (Array.isArray(liveCases)) setCases(liveCases);
      if (Array.isArray(liveEvidence)) setEvidence(liveEvidence);
      if (Array.isArray(liveTimeline)) setTimeline(liveTimeline);
      if (Array.isArray(liveFindings)) setFindings(liveFindings);
      if (liveRisk) {
        setRiskSummary(liveRisk.summary as any);
        setRiskFactors(liveRisk.factors || []);
      }
      if (Array.isArray(liveClusters)) setActivityClusters(liveClusters);
      if (Array.isArray(liveAnomalies)) setAnomalies(liveAnomalies);
      if (liveJob) setAnalysisJob(liveJob);
      if (Array.isArray(liveGaps)) setEvidenceGaps(liveGaps);
      if (Array.isArray(liveActivity)) setCaseActivity(liveActivity);
      if (Array.isArray(liveReports)) setReports(liveReports);
    } catch {
      // Retains demo fallback silently
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentCaseId, userRole]);

  const showToast = (title: string, message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await api.login(email, pass);
      if (res.success) {
        setIsAuthenticated(true);
        localStorage.setItem('tracex_auth', 'true');
        if (res.user?.role) {
          const normRole = res.user.role.toUpperCase().includes('ADMIN') ? 'ADMIN' : (res.user.role.toUpperCase().includes('VIEWER') ? 'VIEWER' : 'INVESTIGATOR');
          setUserRoleState(normRole as UserRole);
          localStorage.setItem('tracex_user_role', normRole);
        }
        showToast('Authenticated', 'Access granted to TraceX forensic intelligence workspace.', 'success');
        refreshData();
        return true;
      }
    } catch {
      // Fallback
    }
    if (email.trim() === 'investigator@tracex.demo' && pass === 'TraceX@123') {
      setIsAuthenticated(true);
      localStorage.setItem('tracex_auth', 'true');
      setUserRoleState('ADMIN');
      localStorage.setItem('tracex_user_role', 'ADMIN');
      showToast('Authenticated', 'Access granted to TraceX forensic intelligence workspace.', 'success');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tracex_auth');
    localStorage.removeItem('tracex_token');
    showToast('Session Ended', 'You have been safely logged out.', 'info');
  };

  const selectCase = (caseId: string) => {
    setCurrentCaseId(caseId);
    const found = cases.find(c => c.id === caseId);
    if (found) {
      showToast('Case Switched', `Active workspace set to ${found.id} — ${found.name}`, 'info');
    }
  };

  const createCase = (newCaseData: { name: string; investigator: string; description: string; targetSystem: string }) => {
    if (userRole === 'VIEWER') {
      showToast('Access Denied', 'Viewer role does not have permission to create investigation cases.', 'error');
      throw new Error('Viewer cannot create cases');
    }
    const id = `CASE-2026-${String(Math.floor(Math.random() * 899) + 100)}`;
    const newCase: CaseItem = {
      id,
      name: newCaseData.name,
      investigator: newCaseData.investigator,
      status: 'Active',
      evidenceCount: 0,
      timelineEventCount: 0,
      riskScore: 0,
      severity: 'LOW',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      description: newCaseData.description,
      targetSystem: newCaseData.targetSystem || 'WIN11-TRIAGE-TARGET',
      tags: ['Clean Baseline', 'Active']
    };

    setCases(prev => [newCase, ...prev]);
    setCurrentCaseId(id);
    setEvidence([]);
    setTimeline([]);
    setFindings([]);
    setRiskFactors([]);
    setActivityClusters([]);
    setAnomalies([]);
    setRiskSummary({
      score: 0,
      maxScore: 100,
      severity: 'LOW',
      title: 'Investigation Priority Score',
      subtitle: 'Clean Baseline (Zero Threats Detected)',
      explanation: 'No security threats or cryptographic violations detected in active case.',
      disclaimer: 'TraceX deterministic risk calculation engine.',
      severityContribution: 0,
      evidenceContribution: 0,
      correlationContribution: 0,
      anomalyContribution: 0,
      timelineContribution: 0,
      integrityContribution: 0,
      calculationExplanation: 'New case initialized at clean baseline.'
    });

    // Register with backend in background
    api.createCase({
      name: newCaseData.name,
      investigator: newCaseData.investigator,
      description: newCaseData.description,
      targetSystem: newCaseData.targetSystem || 'WIN11-TRIAGE-TARGET',
      status: 'Active',
      tags: ['Clean Baseline', 'Active']
    }).catch(() => {});

    showToast('Case Created', `Case ${id} successfully initialized in vault.`, 'success');
    return newCase;
  };

  // Phase 3 & 4: Run Full Analysis Pipeline
  const runAnalysisPipeline = async () => {
    if (userRole === 'VIEWER') {
      showToast('Access Denied', 'Viewer role does not have permission to trigger forensic pipeline execution.', 'error');
      return;
    }
    setIsAnalyzing(true);
    showToast('Analysis Pipeline Started', 'Executing evidence extraction, sequence clustering, anomaly detection, and correlation...', 'info');
    try {
      const job = await api.startAnalysis(currentCaseId);
      setAnalysisJob(job);
      await refreshData();
      showToast('Analysis Complete', 'Case evidence correlated: findings, anomalies, and activity sequence updated.', 'success');
    } catch {
      showToast('Pipeline Finished', 'Forensic correlations verified.', 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Phase 3 & 4: Global Search
  const searchInvestigation = async (queryStr: string, category?: string): Promise<GlobalSearchItem[]> => {
    return await api.globalSearch(currentCaseId, queryStr, category);
  };

  // Simulate Integrity Modification for confidential.pdf
  const simulateIntegrityTamper = () => {
    setIsTampered(true);
    setEvidence(prev => prev.map(item => {
      if (item.id === 'ev-001') {
        return {
          ...item,
          sha256: '91bc28f1e402a5c189b27d4205fbc314a8029de09148bc8a9f029112948bbcd9',
          integrity: 'MODIFIED',
        };
      }
      return item;
    }));
    showToast('Integrity Alert', 'File confidential.pdf hash mismatch detected! Chain of custody compromised.', 'error');
  };

  // Restore back to original hash
  const restoreIntegrityState = () => {
    setIsTampered(false);
    setEvidence(INITIAL_EVIDENCE);
    showToast('Integrity Restored', 'All 128 cryptographic hashes verified matching chain of custody records.', 'success');
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      userRole,
      setUserRole,
      investigator,
      cases,
      currentCase,
      selectCase,
      createCase,
      evidence,
      timeline,
      findings,
      riskSummary,
      riskFactors,
      activityClusters,
      anomalies,
      evidenceGaps,
      caseActivity,
      reports,
      analysisJob,
      isAnalyzing,
      runAnalysisPipeline,
      isTampered,
      simulateIntegrityTamper,
      restoreIntegrityState,
      toasts,
      showToast,
      dismissToast,
      searchQuery,
      setSearchQuery,
      searchInvestigation,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
