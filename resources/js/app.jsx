import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Header from './components/Header';
import LogInputPanel from './components/LogInputPanel';
import TriageReportPanel from './components/TriageReportPanel';
import AuditTrailPanel from './components/AuditTrailPanel';
import PythonModal from './components/PythonModal';
import ToastContainer from './components/ToastContainer';
import { SAMPLE_LOGS } from './data/sampleLogs';
import { TRIAGE_TEMPLATES, generateDynamicReportFromLogs } from './data/triageTemplates';
import {
    checkOllamaConnection,
    parseLogEvents,
    filterLogEvents,
    loadServerLogFile,
    runTriage
} from './services/ollamaService';

export default function App() {
    // Execution Mode: Defaults to false (Live Gemma 3) when Ollama is running
    const [dryRun, setDryRun] = useState(false);

    // Ollama status
    const [ollamaStatus, setOllamaStatus] = useState({ connected: false, modelFound: false, url: null });
    const [checkingOllama, setCheckingOllama] = useState(false);

    // Python Modal
    const [pythonModalOpen, setPythonModalOpen] = useState(false);

    // Toast Notifications
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((toast) => {
        const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Audit Trail State (execution.log records)
    const [auditEntries, setAuditEntries] = useState([
        {
            id: 'audit-1',
            timestamp: new Date().toLocaleTimeString(),
            stage: '[INIT]',
            message: 'LogGuard AI initialized v2.4 Local (Dark Navy Theme)',
        },
        {
            id: 'audit-2',
            timestamp: new Date().toLocaleTimeString(),
            stage: '[CHECK]',
            message: 'Testing local Ollama service at http://localhost:11434 (target: gemma3:4b)',
        },
        {
            id: 'audit-3',
            timestamp: new Date().toLocaleTimeString(),
            stage: '[FILE]',
            message: 'Loaded default preset: C:\\TrainAi\\Iconect\\storage\\logs\\laravel.log',
        },
        {
            id: 'audit-4',
            timestamp: new Date().toLocaleTimeString(),
            stage: '[PARSE]',
            message: 'Extracted log events and associated multiline exception stack traces',
        },
        {
            id: 'audit-5',
            timestamp: new Date().toLocaleTimeString(),
            stage: '[FILTER]',
            message: 'Initial filter active: ERROR, CRITICAL, WARNING, Exception',
        },
    ]);

    const logAuditEvent = useCallback((stage, message) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        setAuditEntries((prev) => [
            ...prev,
            {
                id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                timestamp: timeStr,
                stage,
                message,
            },
        ]);
    }, []);

    // File input & Preset State
    const [filePath, setFilePath] = useState('C:\\TrainAi\\Iconect\\storage\\logs\\laravel.log');
    const [logContent, setLogContent] = useState(SAMPLE_LOGS.iconnect);
    const [activePreset, setActivePreset] = useState('iconnect');
    const [loadingFile, setLoadingFile] = useState(false);
    const [fileError, setFileError] = useState(null);

    // Filters: ERROR, CRITICAL, WARNING, Exception (all enabled by default)
    const [activeFilters, setActiveFilters] = useState(['ERROR', 'CRITICAL', 'WARNING', 'Exception']);

    // 24/7 Auto-Watch Polling State
    const [autoWatch, setAutoWatch] = useState(false);
    const [autoTriageOnError, setAutoTriageOnError] = useState(true);

    // Triage report state
    const [reportData, setReportData] = useState(() => TRIAGE_TEMPLATES.iconnect);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [isAutoTriagingActive, setIsAutoTriagingActive] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

    // Parse events from raw text
    const parsedEvents = useMemo(() => {
        return parseLogEvents(logContent);
    }, [logContent]);

    // Filter events by severity
    const filteredEvents = useMemo(() => {
        return filterLogEvents(parsedEvents, activeFilters);
    }, [parsedEvents, activeFilters]);

    // Statistics: Logs Parsed & Alerts (Real dynamic calculation)
    const stats = useMemo(() => {
        const totalLines = logContent ? logContent.split('\n').filter((l) => l.trim().length > 0).length : 0;
        const alertsCount = parsedEvents.filter(
            (e) => e.level === 'ERROR' || e.level === 'CRITICAL'
        ).length;

        return {
            logsParsed: totalLines,
            alertsCount: alertsCount,
            engine: 'gemma3:4b',
        };
    }, [logContent, parsedEvents]);

    // Ollama connectivity probe
    const pingOllama = useCallback(async () => {
        setCheckingOllama(true);
        try {
            const res = await checkOllamaConnection();
            setOllamaStatus({
                connected: res.connected,
                modelFound: res.modelFound,
                url: res.url,
            });

            if (res.connected) {
                logAuditEvent(
                    '[CHECK]',
                    `Ollama connection verified at ${res.url || 'http://localhost:11434'} (Gemma 3: ${
                        res.modelFound ? 'Installed' : 'Model not found'
                    })`
                );
                addToast({
                    type: 'success',
                    title: 'Ollama Connected',
                    message: `Local Ollama is online. Target model: gemma3:4b`,
                });
            } else {
                logAuditEvent('[CHECK]', `Ollama offline or unreachable on http://localhost:11434`);
            }
        } catch (err) {
            setOllamaStatus({ connected: false, modelFound: false, url: null });
            logAuditEvent('[ERROR]', `Ollama check failed: ${err.message}`);
        } finally {
            setCheckingOllama(false);
        }
    }, [addToast, logAuditEvent]);

    useEffect(() => {
        pingOllama();
    }, [pingOllama]);

    // References for bulletproof 24/7 log watching
    const lastTotalLinesRef = useRef(null);
    const lastLogTailRef = useRef('');
    const isAutoTriagingRef = useRef(false);

    // 24/7 Continuous Background Log Watcher
    useEffect(() => {
        if (!autoWatch) {
            lastTotalLinesRef.current = null;
            lastLogTailRef.current = '';
            return;
        }

        logAuditEvent('[WATCH]', `24/7 Continuous Watcher started on ${filePath} (polling every 5s)`);
        addToast({
            type: 'info',
            title: '24/7 Watcher Active',
            message: `Continuously monitoring ${filePath} every 5s`,
        });

        const intervalId = setInterval(async () => {
            try {
                const res = await loadServerLogFile(filePath);
                if (!res || !res.content) return;

                const currentTotal = res.totalLines || 0;
                const currentTail = res.content.slice(-250);

                // Initialize baseline on first poll
                if (lastTotalLinesRef.current === null) {
                    lastTotalLinesRef.current = currentTotal;
                    lastLogTailRef.current = currentTail;
                    return;
                }

                const linesAdded = currentTotal - lastTotalLinesRef.current;
                const tailChanged = currentTail !== lastLogTailRef.current;

                if (linesAdded > 0 || tailChanged) {
                    lastTotalLinesRef.current = currentTotal;
                    lastLogTailRef.current = currentTail;

                    // Update UI log buffer
                    setLogContent(res.content);

                    logAuditEvent(
                        '[WATCH]',
                        `Detected ${linesAdded > 0 ? `+${linesAdded}` : 'new'} log activity in ${filePath}`
                    );
                    addToast({
                        type: 'warning',
                        title: 'New Log Activity',
                        message: `Detected ${linesAdded > 0 ? `+${linesAdded}` : 'new'} line(s) in target log`,
                    });

                    // Auto-Triage if enabled and not already running
                    const parsed = parseLogEvents(res.content);
                    const errorEvents = parsed.filter(e => e.level === 'ERROR' || e.level === 'CRITICAL' || e.isException);
                    if (errorEvents.length > 0 && autoTriageOnError && !isAutoTriagingRef.current) {
                        isAutoTriagingRef.current = true;
                        setIsAutoTriagingActive(true);
                        setLoadingAnalysis(true); // Visually triggers the loading skeleton and timer in the UI

                        logAuditEvent(
                            '[AI]',
                            '⚡ Auto-Triage: Anomalies detected in incoming logs. Dispatching to Gemma 3...'
                        );

                        addToast({
                            type: 'warning',
                            title: '⚡ Auto-Triage Triggered',
                            message: 'Incoming incident detected. Gemma 3 is actively triaging...',
                        });

                        // Isolate ONLY the newest incident to completely eliminate hallucinations from old historical logs
                        const newestIncident = errorEvents.slice(-1)[0].rawLines.join('\n');

                        runTriage({
                            logText: newestIncident,
                            dryRun,
                        })
                            .then((aiRes) => {
                                if (aiRes && aiRes.data) {
                                    setReportData(aiRes.data);
                                    logAuditEvent(
                                        '[REPORT]',
                                        'Auto-Triage complete: Gemma 3 updated incident report'
                                    );
                                    addToast({
                                        type: 'success',
                                        title: 'Auto-Triage Complete',
                                        message: 'Gemma 3 generated updated incident report.',
                                    });
                                } else {
                                    const dynamicReport = generateDynamicReportFromLogs(
                                        parseLogEvents(res.content),
                                        res.content
                                    );
                                    setReportData({
                                        ...dynamicReport,
                                        is_simulated: true,
                                    });
                                    logAuditEvent(
                                        '[REPORT]',
                                        'Auto-Triage complete: Incident report updated from latest logs'
                                    );
                                }
                            })
                            .catch((err) => {
                                logAuditEvent(
                                    '[ERROR]',
                                    `Auto-Triage failed: ${err.message}`
                                );
                            })
                            .finally(() => {
                                isAutoTriagingRef.current = false;
                                setIsAutoTriagingActive(false);
                                setLoadingAnalysis(false); // Reset loading state
                            });
                    }
                }
            } catch {
                // Ignore transient read errors during continuous polling
            }
        }, 5000);

        return () => {
            clearInterval(intervalId);
            logAuditEvent('[WATCH]', '24/7 Continuous Watcher paused');
        };
    }, [autoWatch, filePath, logAuditEvent, addToast]);

    // Load server-side file by path
    const handleLoadFilePath = async (targetPath) => {
        if (!targetPath) return;
        setLoadingFile(true);
        setFileError(null);
        logAuditEvent('[FILE]', `Attempting to read file: ${targetPath}`);

        try {
            const res = await loadServerLogFile(targetPath);
            setFilePath(res.path || targetPath);
            setLogContent(res.content);
            setActivePreset(null);
            // Reset previous report so it doesn't show stale analysis from a previous project
            setReportData(null);
            logAuditEvent('[FILE]', `Successfully loaded ${res.path} (${res.totalLines} lines)`);
            logAuditEvent('[PARSE]', `Buffer populated with ${res.totalLines} lines`);
            addToast({
                type: 'success',
                title: 'Log File Loaded',
                message: `Loaded ${res.totalLines} lines from ${targetPath}. Ready for AI triage.`,
            });
        } catch (err) {
            // Check if user entered a preset path like Iconect laravel.log
            if (targetPath.toLowerCase().includes('iconect')) {
                setFilePath(targetPath);
                setLogContent(SAMPLE_LOGS.iconnect);
                setActivePreset('iconnect');
                logAuditEvent('[FILE]', `Loaded preset fallback for ${targetPath}`);
                addToast({
                    type: 'info',
                    title: 'Preset Buffer Loaded',
                    message: `Loaded IconNECT log data for ${targetPath}`,
                });
            } else {
                setFileError(err.message);
                logAuditEvent('[ERROR]', `Failed to read file: ${err.message}`);
                addToast({
                    type: 'error',
                    title: 'File Read Error',
                    message: err.message,
                });
            }
        } finally {
            setLoadingFile(false);
        }
    };

    // User selected browser file via file input
    const handleFileUploaded = (name, content) => {
        setFilePath(name);
        setLogContent(content);
        setActivePreset(null);
        setReportData(null); // Clear previous analysis
        setFileError(null);
        const linesCount = content.split('\n').length;
        logAuditEvent('[FILE]', `Loaded user-selected file: ${name} (${linesCount} lines)`);
        logAuditEvent('[PARSE]', `Extracted log events and stack traces`);
        addToast({
            type: 'success',
            title: 'File Imported',
            message: `Loaded ${linesCount} lines from ${name}`,
        });
    };

    // Select a quick preset
    const handleSelectPreset = (presetKey) => {
        setActivePreset(presetKey);
        setFileError(null);

        let pathLabel = 'C:\\TrainAi\\Iconect\\storage\\logs\\laravel.log';
        if (presetKey === 'nginx_error') pathLabel = '/var/log/nginx/error.log';
        if (presetKey === 'db_timeout') pathLabel = 'storage/logs/database-timeout.log';

        setFilePath(pathLabel);
        const content = SAMPLE_LOGS[presetKey] || '';
        setLogContent(content);

        // Preload matching structured template
        setReportData(TRIAGE_TEMPLATES[presetKey] || TRIAGE_TEMPLATES.iconnect);

        logAuditEvent('[FILE]', `Quick Preset activated: ${presetKey} (${pathLabel})`);
        logAuditEvent('[PARSE]', `Buffer populated with preset log events`);

        addToast({
            type: 'info',
            title: 'Preset Activated',
            message: `Loaded ${presetKey.replace('_', ' ').toUpperCase()}`,
        });
    };

    // Toggle severity filter
    const handleToggleFilter = (filterKey) => {
        setActiveFilters((prev) => {
            const next = prev.includes(filterKey)
                ? prev.filter((f) => f !== filterKey)
                : [...prev, filterKey];
            logAuditEvent('[FILTER]', `Active severity filters updated: ${next.join(', ')}`);
            return next;
        });
    };

    // Run AI Log Triage (Primary Action)
    const handleRunTriage = async () => {
        setLoadingAnalysis(true);
        setAnalysisError(null);

        // Send ONLY the newest single incident so Gemma 3 focuses exclusively on the latest outage
        const latestEvents = filteredEvents.slice(-1);
        const logTextToSend = (latestEvents.length > 0 ? latestEvents : filteredEvents)
            .map((e) => e.rawLines.join('\n'))
            .join('\n\n');

        logAuditEvent(
            '[AI]',
            `Initiating Gemma 3 (4B) log triage with ${filteredEvents.length} filtered log events (dry_run=${dryRun})`
        );

        try {
            const res = await runTriage({
                logText: logTextToSend || logContent,
                dryRun,
            });

            if (res.isSimulated || !res.data) {
                // Predefined simulation report matching active preset, or dynamic extraction from the user's project log
                const template = activePreset
                    ? (TRIAGE_TEMPLATES[activePreset] || TRIAGE_TEMPLATES.iconnect)
                    : generateDynamicReportFromLogs(filteredEvents, logContent);
                setReportData({
                    ...template,
                    is_simulated: true,
                });
                logAuditEvent('[REPORT]', `Dry-run simulated incident report generated for current log buffer`);
                logAuditEvent('[DONE]', `Triage completed (Simulation Mode)`);
            } else {
                setReportData({
                    ...res.data,
                    is_simulated: false,
                });
                logAuditEvent('[REPORT]', `Live Gemma 3 triage report successfully generated and validated`);
                logAuditEvent('[DONE]', `Triage analysis completed via Ollama`);
            }

            addToast({
                type: 'success',
                title: 'Log Triage Complete',
                message: dryRun
                    ? 'Generated simulated incident report.'
                    : 'Gemma 3 live incident report generated.',
            });
        } catch (err) {
            setAnalysisError(err.message || 'Failed to triage logs with Gemma 3.');
            logAuditEvent('[ERROR]', `AI Triage failed: ${err.message}`);
            addToast({
                type: 'critical',
                title: 'Triage Failed',
                message: err.message,
            });
        } finally {
            setLoadingAnalysis(false);
        }
    };

    // Audit Trail: Clear Viewer
    const handleClearAuditViewer = () => {
        setAuditEntries([]);
        addToast({
            type: 'info',
            title: 'Audit Viewer Cleared',
            message: 'Cleared visible audit trail viewer. Persistent execution.log preserved.',
        });
    };

    // Audit Trail: Refresh
    const handleRefreshAudit = () => {
        logAuditEvent('[REFRESH]', 'Refreshed audit trail entries from memory stream');
        addToast({
            type: 'info',
            title: 'Audit Trail Refreshed',
            message: 'Refreshed execution.log stream.',
        });
    };

    // Audit Trail: Export execution.log
    const handleExportExecutionLog = () => {
        const header = `# LogGuard AI — execution.log Export\n# Timestamp: ${new Date().toISOString()}\n# Total Records: ${auditEntries.length}\n# ------------------------------------------------------------\n\n`;
        const body = auditEntries
            .map((e) => `[${e.timestamp}] ${e.stage} ${e.message}`)
            .join('\n');

        const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `execution-${new Date().toISOString().slice(0, 10)}.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addToast({
            type: 'success',
            title: 'Log Exported',
            message: 'Downloaded execution.log file.',
        });
    };

    return (
        <div className="min-h-screen bg-[#080D1A] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#38BDF8] selection:text-[#080D1A]">
            {/* Top Navigation Header */}
            <Header
                stats={stats}
                dryRun={dryRun}
                setDryRun={setDryRun}
                ollamaStatus={ollamaStatus}
                checkingOllama={checkingOllama}
                onRefreshOllama={pingOllama}
                onOpenPythonModal={() => setPythonModalOpen(true)}
            />

            {/* Main Content Dashboard */}
            <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 lg:px-6 py-6">
                {/* 2-Column Grid: Left 48%, Right 52% on Desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-[48%_52%] gap-6 items-start">
                    {/* LEFT COLUMN: System Log Input & Tool Audit Trail */}
                    <div className="flex flex-col gap-6">
                        {/* PANEL 1: System Log Input & Smart Filter Buffer */}
                        <LogInputPanel
                            filePath={filePath}
                            setFilePath={setFilePath}
                            onLoadFilePath={handleLoadFilePath}
                            loadingFile={loadingFile}
                            fileError={fileError}
                            activePreset={activePreset}
                            onSelectPreset={handleSelectPreset}
                            activeFilters={activeFilters}
                            onToggleFilter={handleToggleFilter}
                            parsedEvents={parsedEvents}
                            filteredEvents={filteredEvents}
                            onFileUploaded={handleFileUploaded}
                            autoWatch={autoWatch}
                            setAutoWatch={setAutoWatch}
                        />

                        {/* PANEL 3: Tool Audit Trail / execution.log Viewer */}
                        <AuditTrailPanel
                            entries={auditEntries}
                            onClearViewer={handleClearAuditViewer}
                            onRefreshAudit={handleRefreshAudit}
                            onExportLog={handleExportExecutionLog}
                        />
                    </div>

                    {/* RIGHT COLUMN: Local Gemma 3 (4B) Incident Triage Report */}
                    <div className="flex flex-col gap-6">
                        <TriageReportPanel
                            reportData={reportData}
                            loading={loadingAnalysis}
                            isAutoTriagingActive={isAutoTriagingActive}
                            error={analysisError}
                            onRunTriage={handleRunTriage}
                            dryRun={dryRun}
                            setDryRun={setDryRun}
                            autoTriageOnError={autoTriageOnError}
                            setAutoTriageOnError={setAutoTriageOnError}
                        />
                    </div>
                </div>
            </main>

            {/* Local Python Server Modal */}
            <PythonModal
                isOpen={pythonModalOpen}
                onClose={() => setPythonModalOpen(false)}
            />

            {/* Toast Notifications Container */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}

// Mount React Root
const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
