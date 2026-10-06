import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  HardDrive,
  Clock,
  GitFork,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  LucideIcon,
  GitCompare,
  Sparkles,
  History
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  alert?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { investigator, logout, isTampered, userRole } = useApp();

  const navigationGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'INVESTIGATION',
      items: [
        { name: 'Cases', path: '/cases', icon: Briefcase },
        { name: 'Evidence', path: '/evidence', icon: HardDrive },
        { name: 'Timeline', path: '/timeline', icon: Clock },
        { name: 'Evidence Graph', path: '/graph', icon: GitFork },
        { name: 'Compare Cases', path: '/compare', icon: GitCompare },
      ],
    },
    {
      title: 'ANALYSIS',
      items: [
        { name: 'Findings', path: '/findings', icon: AlertTriangle, badge: '12' },
        { name: 'Risk Analysis', path: '/risk', icon: ShieldAlert, badge: '87' },
        { name: 'Explainability', path: '/explainability', icon: Sparkles },
        { 
          name: 'Integrity', 
          path: '/integrity', 
          icon: ShieldCheck, 
          alert: isTampered 
        },
      ],
    },
    {
      title: 'OUTPUT',
      items: [
        { name: 'Reports', path: '/reports', icon: FileText },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Audit Trail', path: '/audit', icon: History },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#080D15] border-r border-[#1E293B]/70 flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-[#1E293B]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tracking-wider text-[#F8FAFC]">
                TRACE<span className="text-blue-500">X</span>
              </span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] font-mono leading-none mt-0.5">
              DFIR Investigation
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h5 className="px-3 text-[10px] font-mono font-semibold tracking-wider text-[#475569] uppercase">
              {group.title}
            </h5>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 font-semibold border border-blue-500/25 shadow-sm'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0E1522]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-[#162032] text-[#94A3B8] border border-[#1E293B]/60">
                        {item.badge}
                      </span>
                    )}
                    {item.alert && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    )}
                  </div>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Investigator Profile Footer */}
      <div className="p-4 border-t border-[#1E293B]/60 bg-[#060A10]">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1017] border border-[#1E293B]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-xs font-mono font-bold text-blue-300">
                AV
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0B1017]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                {investigator.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-[#64748B] truncate">
                  {investigator.badge}
                </span>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  userRole === 'ADMIN'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                    : userRole === 'INVESTIGATOR'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                }`}>
                  {userRole}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
