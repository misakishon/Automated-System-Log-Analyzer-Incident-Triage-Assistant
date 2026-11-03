import React, { useState, useEffect } from 'react';
import {
    BrainCircuit,
    Play,
    Copy,
    Check,
    Terminal,
    AlertOctagon,
    AlertTriangle,
    CheckCircle2,
    Layers,
    ShieldAlert,
    Cpu,
    RefreshCw,
    Zap
} from 'lucide-react';

export default function TriageReportPanel({
    reportData,
    loading,
    isAutoTriagingActive = false,
    error,
    onRunTriage,
    dryRun,
    setDryRun,
    autoTriageOnError,
    setAutoTriageOnError,
}) {
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Live execution timer while loading
    useEffect(() => {
        let timer = null;
        if (loading) {
            setElapsedSeconds(0);
            timer = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [loading]);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Safe array normalizer to prevent .map crashes if LLM returns a string or object
    const toArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            return val.includes(',') ? val.split(',').map((s) => s.trim()) : [val.trim()];
        }
        if (typeof val === 'object') return Object.values(val);
        return [String(val)];
    };

    const affectedComponents = toArray(reportData?.affected_components);
    const remediationSteps = toArray(reportData?.remediation_steps);
    const verificationCommands = toArray(reportData?.verification_commands);

    const getSeverityBadge = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
                return 'bg-rose-500/15 text-rose-400 border-rose-500/40 ring-1 ring-rose-500/20';
            case 'HIGH':
                return 'bg-orange-500/15 text-orange-400 border-orange-500/40 ring-1 ring-orange-500/20';
            case 'MEDIUM':
                return 'bg-amber-500/15 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/20';
            case 'LOW':
            default:
                return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/20';
        }
    };

    return (
        <section className="rounded-2xl bg-[#0F172A] border border-[#334155] p-5 shadow-lg flex flex-col gap-5 relative transition-all duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div>
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-[#38BDF8]" />
                        <h2 className="text-base font-semibold text-[#F8FAFC] tracking-tight">
                            Local Gemma 3 (4B) Incident Triage Report
                        </h2>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                        AI-powered log triage and remediation guidance using Gemma 3 (4B) via local Ollama.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-[#0B1220] border border-[#334155] text-purple-300">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        gemma3:4b
                    </span>
                </div>
            </div>

            {/* Live Auto-Triage Progress Banner */}
            {loading && isAutoTriagingActive && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-sky-500/15 to-purple-500/15 border border-amber-500/40 text-xs text-[#F8FAFC] flex items-center justify-between shadow-lg shadow-amber-500/5 animate-pulse">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                            <Zap className="w-4 h-4 animate-bounce text-amber-400" />
                        </div>
                        <div>
                            <span className="font-bold text-amber-300 block text-xs">
                                ⚡ Auto-Triage Active: Analyzing Incoming Incident
                            </span>
                            <span className="text-[11px] text-[#94A3B8]">
                                Gemma 3 (4B) is isolating the newest error and generating remediation steps...
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span className="font-mono font-bold text-amber-300 text-xs bg-[#0B1220] px-2.5 py-1 rounded border border-amber-500/30">
                            {elapsedSeconds}s
                        </span>
                    </div>
                </div>
            )}

            {/* A. Primary Action & B. Dry-Run Checkbox Row */}
            <div className="flex flex-wrap items-center gap-3 bg-[#0B1220] p-3 rounded-xl border border-[#334155]">
                {/* One Primary Button: Run AI Log Triage */}
                <button
                    type="button"
                    disabled={loading}
                    onClick={onRunTriage}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#38BDF8] hover:from-[#1D4ED8] hover:to-[#0284C7] text-[#080D1A] font-bold text-xs tracking-wide shadow-md shadow-sky-500/15 hover:shadow-sky-500/25 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#080D1A]" />
                            <span>
                                {isAutoTriagingActive ? '⚡ Auto-Triaging...' : 'Triaging with Gemma 3...'} ({elapsedSeconds}s)
                            </span>
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 fill-current text-[#080D1A]" />
                            <span>Run AI Log Triage</span>
                        </>
                    )}
                </button>

                {/* Dry-Run Checkbox beside button */}
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] text-xs font-mono text-[#F8FAFC] cursor-pointer select-none transition-colors">
                    <input
                        type="checkbox"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-[#0B1220] border-[#334155] text-[#38BDF8] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-[#38BDF8]">--dry-run</span>
                    <span className="text-[10px] text-[#94A3B8] hidden md:inline">
                        (Simulated)
                    </span>
                </label>

                {/* Auto-Triage on Error Checkbox with Dynamic Loading State */}
                <label
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono cursor-pointer select-none transition-all duration-200 ${
                        isAutoTriagingActive
                            ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/30 text-amber-200 shadow-lg shadow-amber-500/10 animate-pulse'
                            : 'bg-[#151F32] hover:bg-[#1E293B] border-[#334155] text-[#F8FAFC]'
                    }`}
                >
                    <input
                        type="checkbox"
                        checked={autoTriageOnError}
                        onChange={(e) => setAutoTriageOnError(e.target.checked)}
                        className="w-3.5 h-3.5 rounded bg-[#0B1220] border-[#334155] text-[#38BDF8] focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <Zap className={`w-3.5 h-3.5 ${isAutoTriagingActive ? 'animate-bounce text-amber-300' : 'text-amber-400'}`} />
                        Auto-Triage
                    </span>

                    {isAutoTriagingActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/25 border border-amber-500/40 text-amber-200 font-bold text-[11px]">
                            <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                            <span>Triaging... ({elapsedSeconds}s)</span>
                        </span>
                    ) : (
                        <span className="text-[10px] text-[#94A3B8] hidden sm:inline">
                            (On New Errors)
                        </span>
                    )}
                </label>

                {/* Status Indicator */}
                <div className="ml-auto flex items-center gap-2 text-[11px] text-[#94A3B8]">
                    {reportData?.is_simulated ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono text-[10px]">
                            [SIMULATION REPORT]
                        </span>
                    ) : reportData ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            [LIVE GEMMA 3 ANALYSIS]
                        </span>
                    ) : null}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <span className="font-semibold block text-rose-200">Local Ollama Inference Error</span>
                        <p className="text-[11px] text-rose-300/90 leading-relaxed">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
                <div className="space-y-4 py-4 animate-pulse">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-[#334155]">
                        <span className="text-xs font-mono text-[#38BDF8] flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
                            Gemma 3 (4B) is analyzing the newest incident...
                        </span>
                        <span className="font-mono text-xs text-[#94A3B8]">{elapsedSeconds}s elapsed</span>
                    </div>
                    <div className="h-5 bg-[#151F32] rounded w-1/3" />
                    <div className="h-16 bg-[#0B1220] rounded-xl border border-[#334155]" />
                    <div className="h-5 bg-[#151F32] rounded w-1/4" />
                    <div className="h-24 bg-[#0B1220] rounded-xl border border-[#334155]" />
                </div>
            ) : reportData ? (
                <div className="space-y-4">
                    {/* 1. Root Cause Identified */}
                    <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#38BDF8] uppercase tracking-wider">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Root Cause Identified</span>
                        </div>
                        <p className="text-xs text-[#F8FAFC] leading-relaxed font-normal">
                            {reportData.root_cause || 'No root cause detected.'}
                        </p>
                    </div>

                    {/* 2. Affected Component & 3. Severity Level Side-by-Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Affected Components */}
                        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                                <Layers className="w-3.5 h-3.5" />
                                <span>Affected Component</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {affectedComponents.length > 0 ? (
                                    affectedComponents.map((comp, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-[#151F32] text-[#F8FAFC] border border-[#334155]"
                                        >
                                            {comp}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-[#94A3B8]">None specified</span>
                                )}
                            </div>
                        </div>

                        {/* Severity Level */}
                        <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#334155] space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Severity Level
                                </span>
                                <span
                                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getSeverityBadge(
                                        reportData.severity
                                    )}`}
                                >
                                    {reportData.severity || 'MEDIUM'}
                                </span>
                            </div>
                            <p className="text-[11px] text-[#94A3B8] leading-snug pt-1">
                                {reportData.severity_reason || 'Severity based on exception impact and service availability.'}
                            </p>
                        </div>
                    </div>

                    {/* 4. Exact Remediation Steps */}
                    <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#334155] space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Exact Remediation Steps</span>
                        </div>
                        <div className="space-y-2 pt-1">
                            {remediationSteps.length > 0 ? (
                                remediationSteps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2.5 rounded-lg bg-[#080D1A]/70 border border-[#334155]/60 text-xs text-[#F8FAFC] leading-relaxed flex items-start gap-2"
                                    >
                                        <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                                        <div className="space-y-0.5">
                                            <span>{step}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-[#94A3B8]">No steps generated.</span>
                            )}
                        </div>
                    </div>

                    {/* D. CLI / Verification Commands */}
                    <div className="rounded-xl bg-[#0B1220] border border-[#334155] p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#38BDF8] uppercase tracking-wider">
                                <Terminal className="w-3.5 h-3.5" />
                                <span>Verification / CLI Commands</span>
                            </div>
                            <span className="text-[10px] text-[#94A3B8] italic">
                                *Recommendations only; not executed automatically.
                            </span>
                        </div>

                        <div className="space-y-2 pt-1">
                            {verificationCommands.length > 0 ? (
                                verificationCommands.map((cmd, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-lg bg-[#080D1A] border border-[#334155] p-2 flex items-center justify-between gap-2 font-mono text-xs text-[#38BDF8]"
                                    >
                                        <code className="overflow-x-auto whitespace-pre text-xs text-[#38BDF8] select-all">
                                            {cmd}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(cmd, idx)}
                                            className="shrink-0 text-[#94A3B8] hover:text-[#F8FAFC] p-1 rounded hover:bg-[#151F32] transition-colors cursor-pointer"
                                            title="Copy command"
                                        >
                                            {copiedIndex === idx ? (
                                                <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-sans">
                                                    <Check className="w-3 h-3" /> Copied
                                                </span>
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-[#94A3B8]">No verification commands available.</span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-12 text-center rounded-xl bg-[#0B1220] border border-[#334155] text-xs text-[#94A3B8] space-y-2">
                    <p>Click "Run AI Log Triage" to generate incident analysis using Gemma 3 (4B).</p>
                </div>
            )}
        </section>
    );
}
