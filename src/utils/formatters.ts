import { Severity, IntegrityStatus } from '../types';

export function getSeverityBadgeStyles(severity: Severity): {
  bg: string;
  text: string;
  border: string;
  glow?: string;
  dot: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-950/40',
        text: 'text-red-400',
        border: 'border-red-800/60',
        glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
        dot: 'bg-red-500',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        border: 'border-amber-800/60',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        dot: 'bg-amber-500',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-cyan-950/40',
        text: 'text-cyan-400',
        border: 'border-cyan-800/60',
        dot: 'bg-cyan-500',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-slate-800/50',
        text: 'text-slate-300',
        border: 'border-slate-700/60',
        dot: 'bg-slate-400',
      };
  }
}

export function getIntegrityBadgeStyles(status: IntegrityStatus): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (status) {
    case 'VERIFIED':
      return {
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400',
        border: 'border-emerald-800/60',
        icon: '✓',
      };
    case 'MODIFIED':
      return {
        bg: 'bg-red-950/50',
        text: 'text-red-400',
        border: 'border-red-600/80',
        icon: '⚠',
      };
    case 'CORRUPTED':
      return {
        bg: 'bg-rose-950/50',
        text: 'text-rose-400',
        border: 'border-rose-700/80',
        icon: '✖',
      };
    case 'UNVERIFIED':
    default:
      return {
        bg: 'bg-slate-800/40',
        text: 'text-slate-400',
        border: 'border-slate-700/60',
        icon: '?',
      };
  }
}

export function truncateHash(hash: string, start = 8, end = 8): string {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  return Promise.resolve(false);
}
