import React, { useRef, useState } from 'react';
import {
    FileText,
    FolderOpen,
    Filter,
    Server,
    Database,
    AlertOctagon,
    RefreshCw,
    Check
} from 'lucide-react';

export default function LogInputPanel({
    filePath,
    setFilePath,
    onLoadFilePath,
    loadingFile,
    fileError,
    activePreset,
    onSelectPreset,
    activeFilters,
    onToggleFilter,
    parsedEvents,
    filteredEvents,
    onFileUploaded,
    autoWatch,
    setAutoWatch,
}) {
    const fileInputRef = useRef(null);
    const [pathInputValue, setPathInputValue] = useState(filePath);

    // Sync input with prop if it changes externally
    React.useEffect(() => {
        setPathInputValue(filePath);
    }, [filePath]);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onLoadFilePath(pathInputValue);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === 'string') {
                onFileUploaded(file.name, content);
            }
        };
        reader.readAsText(file);
    };

    const getSeverityBadgeClass = (level) => {
        switch (level?.toUpperCase()) {
            case 'CRITICAL':
                return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
            case 'ERROR':
                return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
            case 'WARNING':
            case 'WARN':
                return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            default:
                return 'text-[#38BDF8] bg-sky-500/10 border-sky-500/30';
        }
    };

    const filters = [
        { key: 'ERROR', label: 'ERROR', colorClass: 'border-orange-500/40 text-orange-400' },
        { key: 'CRITICAL', label: 'CRITICAL', colorClass: 'border-rose-500/40 text-rose-400' },
        { key: 'WARNING', label: 'WARNING', colorClass: 'border-amber-500/40 text-amber-400' },
        { key: 'Exception', label: 'Exception', colorClass: 'border-purple-500/40 text-purple-400' },
    ];

    return (
        <section className="rounded-2xl bg-[#0F172A] border border-[#334155] p-5 shadow-lg flex flex-col gap-4 relative transition-all duration-200">
            {/* Header with 24/7 Watcher Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                        <h2 className="text-base font-semibold text-[#F8FAFC] tracking-tight">
                            System Log Input & Smart Filter Buffer
                        </h2>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                        Load a system/application log, apply severity filters, and review the filtered log buffer for AI triage.
                    </p>
                </div>

                {/* 24/7 Live Watcher Toggle */}
                <button
                    type="button"
                    onClick={() => setAutoWatch(!autoWatch)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all duration-150 cursor-pointer self-start sm:self-auto ${
                        autoWatch
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20'
                            : 'bg-[#0B1220] text-[#94A3B8] border-[#334155] hover:text-[#F8FAFC]'
                    }`}
                    title="Polls the target log file every 5 seconds for 24/7 continuous analysis"
                >
                    <span className="relative flex h-2 w-2">
                        {autoWatch && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                                autoWatch ? 'bg-emerald-400' : 'bg-[#94A3B8]'
                            }`}
                        />
                    </span>
                    <span>{autoWatch ? '24/7 Watch: ACTIVE (5s)' : '24/7 Watch: OFF'}</span>
                </button>
            </div>

            {/* A. File Path Input Row */}
            <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full flex items-center">
                    <span className="absolute left-3 text-[#94A3B8]">
                        <FileText className="w-4 h-4 text-[#38BDF8]" />
                    </span>
                    <input
                        type="text"
                        value={pathInputValue}
                        onChange={(e) => setPathInputValue(e.target.value)}
                        placeholder="C:\TrainAi\Iconect\storage\logs\laravel.log"
                        className="w-full bg-[#0B1220] border border-[#334155] rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] placeholder-[#94A3B8]/50"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="submit"
                        disabled={loadingFile}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] hover:border-[#38BDF8]/50 text-xs font-medium text-[#F8FAFC] cursor-pointer active:scale-95 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#38BDF8] ${loadingFile ? 'animate-spin' : ''}`} />
                        <span>Load Path</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] hover:border-[#38BDF8]/50 text-xs font-medium text-[#F8FAFC] cursor-pointer active:scale-95 transition-colors"
                        title="Browse local files (.log, .txt, .json)"
                    >
                        <FolderOpen className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>Browse</span>
                    </button>
                </div>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".log,.txt,.json"
                    onChange={handleFileInputChange}
                    className="hidden"
                />
            </form>

            {/* Error Message if file failed to load */}
            {fileError && (
                <div className="px-3 py-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="leading-tight">{fileError}</span>
                </div>
            )}

            {/* B. Quick Load Presets */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#0B1220] p-2.5 rounded-lg border border-[#334155]">
                <span className="text-[11px] font-medium text-[#94A3B8]">Quick Load Presets:</span>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => onSelectPreset('iconnect')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                            activePreset === 'iconnect'
                                ? 'bg-[#2563EB]/25 text-[#38BDF8] border border-[#38BDF8]/50 shadow-xs'
                                : 'bg-[#151F32] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                        }`}
                    >
                        <Server className="w-3 h-3 text-[#38BDF8]" />
                        <span>IconNECT Laravel</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectPreset('nginx_error')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                            activePreset === 'nginx_error'
                                ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50 shadow-xs'
                                : 'bg-[#151F32] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                        }`}
                    >
                        <AlertOctagon className="w-3 h-3 text-orange-400" />
                        <span>Nginx Error</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelectPreset('db_timeout')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                            activePreset === 'db_timeout'
                                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-xs'
                                : 'bg-[#151F32] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155]'
                        }`}
                    >
                        <Database className="w-3 h-3 text-rose-400" />
                        <span>Database Timeout</span>
                    </button>
                </div>
            </div>

            {/* C. Smart Severity Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span className="text-xs font-medium text-[#F8FAFC]">Filter by Severity:</span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {filters.map((f) => {
                        const checked = activeFilters.includes(f.key);
                        return (
                            <label
                                key={f.key}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-medium cursor-pointer transition-all duration-150 select-none ${
                                    checked
                                        ? `bg-[#151F32] ${f.colorClass}`
                                        : 'bg-[#0B1220] text-[#94A3B8]/60 border-[#334155]/60 hover:text-[#94A3B8]'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onToggleFilter(f.key)}
                                    className="w-3 h-3 rounded bg-[#0B1220] border-[#334155] text-[#38BDF8] focus:ring-0 cursor-pointer"
                                />
                                <span>{f.label}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* D. Filtered Log Terminal */}
            <div className="rounded-xl bg-[#0B1220] border border-[#334155] overflow-hidden flex flex-col">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#151F32]/80 border-b border-[#334155] text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                        <span className="text-[11px] text-[#F8FAFC] ml-1 font-sans font-medium">
                            Filtered Log Buffer
                        </span>
                    </div>

                    <div className="text-[11px] text-[#38BDF8]">
                        Filtered: <span className="font-semibold">{filteredEvents.length}</span> events /{' '}
                        <span className="text-[#94A3B8]">{parsedEvents.length} total events</span>
                    </div>
                </div>

                {/* Terminal Body */}
                <div className="p-3 font-mono text-[11px] leading-relaxed max-h-[320px] min-h-[220px] overflow-y-auto overflow-x-auto custom-scrollbar space-y-2 select-text">
                    {filteredEvents.length === 0 ? (
                        <div className="text-center py-12 text-[#94A3B8] italic">
                            No log events match current severity filters. Select filters above to populate the buffer.
                        </div>
                    ) : (
                        filteredEvents.map((evt, idx) => (
                            <div
                                key={evt.id || idx}
                                className="p-2 rounded bg-[#080D1A]/60 border border-[#334155]/40 hover:border-[#38BDF8]/40 transition-colors"
                            >
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-[#94A3B8]/60 text-[10px] w-6 text-right select-none">
                                        #{evt.lineNum || idx + 1}
                                    </span>
                                    <span className="text-[#38BDF8] text-[10px]">[{evt.timestamp}]</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getSeverityBadgeClass(
                                            evt.level
                                        )}`}
                                    >
                                        {evt.level}
                                    </span>
                                    {evt.isException && (
                                        <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                                            Exception
                                        </span>
                                    )}
                                    <span className="text-[#94A3B8] text-[10px]">({evt.channel})</span>
                                </div>

                                <div className="text-[#F8FAFC] break-words whitespace-pre-wrap pl-8">
                                    {evt.message}
                                </div>

                                {/* Multiline Stack Trace if present */}
                                {evt.stackTrace && evt.stackTrace.length > 0 && (
                                    <div className="mt-1.5 pl-8 pt-1.5 border-t border-[#334155]/40 text-[#94A3B8] text-[10px] space-y-0.5 whitespace-pre overflow-x-auto">
                                        {evt.stackTrace.map((stLine, stIdx) => (
                                            <div
                                                key={stIdx}
                                                className={
                                                    stLine.includes('vendor/laravel')
                                                        ? 'text-[#94A3B8]/60'
                                                        : 'text-amber-300/80'
                                                }
                                            >
                                                {stLine}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
