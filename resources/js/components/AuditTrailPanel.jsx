import React from 'react';
import {
    Activity,
    FileCode2,
    RefreshCw,
    Trash2,
    Download
} from 'lucide-react';

export default function AuditTrailPanel({
    entries,
    onClearViewer,
    onRefreshAudit,
    onExportLog,
}) {
    const getStageBadgeClass = (stage) => {
        switch (stage?.toUpperCase()) {
            case '[INIT]':
                return 'text-[#38BDF8] bg-sky-500/10 border-sky-500/30';
            case '[CHECK]':
                return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
            case '[FILE]':
                return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
            case '[PARSE]':
                return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
            case '[FILTER]':
                return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            case '[AI]':
                return 'text-purple-300 bg-purple-500/20 border-purple-500/40';
            case '[REPORT]':
                return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            case '[ERROR]':
                return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
            case '[DONE]':
                return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
            default:
                return 'text-[#94A3B8] bg-[#151F32] border-[#334155]';
        }
    };

    return (
        <section className="w-full rounded-2xl bg-[#0F172A] border border-[#334155] p-5 shadow-lg flex flex-col gap-4 relative transition-all duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#38BDF8]" />
                        <h2 className="text-base font-semibold text-[#F8FAFC] tracking-tight">
                            Tool Audit Trail / execution.log Viewer
                        </h2>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                        Internal execution logs for auditing, debugging, and traceability.
                    </p>
                </div>

                {/* Header Controls */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start sm:self-auto">
                    {/* execution.log indicator */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#0B1220] border border-[#334155] text-xs font-mono">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[#F8FAFC]">execution.log</span>
                        <span className="text-[#94A3B8] text-[10px] pl-1">
                            ({entries.length} entries)
                        </span>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={onRefreshAudit}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer active:scale-95"
                        title="Reload audit records"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Refresh</span>
                    </button>

                    {/* Export Log */}
                    <button
                        type="button"
                        onClick={onExportLog}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer active:scale-95"
                        title="Export execution.log file"
                    >
                        <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Export</span>
                    </button>

                    {/* Clear Button */}
                    <button
                        type="button"
                        onClick={onClearViewer}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#151F32] hover:bg-rose-950/40 border border-[#334155] hover:border-rose-500/40 text-xs text-[#94A3B8] hover:text-rose-300 transition-colors cursor-pointer active:scale-95"
                        title="Clear viewer entries without deleting file"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <div className="rounded-xl bg-[#0B1220] border border-[#334155] overflow-hidden">
                <div className="p-3 font-mono text-[11px] leading-relaxed max-h-[220px] min-h-[160px] overflow-y-auto custom-scrollbar space-y-1.5 select-text">
                    {entries.length === 0 ? (
                        <div className="text-center py-8 text-[#94A3B8] italic">
                            Viewer cleared. New system actions and AI operations will automatically stream here.
                        </div>
                    ) : (
                        entries.map((entry, idx) => (
                            <div
                                key={entry.id || idx}
                                className="flex items-start gap-2.5 hover:bg-[#151F32]/50 p-1 rounded transition-colors"
                            >
                                <span className="text-[#94A3B8]/60 text-[10px] w-6 shrink-0 select-none">
                                    {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <span className="text-[#94A3B8] text-[10px] shrink-0">
                                    {entry.timestamp}
                                </span>
                                <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${getStageBadgeClass(
                                        entry.stage
                                    )}`}
                                >
                                    {entry.stage}
                                </span>
                                <span className="text-[#F8FAFC] break-all">
                                    {entry.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
