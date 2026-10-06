import { RiskFactorItem, Severity } from '../types';

export const RISK_SUMMARY = {
  score: 87,
  maxScore: 100,
  severity: 'CRITICAL' as Severity,
  title: 'Investigation Risk Score',
  subtitle: 'Investigation Priority Level: Urgent (High Confidence Correlation)',
  explanation: 'A potentially suspicious sequence was detected involving external-device activity, access to sensitive evidence, execution of an unidentified executable, and subsequent file deletion.',
  disclaimer: 'This score represents investigative correlation priority and forensic triage urgency. It does NOT assert legal guilt or probability of criminal offense.'
};

export const INITIAL_RISK_FACTORS: RiskFactorItem[] = [
  {
    id: 'risk-usb',
    title: 'USB Activity',
    contribution: 15,
    severity: 'HIGH',
    category: 'Hardware & Storage',
    description: 'Unauthorized Kingston DataTraveler 3.0 mounted at 09:45:10, establishing a writable exfiltration channel prior to sensitive file operations.',
    evidenceIds: ['ev-007'],
    eventIds: ['evt-003'],
    mitreTactic: 'Initial Access / Physical Hardware'
  },
  {
    id: 'risk-sensitive',
    title: 'Sensitive File Access',
    contribution: 20,
    severity: 'CRITICAL',
    category: 'Object Access',
    description: 'Read access opened on classified document confidential.pdf (92/100 sensitivity) within 2 minutes of removable device registration.',
    evidenceIds: ['ev-001'],
    eventIds: ['evt-004'],
    mitreTactic: 'Collection'
  },
  {
    id: 'risk-copy',
    title: 'File Copy',
    contribution: 20,
    severity: 'CRITICAL',
    category: 'Data Exfiltration',
    description: 'NTFS USN journal confirms replication of confidential.pdf onto drive letter E:\\ (USB mount point) at 09:48:42.',
    evidenceIds: ['ev-001', 'ev-007'],
    eventIds: ['evt-005'],
    mitreTactic: 'Exfiltration'
  },
  {
    id: 'risk-exe',
    title: 'Unknown Executable',
    contribution: 20,
    severity: 'CRITICAL',
    category: 'Execution',
    description: 'Unsigned binary suspicious.exe spawned from %TEMP% directory with elevated privileges at 09:50:22, triggering suspicious memory hooks.',
    evidenceIds: ['ev-003'],
    eventIds: ['evt-006'],
    mitreTactic: 'Execution / Defense Evasion'
  },
  {
    id: 'risk-deletion',
    title: 'Mass File Deletion',
    contribution: 12,
    severity: 'HIGH',
    category: 'Anti-Forensics',
    description: 'Execution of automated file unlinking and Volume Shadow Copy purging at 09:55:04, destroying evidence and clearing security event log.',
    evidenceIds: ['ev-005'],
    eventIds: ['evt-008'],
    mitreTactic: 'Impact / Defiance'
  }
];
