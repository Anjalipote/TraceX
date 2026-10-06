import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Fingerprint, Terminal, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useApp();

  const [email, setEmail] = useState('investigator@tracex.demo');
  const [password, setPassword] = useState('TraceX@123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      setIsLoading(false);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid forensic credentials. Use demo: investigator@tracex.demo / TraceX@123');
      }
    } catch {
      setIsLoading(false);
      setError('Connection error occurred. Please verify credentials.');
    }
  };

  const handleFillDemo = () => {
    setEmail('investigator@tracex.demo');
    setPassword('TraceX@123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-[#F8FAFC] flex flex-col justify-center items-center p-6 relative overflow-hidden forensic-grid">
      {/* Subtle animated scanline & glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070A0F] via-transparent to-[#070A0F]/80 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none -top-40 -left-40 animate-pulse-slow" />
      <div className="absolute w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20 animate-pulse-slow" />

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl bg-[#0D131C]/90 backdrop-blur-xl border border-[#1D2939] p-8 shadow-2xl space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-950/60 border border-blue-500/40 text-blue-400 shadow-forensic mb-2">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black font-mono tracking-wider text-[#F8FAFC]">
              TRACE<span className="text-blue-500">X</span>
            </h1>
            <p className="text-xs font-mono text-[#94A3B8] tracking-widest uppercase">
              &quot;From Digital Evidence to Investigation Story&quot;
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-[#94A3B8] block">
                Investigator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@tracex.demo"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-medium text-[#94A3B8] block">
                  Vault Passphrase
                </label>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[11px] font-mono text-blue-400 hover:text-blue-300 underline"
                >
                  Auto-fill Demo
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070A0F] border border-[#1D2939] text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-forensic disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Fingerprint className="w-4 h-4 animate-spin text-blue-200" />
                    <span>VERIFYING CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Footer Helper */}
          <div className="pt-3 border-t border-[#1D2939] text-center space-y-1">
            <span className="text-[11px] font-mono text-[#64748B] block">
              DEMO CREDENTIALS:
            </span>
            <div className="inline-flex items-center gap-3 font-mono text-xs text-[#94A3B8] bg-[#070A0F] px-3 py-1.5 rounded-lg border border-[#1D2939]">
              <span>investigator@tracex.demo</span>
              <span className="text-[#64748B]">•</span>
              <span>TraceX@123</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-[11px] font-mono text-[#64748B]">
          TraceX Forensic Platform • Phase 1 MVP • Authorized Law Enforcement & DFIR
        </p>
      </div>
    </div>
  );
};
