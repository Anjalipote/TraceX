import { Node, Edge } from '@xyflow/react';
import { GraphNodeData } from '../types';

export const INITIAL_GRAPH_NODES: Node<GraphNodeData>[] = [
  {
    id: 'node-user-admin',
    type: 'forensicNode',
    position: { x: 380, y: 50 },
    data: {
      label: 'USER: ADMIN',
      subtitle: 'WORKSTATION-CORP\\Admin (Interactive Logon)',
      nodeType: 'user',
      risk: 'HIGH',
      timestamp: '09:40:12 AM',
      evidenceId: 'ev-005',
      relatedEvents: ['evt-001', 'evt-003', 'evt-004', 'evt-005', 'evt-006'],
      relatedFindings: ['find-001', 'find-002', 'find-003'],
      details: {
        'Account': 'Admin',
        'SID': 'S-1-5-21-392810-1001',
        'Logon Type': 'Type 2 (Interactive)',
        'Session Duration': '22 minutes'
      }
    }
  },
  {
    id: 'node-usb',
    type: 'forensicNode',
    position: { x: 100, y: 220 },
    data: {
      label: 'USB DEVICE',
      subtitle: 'Kingston DataTraveler 3.0 (Drive E:\\)',
      nodeType: 'device',
      risk: 'HIGH',
      timestamp: '09:45:10 AM',
      evidenceId: 'ev-007',
      relatedEvents: ['evt-003', 'evt-005'],
      relatedFindings: ['find-003', 'find-005'],
      details: {
        'Vendor ID': 'VID_0951',
        'Product ID': 'PID_1666',
        'Serial': '001A4D5978C1',
        'Mount Point': 'E:\\ (FAT32)'
      }
    }
  },
  {
    id: 'node-confidential-pdf',
    type: 'forensicNode',
    position: { x: 380, y: 240 },
    data: {
      label: 'confidential.pdf',
      subtitle: 'Classified Patent Blueprint (2.4 MB)',
      nodeType: 'file',
      risk: 'CRITICAL',
      timestamp: '09:47:18 AM',
      evidenceId: 'ev-001',
      relatedEvents: ['evt-004', 'evt-005'],
      relatedFindings: ['find-002', 'find-005'],
      details: {
        'Original Path': 'C:\\Users\\Admin\\Documents\\Classified\\confidential.pdf',
        'Copied Path': 'E:\\Backup\\confidential.pdf',
        'SHA-256': '8a3f7c92...d45e90',
        'Integrity': 'VERIFIED'
      }
    }
  },
  {
    id: 'node-employee-data',
    type: 'forensicNode',
    position: { x: 700, y: 220 },
    data: {
      label: 'employee_data.xlsx',
      subtitle: 'PII Records & Payroll (14.8 MB)',
      nodeType: 'file',
      risk: 'HIGH',
      timestamp: '09:44:02 AM',
      evidenceId: 'ev-002',
      relatedEvents: ['evt-002', 'evt-007'],
      relatedFindings: ['find-002'],
      details: {
        'Path': 'C:\\Users\\Admin\\HR_Exports\\employee_data.xlsx',
        'Record Count': '4,200 Rows',
        'Access Time': '09:44:02'
      }
    }
  },
  {
    id: 'node-suspicious-exe',
    type: 'forensicNode',
    position: { x: 380, y: 430 },
    data: {
      label: 'suspicious.exe',
      subtitle: 'Unsigned High-Entropy Binary (840 KB)',
      nodeType: 'executable',
      risk: 'CRITICAL',
      timestamp: '09:50:22 AM',
      evidenceId: 'ev-003',
      relatedEvents: ['evt-006', 'evt-008'],
      relatedFindings: ['find-001', 'find-004'],
      details: {
        'Dropped Path': 'AppData\\Local\\Temp\\suspicious.exe',
        'PID': '4892',
        'Signature': 'UNSIGNED / INVALID',
        'Parent Process': 'explorer.exe'
      }
    }
  },
  {
    id: 'node-filesystem',
    type: 'forensicNode',
    position: { x: 720, y: 430 },
    data: {
      label: 'FILE SYSTEM',
      subtitle: 'NTFS Volume C: & Registry Hives',
      nodeType: 'system',
      risk: 'MEDIUM',
      timestamp: '09:51:30 AM',
      evidenceId: 'ev-005',
      relatedEvents: ['evt-002', 'evt-007', 'evt-008'],
      relatedFindings: ['find-004'],
      details: {
        'Volume': 'Volume C:\\ ($MFT)',
        'Registry': 'SYSTEM, SOFTWARE, NTUSER.DAT',
        'USN Journal': 'Modified & truncated'
      }
    }
  },
  {
    id: 'node-file-deletion',
    type: 'forensicNode',
    position: { x: 380, y: 620 },
    data: {
      label: 'FILE DELETION EVENT',
      subtitle: '42 Files Unlinked + Shadow Copies Wiped',
      nodeType: 'event',
      risk: 'CRITICAL',
      timestamp: '09:55:04 AM',
      evidenceId: 'ev-005',
      relatedEvents: ['evt-008'],
      relatedFindings: ['find-004'],
      details: {
        'Deleted Target': '42 items in Documents & Temp',
        'VSS Command': 'vssadmin delete shadows /all /quiet',
        'Event Log': 'Security Log Cleared (Event 1102)'
      }
    }
  }
];

export const INITIAL_GRAPH_EDGES: Edge[] = [
  {
    id: 'edge-admin-usb',
    source: 'node-user-admin',
    target: 'node-usb',
    label: 'connected',
    animated: true,
    style: { stroke: '#F59E0B', strokeWidth: 2 }
  },
  {
    id: 'edge-admin-confidential',
    source: 'node-user-admin',
    target: 'node-confidential-pdf',
    label: 'accessed',
    animated: true,
    style: { stroke: '#EF4444', strokeWidth: 2 }
  },
  {
    id: 'edge-usb-confidential',
    source: 'node-usb',
    target: 'node-confidential-pdf',
    label: 'received copy',
    animated: true,
    style: { stroke: '#EF4444', strokeWidth: 2.5, strokeDasharray: '4 4' }
  },
  {
    id: 'edge-admin-employee',
    source: 'node-user-admin',
    target: 'node-employee-data',
    label: 'enumerated',
    style: { stroke: '#3B82F6', strokeWidth: 1.5 }
  },
  {
    id: 'edge-admin-suspicious',
    source: 'node-user-admin',
    target: 'node-suspicious-exe',
    label: 'executed',
    animated: true,
    style: { stroke: '#EF4444', strokeWidth: 2.5 }
  },
  {
    id: 'edge-suspicious-filesystem',
    source: 'node-suspicious-exe',
    target: 'node-filesystem',
    label: 'tampered registry',
    style: { stroke: '#F59E0B', strokeWidth: 2 }
  },
  {
    id: 'edge-suspicious-deletion',
    source: 'node-suspicious-exe',
    target: 'node-file-deletion',
    label: 'followed by',
    animated: true,
    style: { stroke: '#EF4444', strokeWidth: 2.5 }
  }
];
