import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'critical' | 'warning' | 'cyan' | 'success';
  trend?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  badge,
  onClick
}) => {
  const borderVariants = {
    default: 'border-[#1E293B]/70 hover:border-blue-500/50 bg-[#0B1017]',
    critical: 'border-red-900/40 hover:border-red-500/50 bg-gradient-to-b from-[#0B1017] to-red-950/15',
    warning: 'border-amber-900/40 hover:border-amber-500/50 bg-gradient-to-b from-[#0B1017] to-amber-950/15',
    cyan: 'border-cyan-900/40 hover:border-cyan-500/50 bg-gradient-to-b from-[#0B1017] to-cyan-950/15',
    success: 'border-emerald-900/40 hover:border-emerald-500/50 bg-gradient-to-b from-[#0B1017] to-emerald-950/15',
  }[variant];

  const iconColors = {
    default: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl p-5 border transition-all duration-200 shadow-lg ${borderVariants} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-mono font-medium tracking-wider text-[#94A3B8] uppercase truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-2xl font-bold tracking-tight text-[#F8FAFC] font-mono">
              {value}
            </h3>
            {badge}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl border ${iconColors} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center justify-between text-xs text-[#94A3B8] border-t border-[#1E293B]/50 pt-2.5">
          <span className="truncate text-[11px] font-medium text-[#64748B]">{subtitle}</span>
          {trend && (
            <span className="font-mono text-[11px] text-blue-400 flex items-center gap-0.5 shrink-0">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
