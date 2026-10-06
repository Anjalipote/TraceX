import React from 'react';
import { Loader2, Shield } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Correlating digital artifacts...',
  submessage = 'Parsing filesystem journals and cryptographic digests'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-[#0D131C] border border-[#1D2939]">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <Shield className="w-5 h-5 text-blue-400 absolute" />
      </div>
      <p className="text-sm font-semibold text-[#F8FAFC] font-mono">
        {message}
      </p>
      <p className="text-xs text-[#94A3B8] mt-1 max-w-sm">
        {submessage}
      </p>
    </div>
  );
};
