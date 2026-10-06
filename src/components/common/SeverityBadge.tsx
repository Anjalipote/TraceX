import React from 'react';
import { Severity } from '../../types';
import { getSeverityBadgeStyles } from '../../utils/formatters';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showDot = true
}) => {
  const styles = getSeverityBadgeStyles(severity);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-wider font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} animate-pulse`} />
      )}
      {severity}
    </span>
  );
};
