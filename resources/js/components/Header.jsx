import React from 'react';
import {
    ShieldCheck,
    FileText,
    AlertTriangle,
    Cpu,
    Terminal,
    RefreshCw
} from 'lucide-react';

export default function Header({
    stats,
    dryRun,
    setDryRun,
    ollamaStatus,
    checkingOllama,
    onRefreshOllama,
    onOpenPythonModal,
}) {
    return (
        <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#080D1A]/95 border-b border-[#334155] px-4 lg:px-6 py-2.5 transition-colors">
            <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Left: Branding */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] shadow-sm shadow-[#38BDF8]/10">
                            <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC]">
                                    LogGuard <span className="text-[#38BDF8]">AI</span>
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#151F32] border border-[#334155] text-[#38BDF8]">
                                    v2.4 Local
                                </span>
                            </div>
                            <p className="text-[11px] text-[#94A3B8] hidden sm:block tracking-normal font-normal">
                                Local IT System Log Triage & Incident Analysis (Gemma 3)
                            </p>
                        </div>
                    </div>

                    {/* Small screen mobile engine badge */}
                    <div className="md:hidden flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0F172A] border border-[#334155] text-[#94A3B8]">
                            <Cpu className="w-3 h-3 text-[#38BDF8]" />
                            gemma3:4b
                        </span>
                    </div>
                </div>

                {/* Center: System Status Indicators */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center w-full md:w-auto">
                    {/* Stat 1: Logs Parsed */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0F172A] border border-[#334155] text-xs">
                        <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span className="text-[#94A3B8] text-[11px]">Logs Parsed:</span>
                        <span className="font-mono font-semibold text-[#F8FAFC]">
                            {stats.logsParsed.toLocaleString()}
                        </span>
                    </div>

                    {/* Stat 2: Alerts */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0F172A] border border-[#334155] text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[#94A3B8] text-[11px]">Alerts:</span>
                        <span className="font-mono font-semibold text-rose-400">
                            {stats.alertsCount}
                        </span>
                    </div>

                    {/* Stat 3: Engine */}
                    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0F172A] border border-[#334155] text-xs">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[#94A3B8] text-[11px]">Engine:</span>
                        <span className="font-mono font-semibold text-purple-300">gemma3:4b</span>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end w-full md:w-auto">
                    {/* Dry-Run Status Pill / Switch */}
                    <button
                        type="button"
                        onClick={() => setDryRun(!dryRun)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-all duration-150 cursor-pointer active:scale-95 ${
                            dryRun
                                ? 'bg-[#151F32] text-[#38BDF8] border-[#38BDF8]/50 shadow-xs'
                                : 'bg-[#0F172A] text-emerald-400 border-emerald-500/40 shadow-xs'
                        }`}
                        title="Toggle Dry-Run Simulation Mode"
                    >
                        <span
                            className={`w-2 h-2 rounded-full ${
                                dryRun ? 'bg-[#38BDF8]' : 'bg-emerald-400 animate-pulse'
                            }`}
                        />
                        <span>{dryRun ? 'Dry-Run: ON' : 'Dry-Run: OFF'}</span>
                    </button>

                    {/* Ollama Connection Indicator */}
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0F172A] border border-[#334155] text-xs cursor-pointer group"
                        onClick={onRefreshOllama}
                        title="Click to check Ollama connection (http://localhost:11434)"
                    >
                        {ollamaStatus.connected ? (
                            <>
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-medium text-emerald-400 hidden sm:inline">Online</span>
                            </>
                        ) : (
                            <>
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-medium text-amber-400 hidden sm:inline">Offline</span>
                            </>
                        )}
                        <RefreshCw
                            className={`w-3 h-3 text-[#94A3B8] group-hover:text-[#38BDF8] transition-colors ${
                                checkingOllama ? 'animate-spin text-[#38BDF8]' : ''
                            }`}
                        />
                    </div>

                    {/* Get Local Python Server Button */}
                    <button
                        type="button"
                        onClick={onOpenPythonModal}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] hover:border-[#38BDF8]/50 text-[#F8FAFC] hover:text-[#38BDF8] text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95"
                    >
                        <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span className="hidden sm:inline">Get Local Python Server</span>
                        <span className="sm:hidden">app.py</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
