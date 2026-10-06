import React from 'react';
import { Severity } from '../../types';

interface RiskBadgeProps {
  score: number;
  maxScore?: number;
  severity?: Severity;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  maxScore = 100,
  severity,
  size = 'md'
}) => {
  const calculatedSeverity: Severity = severity || (
    score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW'
  );

  const colors = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
    HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    MEDIUM: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  }[calculatedSeverity];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 font-mono rounded border ${colors} ${sizeClasses}`}>
      <span className="font-semibold">{score}</span>
      <span className="opacity-50">/{maxScore}</span>
    </span>
  );
};
