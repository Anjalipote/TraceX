import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
          error: <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
        }[toast.type];

        const borderColors = {
          success: 'border-emerald-500/30 bg-[#0D131C]',
          warning: 'border-amber-500/30 bg-[#0D131C]',
          error: 'border-red-500/40 bg-[#0D131C]',
          info: 'border-blue-500/30 bg-[#0D131C]',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-2 ${borderColors}`}
          >
            {icons}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[#F8FAFC]">
                {toast.title}
              </h4>
              <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#1D2939]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
