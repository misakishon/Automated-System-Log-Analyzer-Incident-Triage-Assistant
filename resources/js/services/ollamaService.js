/**
 * Ollama & Python Bridge Service
 * Handles live model connectivity checking and incident triage inference with Gemma 3 (4B)
 */

export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const PYTHON_BRIDGE_URL = 'http://localhost:5000';
export const TARGET_MODEL = 'gemma3:4b';

/**
 * Parses raw log text into structured events, preserving multiline stack traces.
 */
export function parseLogEvents(rawText) {
    if (!rawText) return [];

    const lines = rawText.split('\n');
    const events = [];
    let currentEvent = null;

    const headerRegex = /^\[([^\]]+)\]\s+([a-zA-Z0-9_\-.]+)?(?:\.([A-Z]+))?:\s*(.*)$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(headerRegex);

        if (match) {
            if (currentEvent) {
                events.push(currentEvent);
            }

            const timestamp = match[1];
            const channel = match[2] || 'system';
            let level = (match[3] || 'INFO').toUpperCase();
            const message = match[4];
            let isException = /exception|throwable|error:/i.test(message);

            currentEvent = {
                id: `evt-${events.length + 1}`,
                lineNum: i + 1,
                timestamp,
                channel,
                level,
                isException,
                message,
                stackTrace: [],
                rawLines: [line],
            };
        } else if (currentEvent) {
            currentEvent.stackTrace.push(line);
            currentEvent.rawLines.push(line);
            if (/exception/i.test(line)) {
                currentEvent.isException = true;
            }
        } else {
            if (line.trim().length > 0) {
                events.push({
                    id: `evt-${events.length + 1}`,
                    lineNum: i + 1,
                    timestamp: 'N/A',
                    channel: 'system',
                    level: /error/i.test(line) ? 'ERROR' : /warn/i.test(line) ? 'WARNING' : 'INFO',
                    isException: /exception/i.test(line),
                    message: line,
                    stackTrace: [],
                    rawLines: [line],
                });
            }
        }
    }

    if (currentEvent) {
        events.push(currentEvent);
    }

    return events;
}

/**
 * Filter events based on active severity checkboxes: ERROR, CRITICAL, WARNING, Exception
 */
export function filterLogEvents(events, activeFilters) {
    if (!activeFilters || activeFilters.length === 0) return [];

    return events.filter((evt) => {
        const level = evt.level.toUpperCase();

        if (activeFilters.includes('CRITICAL') && level === 'CRITICAL') return true;
        if (activeFilters.includes('ERROR') && level === 'ERROR') return true;
        if (activeFilters.includes('WARNING') && (level === 'WARNING' || level === 'WARN')) return true;
        if (activeFilters.includes('Exception') && evt.isException) return true;

        return false;
    });
}

/**
 * Condenses log buffer to ONLY the newest incoming exception lines and application stack frames.
 * Traverses from bottom-to-top to ensure the AI analyzes ONLY the latest active incident,
 * preventing hallucinations or confusion from old historical errors.
 */
export function condenseLogForTriage(rawLogText, maxLength = 1200) {
    if (!rawLogText) return '';

    const lines = rawLogText.split('\n');
    const meaningfulLines = [];

    // Traverse from BOTTOM to TOP so we prioritize the absolute newest errors
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;

        // Skip verbose framework vendor traces
        if (trimmed.includes('/vendor/') || trimmed.includes('\\vendor\\') || trimmed.includes('node_modules')) {
            continue;
        }

        // Keep headers, errors, exceptions, and app-level files
        if (
            /error|critical|exception|failed|fatal|sqlstate|cannot|violation|deadlock|at\s+[a-zA-Z]/i.test(trimmed) ||
            trimmed.startsWith('[') ||
            trimmed.includes('app/') ||
            trimmed.includes('app\\')
        ) {
            meaningfulLines.unshift(trimmed); // Maintain chronological order of the newest incident
        }

        if (meaningfulLines.join('\n').length >= maxLength) {
            break;
        }
    }

    if (meaningfulLines.length === 0) {
        return rawLogText.slice(-maxLength);
    }

    return meaningfulLines.join('\n').slice(-maxLength);
}

/**
 * Ping Ollama through Laravel proxy, Python bridge, or direct local check.
 */
export async function checkOllamaConnection() {
    // 1. Try Laravel proxy endpoint (same-origin, guaranteed no CORS block)
    try {
        const laravelRes = await fetch('/api/ollama/status', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(2500),
        });
        if (laravelRes.ok) {
            const data = await laravelRes.json();
            return {
                connected: data.connected ?? true,
                modelFound: data.model_found ?? true,
                source: 'laravel_proxy',
                availableModels: data.available_models || [],
                url: data.url || OLLAMA_BASE_URL,
            };
        }
    } catch {
        // Fall back to Python bridge
    }

    // 2. Try Python Bridge
    try {
        const pyRes = await fetch(`${PYTHON_BRIDGE_URL}/api/ollama/status`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(2000),
        });
        if (pyRes.ok) {
            const data = await pyRes.json();
            return {
                connected: data.connected ?? true,
                modelFound: data.model_found ?? true,
                source: 'python_bridge',
                availableModels: data.available_models || [],
                url: PYTHON_BRIDGE_URL,
            };
        }
    } catch {
        // Fall back to direct Ollama
    }

    // 3. Direct browser check to local Ollama
    try {
        const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            const models = (data.models || []).map((m) => m.name);
            const modelFound = models.some(
                (m) => m.toLowerCase().includes('gemma3') || m.toLowerCase().includes('gemma')
            );
            return {
                connected: true,
                modelFound,
                source: 'direct_ollama',
                availableModels: models,
                url: OLLAMA_BASE_URL,
            };
        }
        return {
            connected: false,
            modelFound: false,
            source: 'direct_ollama',
            error: `Ollama HTTP ${ollamaRes.status}`,
        };
    } catch (err) {
        return {
            connected: false,
            modelFound: false,
            source: 'none',
            error: err.message || 'Ollama is unreachable on http://localhost:11434',
        };
    }
}

/**
 * Loads a server-side log file path using the Laravel backend or Python bridge
 */
export async function loadServerLogFile(filePath) {
    // Try Laravel endpoint first
    try {
        const laravelRes = await fetch('/api/read-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ path: filePath }),
            signal: AbortSignal.timeout(4000),
        });

        if (laravelRes.ok) {
            const data = await laravelRes.json();
            return {
                success: true,
                content: data.content,
                path: data.path,
                totalLines: data.total_lines,
                truncated: data.truncated,
            };
        }
    } catch {
        // Try Python bridge
    }

    // Try Python bridge
    try {
        const pyRes = await fetch(`${PYTHON_BRIDGE_URL}/api/read-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ path: filePath }),
            signal: AbortSignal.timeout(4000),
        });

        if (pyRes.ok) {
            const data = await pyRes.json();
            return {
                success: true,
                content: data.content,
                path: data.path,
                totalLines: data.total_lines,
                truncated: data.truncated,
            };
        }
    } catch {
        // Failed
    }

    throw new Error(`Unable to load file from path "${filePath}". Check if the file exists on disk or use the Browse button to select a local file.`);
}

/**
 * Run incident triage on filtered log buffer using either Live Ollama or Dry-Run
 */
export async function runTriage({ logText, dryRun }) {
    if (dryRun) {
        await new Promise((r) => setTimeout(r, 400));
        return { isSimulated: true, success: true };
    }

    // Condense log buffer to extract essential exception frames and omit framework bloat
    const condensed = condenseLogForTriage(logText, 1000);

    // Live mode:
    // 1. Try Laravel proxy (same-origin, handles CORS, 20-second fast timeout)
    try {
        const laravelResp = await fetch('/api/ollama/triage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                log_text: condensed,
                dry_run: false,
            }),
            signal: AbortSignal.timeout(20000),
        });

        if (laravelResp.ok) {
            const result = await laravelResp.json();
            if (result && !result.error) {
                return {
                    isSimulated: false,
                    success: true,
                    data: result,
                };
            }
        }
    } catch {
        // Fall back to direct Ollama with compact options
    }

    // 2. Direct Ollama call with tight context & greedy decoding
    try {
        const systemPrompt = `LogGuard AI. Output pure JSON with keys: "root_cause", "affected_components", "severity", "remediation_steps", "verification_commands".`;

        const resp = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: TARGET_MODEL,
                prompt: `${systemPrompt}\n\nLogs:\n${condensed}`,
                stream: false,
                format: 'json',
                options: {
                    num_ctx: 768,
                    num_predict: 160,
                    temperature: 0.0,
                },
            }),
            signal: AbortSignal.timeout(18000),
        });

        if (resp.ok) {
            const data = await resp.json();
            const parsed = JSON.parse(data.response.trim());
            return {
                isSimulated: false,
                success: true,
                data: parsed,
            };
        }
    } catch {
        // Fall back to instant simulated diagnosis so user is never frozen
    }

    return {
        isSimulated: true,
        success: false,
        fallbackNotice: 'Ollama processing took > 20s. Generated instantaneous triage report.',
    };
}
