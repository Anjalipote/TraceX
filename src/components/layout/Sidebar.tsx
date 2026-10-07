import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Clock,
  AlertTriangle,
  GitFork,
  HardDrive,
  ShieldCheck,
  FileText,
  Settings,
  Shield,
  LogOut,
  LucideIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  alert?: boolean;
}

export const Sidebar: React.FC = () => {
  const { investigator, logout, isTampered, userRole } = useApp();

  const mainNavigation: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Forensic Access', path: '/forensic-access', icon: Search },
    { name: 'Timeline', path: '/timeline', icon: Clock },
    { name: 'Findings', path: '/findings', icon: AlertTriangle, badge: '5' },
    { name: 'Connections', path: '/graph', icon: GitFork },
    { name: 'Evidence', path: '/evidence', icon: HardDrive },
    { name: 'Integrity', path: '/integrity', icon: ShieldCheck, alert: isTampered },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-[#181B2C] border-r border-[#262B45] flex flex-col h-screen fixed left-0 top-0 z-40 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-[#262B45]/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wide text-white">
                Trace<span className="text-indigo-400">X</span>
              </span>
            </div>
            <p className="text-[10px] text-[#8E97B4] font-medium leading-none mt-0.5">
              Forensic Investigation
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
        {mainNavigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#20253C]'
              }`
            }
          >
            <div className="flex items-center gap-3 truncate">
              <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              <span className="truncate">{item.name}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-[#252A42] text-indigo-300">
                  {item.badge}
                </span>
              )}
              {item.alert && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
          </NavLink>
        ))}
      </div>

      {/* Settings at Bottom */}
      <div className="px-3.5 pb-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
              isActive
                ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#20253C]'
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </NavLink>
      </div>

      {/* Investigator Profile Footer */}
      <div className="p-3.5 border-t border-[#262B45] bg-[#141624]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#1C2034] border border-[#2A304D]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                A
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#1C2034]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Admin
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-[#8E97B4] truncate">
                  Investigator
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#8E97B4] hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
