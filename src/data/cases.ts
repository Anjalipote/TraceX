import { CaseItem } from '../types';

export const INITIAL_CASES: CaseItem[] = [
  {
    id: 'CASE-2026-001',
    name: 'Unauthorized Data Access Investigation',
    investigator: 'Specialist Alex Vance (Badge #4092)',
    status: 'Active',
    evidenceCount: 128,
    timelineEventCount: 286,
    riskScore: 87,
    severity: 'CRITICAL',
    createdAt: '05 Oct 2026 08:30 UTC',
    description: 'Investigation into unauthorized exfiltration of proprietary engineering schematics and customer financial records via removable storage followed by anti-forensic wiper execution.',
    targetSystem: 'WORKSTATION-CORP-FIN09 (Windows 11 Enterprise)',
    tags: ['Data Exfiltration', 'USB Artifact', 'Anti-Forensics', 'Privilege Abuse']
  },
  {
    id: 'CASE-2026-002',
    name: 'Insider Activity Investigation',
    investigator: 'Senior Investigator Elena Rostova',
    status: 'Closed',
    evidenceCount: 76,
    timelineEventCount: 142,
    riskScore: 42,
    severity: 'MEDIUM',
    createdAt: '02 Oct 2026 14:15 UTC',
    description: 'Post-termination insider review concerning anomalous cloud storage downloads during off-duty hours. Determined as legitimate authorized handover.',
    targetSystem: 'DEV-SRV-NORTH-04 (Ubuntu Server 22.04)',
    tags: ['Insider Threat', 'Cloud Audit', 'Closed']
  },
  {
    id: 'CASE-2026-003',
    name: 'Ransomware Perimeter Breach',
    investigator: 'Specialist Alex Vance (Badge #4092)',
    status: 'Under Review',
    evidenceCount: 94,
    timelineEventCount: 310,
    riskScore: 68,
    severity: 'HIGH',
    createdAt: '28 Sep 2026 19:40 UTC',
    description: 'Phishing artifact triage and credential stuffing alerts targeting VPN gateways. Lateral movement halted at DMZ segment.',
    targetSystem: 'GATEWAY-VPN-02 (Fortinet Appliance)',
    tags: ['Network Intrusion', 'Credential Access', 'Triage']
  }
];
