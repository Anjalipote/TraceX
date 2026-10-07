import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ArrowRight, 
  Terminal, 
  Cpu, 
  Lock, 
  Layers, 
  Sparkles,
  GitFork,
  FileCheck
} from 'lucide-react';
import { Forensic3DCanvas } from '../components/intro/Forensic3DCanvas';

export const IntroPage: React.FC = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  const handleEnterTraceX = () => {
    if (isExiting) return;
    setIsExiting(true);
    // Smooth transition into TraceX dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 420);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070A0F] text-[#F8FAFC] flex flex-col justify-between overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* 3D Forensic Canvas Visual Background */}
      <Forensic3DCanvas isExiting={isExiting} />

      {/* Cybernetic Grid & Ambient Fog Overlay */}
      <div className="absolute inset-0 forensic-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070A0F]/85 via-transparent to-[#070A0F]/95 pointer-events-none" />

      {/* Glowing Ambient Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-r from-blue-600/15 via-cyan-500/15 to-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-[450px] h-[250px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Exit Transition Overlay */}
      <div 
        className={`fixed inset-0 bg-[#070A0F] z-50 pointer-events-none transition-opacity duration-500 ease-out ${
          isExiting ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top Navigation Bar / System Telemetry */}
      <header className={`relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-[#1D2939]/40 backdrop-blur-md bg-[#070A0F]/40 transition-all duration-500 ${
        isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-500/30 text-blue-400 shadow-forensic">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-300">
              TRACEX LABS
            </span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
              // v2.4.0-SEC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D131C]/80 border border-[#1D2939] text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>FORENSIC ENGINE ACTIVE</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D131C]/80 border border-[#1D2939] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>FIPS 140-3 READY</span>
          </div>

          <button
            onClick={handleEnterTraceX}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* Main Center Stage */}
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-10 max-w-5xl mx-auto text-center transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {/* Forensic Badge & Security Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-950/40 border border-blue-500/30 text-blue-300 backdrop-blur-md mb-8 shadow-forensic animate-pulse-slow">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest font-semibold text-cyan-300">
            Investigation Intelligence Platform
          </span>
        </div>

        {/* Hero Forensic Emblem */}
        <div className="relative mb-6 group cursor-default">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 via-cyan-500/30 to-indigo-600/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-700" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#0B1017] border border-cyan-500/40 flex items-center justify-center shadow-2xl">
            <div className="relative flex items-center justify-center">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 transition-transform duration-500 group-hover:scale-105" />
              <Terminal className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200 absolute opacity-90" />
            </div>
          </div>
        </div>

        {/* Prominent Name: TRACEX */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-mono tracking-tight text-white mb-4 drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] select-none">
          <span>TRACE</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.55)]">
            X
          </span>
        </h1>

        {/* Short One-Line Description */}
        <p className="text-lg sm:text-xl md:text-2xl font-normal text-slate-300 tracking-wide max-w-3xl mb-8 leading-relaxed font-sans">
          AI-Powered Digital Forensics &amp; Investigation Intelligence
        </p>

        {/* Forensic Capabilities Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 max-w-2xl">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D131C]/80 border border-[#1D2939] text-slate-300 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Neural Correlation</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D131C]/80 border border-[#1D2939] text-slate-300 text-xs font-mono">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cryptographic Hash Audit</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D131C]/80 border border-[#1D2939] text-slate-300 text-xs font-mono">
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            <span>Evidence Graph Lattice</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D131C]/80 border border-[#1D2939] text-slate-300 text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Timeline Anomaly Detection</span>
          </div>
        </div>

        {/* Primary CTA Button: ENTER TRACEX → */}
        <div className="relative group">
          {/* Subtle outer glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 rounded-2xl blur-md opacity-60 group-hover:opacity-100 group-hover:blur-lg transition duration-300" />

          <button
            onClick={handleEnterTraceX}
            className="relative flex items-center justify-center gap-3.5 px-8 sm:px-10 py-4 sm:py-5 rounded-xl bg-gradient-to-r from-[#0B1528] via-[#0D1F38] to-[#0A1A2E] hover:from-[#0E1E38] hover:to-[#0D223E] border-2 border-cyan-400/50 hover:border-cyan-300 text-white font-mono font-bold text-base sm:text-lg tracking-wider shadow-2xl hover:shadow-forensic-cyan transition-all duration-300 transform group-hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="tracking-widest uppercase">ENTER TRACEX</span>
            <span className="text-cyan-400 text-xl font-bold transition-transform duration-300 group-hover:translate-x-2">
              →
            </span>
          </button>
        </div>

        {/* Access Notice */}
        <p className="text-xs text-slate-500 font-mono mt-5 tracking-wide">
          Direct secure access to digital forensic cases, evidence pipelines &amp; analytics
        </p>
      </main>

      {/* Bottom Footer Telemetry */}
      <footer className={`relative z-10 w-full px-6 py-4 border-t border-[#1D2939]/40 backdrop-blur-md bg-[#070A0F]/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 transition-all duration-500 ${
        isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            EVIDENCE INTEGRITY GUARANTEED
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-slate-500">ISO/IEC 27037 COMPLIANT</span>
        </div>

        <div className="text-slate-500 text-[11px] text-center sm:text-right">
          TRACEX INTELLIGENCE ENVIRONMENT © 2026
        </div>
      </footer>
    </div>
  );
};
