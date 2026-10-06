import { FindingItem } from '../types';

export const INITIAL_FINDINGS: FindingItem[] = [
  {
    id: 'find-001',
    title: 'Suspicious Executable Detected',
    severity: 'CRITICAL',
    timestamp: '09:50 AM',
    relatedFile: 'suspicious.exe',
    evidenceId: 'ev-003',
    riskContribution: 20,
    summary: 'An unsigned, high-entropy PE binary executed from a user-writable Temp directory without standard corporate certificate verification.',
    suspiciousReasons: [
      'Unknown executable binary with no valid digital signature',
      'Executed immediately after sensitive intellectual property access',
      'Followed directly by mass file deletion and shadow copy destruction'
    ],
    mitreTechnique: 'T1204.002 (User Execution: Malicious File) & T1070 (Indicator Removal)',
    recommendedAction: 'Quarantine binary host, pull memory dump for unpack analysis, and revoke workstation token.',
    status: 'Confirmed'
  },
  {
    id: 'find-002',
    title: 'Sensitive File Access & Data Exfiltration Target',
    severity: 'CRITICAL',
    timestamp: '09:47 AM',
    relatedFile: 'confidential.pdf',
    evidenceId: 'ev-001',
    riskContribution: 20,
    summary: 'Direct read access opened on high-classification proprietary blueprints shortly after removable storage insertion.',
    suspiciousReasons: [
      'Access occurred outside normal operational schedule',
      'File was subsequently transferred directly to external USB mount point',
      'Original metadata exhibits signs of copy staging'
    ],
    mitreTechnique: 'T1005 (Data from Local System) & T1052.001 (Exfiltration over USB)',
    recommendedAction: 'Review file classification controls, assess scope of exposed patent IP, and verify USB physical custody.',
    status: 'Confirmed'
  },
  {
    id: 'find-003',
    title: 'External USB Device Activity Correlated',
    severity: 'HIGH',
    timestamp: '09:45 AM',
    relatedFile: 'usb_activity.log',
    evidenceId: 'ev-007',
    riskContribution: 15,
    summary: 'An unauthorized Kingston DataTraveler 3.0 flash drive was connected to the primary workstation port.',
    suspiciousReasons: [
      'Device serial is not registered in the corporate hardware inventory whitelist',
      'Connection directly preceded file copy and malware staging events',
      'Device was unmounted right before session logoff'
    ],
    mitreTechnique: 'T1200 (Hardware Additions)',
    recommendedAction: 'Enforce Group Policy USB endpoint lockouts and request physical handover of device serial 001A4D5978C1.',
    status: 'Flagged'
  },
  {
    id: 'find-005',
    title: 'Sensitive File Copied to Removable Volume',
    severity: 'CRITICAL',
    timestamp: '09:48 AM',
    relatedFile: 'confidential.pdf',
    evidenceId: 'ev-001',
    riskContribution: 20,
    summary: 'Correlated NTFS journal and volume writes prove byte-level duplicate creation on mount point E:\\.',
    suspiciousReasons: [
      'File copy executed immediately following file read handle',
      'Destination resides on non-encrypted FAT32 volume',
      'No secondary DLP authorization was requested or granted'
    ],
    mitreTechnique: 'T1567 (Exfiltration Over Web Service / Physical)',
    recommendedAction: 'Coordinate with legal and incident response leads for data breach notification assessment.',
    status: 'Confirmed'
  },
  {
    id: 'find-004',
    title: 'Mass File Deletion & Anti-Forensics Activity',
    severity: 'HIGH',
    timestamp: '09:55 AM',
    relatedFile: 'system.log',
    evidenceId: 'ev-005',
    riskContribution: 12,
    summary: 'Automated batch deletion purged 42 files across Document directories along with intentional clearing of Windows Security event log.',
    suspiciousReasons: [
      'Volume Shadow Copies forcibly cleared via vssadmin commands',
      'Security event log Event ID 1102 (Log Cleared) emitted',
      'Deletions occurred within 5 minutes of sensitive file exfiltration'
    ],
    mitreTechnique: 'T1070.001 (Indicator Removal: Clear Event Logs) & T1485 (Data Destruction)',
    recommendedAction: 'Attempt file carving and shadow copy block reconstruction using raw disk image.',
    status: 'Confirmed'
  }
];
