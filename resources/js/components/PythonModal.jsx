import React, { useState } from 'react';
import {
    Terminal,
    X,
    Copy,
    Check,
    Cpu,
    Server,
    ExternalLink,
    Play,
    CheckCircle2,
    XCircle,
    RefreshCw
} from 'lucide-react';

export const PYTHON_APP_CODE = `"""
LogGuard AI — Local IT System Log Triage & Incident Analysis (Gemma 3)
Local Python Bridge Server (app.py)

Requirements:
    pip install flask flask-cors requests

Usage:
    # 1. Start local Ollama with Gemma 3 (4B):
    ollama run gemma3:4b

    # 2. Start this local Python bridge:
    python app.py

    The server will run on http://localhost:5000 with CORS enabled.
"""

import json
import logging
import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin requests for the Laravel/React frontend

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "gemma3:4b"


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "LogGuard AI Local Bridge",
        "version": "2.4-local",
        "engine": DEFAULT_MODEL
    })


@app.route("/api/ollama/status", methods=["GET"])
def ollama_status():
    """Checks whether local Ollama is reachable and if gemma3:4b is available."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2.5)
        if resp.status_code == 200:
            data = resp.json()
            models = [m.get("name") for m in data.get("models", [])]
            has_gemma = any(DEFAULT_MODEL in m for m in models)
            return jsonify({
                "connected": True,
                "url": OLLAMA_BASE_URL,
                "model_found": has_gemma,
                "target_model": DEFAULT_MODEL,
                "available_models": models
            })
        return jsonify({
            "connected": False,
            "error": f"Ollama returned HTTP {resp.status_code}",
            "target_model": DEFAULT_MODEL
        }), 502
    except requests.exceptions.RequestException as e:
        return jsonify({
            "connected": False,
            "error": str(e),
            "target_model": DEFAULT_MODEL,
            "hint": "Run 'ollama serve' or 'ollama run gemma3:4b' locally."
        }), 503


@app.route("/api/read-file", methods=["POST"])
def read_file():
    """Reads a local server-side log file securely."""
    payload = request.get_json(silent=True) or {}
    file_path = payload.get("path", "").strip()

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": f"File does not exist: {file_path}"}), 404

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            content = "".join(lines[-1500:]) if len(lines) > 1500 else "".join(lines)
        return jsonify({
            "path": file_path,
            "content": content,
            "total_lines": len(lines)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/triage", methods=["POST"])
def triage():
    """Sends filtered log data to local Ollama gemma3:4b for incident analysis."""
    payload = request.get_json(silent=True) or {}
    log_text = payload.get("log_text", "")
    dry_run = payload.get("dry_run", False)

    if dry_run:
        return jsonify({
            "root_cause": "Simulation Mode: An unauthorized administrator route request was rejected by role-based middleware. A subsequent database deletion operation encountered a foreign key constraint violation.",
            "affected_components": ["RoleMiddleware.php", "ConsumerController.php", "MySQL Database", "Redis Queue Worker"],
            "severity": "CRITICAL",
            "severity_reason": "Foreign key constraint failure cascaded into transaction rollback, halting billing synchronization.",
            "remediation_steps": [
                "1. Problem: Unauthorized access to /admin/config. Action: Review RoleMiddleware.php and verify authorization policies.",
                "2. Problem: Parent row deletion violation on consumers. Action: Add SoftDeletes trait to Consumer model.",
                "3. Problem: Unhandled QueryException. Action: Wrap destructive operations in DB::transaction() blocks.",
                "4. Problem: Redis queue worker disconnected. Action: Restart queue workers using php artisan queue:restart."
            ],
            "verification_commands": [
                "php artisan route:list --path=admin",
                "tail -n 50 storage/logs/laravel.log | grep -E 'ERROR|CRITICAL'",
                "php artisan queue:restart"
            ],
            "is_simulated": True
        })

    # Call local Ollama gemma3:4b
    system_prompt = (
        "You are LogGuard AI incident responder. Analyze these filtered IT logs. Return valid JSON only with keys: "
        "root_cause, affected_components (array), severity (LOW|MEDIUM|HIGH|CRITICAL), severity_reason, "
        "remediation_steps (array), verification_commands (array)."
    )

    try:
        ollama_req = {
            "model": DEFAULT_MODEL,
            "prompt": f"{system_prompt}\\n\\nLogs:\\n{log_text[:3500]}",
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "top_p": 0.9,
                "num_predict": 450
            }
        }
        resp = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=ollama_req, timeout=120.0)
        if resp.status_code == 200:
            parsed = json.loads(resp.json().get("response", "").strip())
            parsed["is_simulated"] = False
            return jsonify(parsed)
        return jsonify({"error": f"Ollama HTTP {resp.status_code}"}), 502
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 503


if __name__ == "__main__":
    logging.info("Starting LogGuard AI Python Bridge on http://localhost:5000 ...")
    try:
        app.run(host="0.0.0.0", port=5000, debug=False)
    except OSError as e:
        if "10048" in str(e) or "Address already in use" in str(e):
            logging.error("Port 5000 is already in use by an existing Python instance!")
        raise
`;

export default function PythonModal({ isOpen, onClose }) {
    const [copied, setCopied] = useState(false);
    const [testingPing, setTestingPing] = useState(false);
    const [pingResult, setPingResult] = useState(null);

    if (!isOpen) return null;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(PYTHON_APP_CODE);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleTestBridge = async () => {
        setTestingPing(true);
        setPingResult(null);
        try {
            let res = null;
            try {
                res = await fetch('http://localhost:5000/api/health', {
                    signal: AbortSignal.timeout(4000),
                });
            } catch {
                res = await fetch('http://127.0.0.1:5000/api/health', {
                    signal: AbortSignal.timeout(4000),
                });
            }

            if (res && res.ok) {
                const data = await res.json();
                setPingResult({ success: true, message: `Connected! ${data.service} (${data.version})` });
            } else {
                setPingResult({ success: false, message: `Server returned HTTP ${res ? res.status : 'offline'}` });
            }
        } catch {
            setPingResult({
                success: false,
                message: 'Bridge offline (port 5000). Run "python app.py" to start.',
            });
        } finally {
            setTestingPing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-3xl rounded-2xl bg-[#0F172A] border border-[#334155] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#334155] bg-[#0B1220]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#2563EB]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8]">
                            <Terminal className="w-4 h-4 text-[#38BDF8]" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC]">
                                Local Python Server Bridge (<span className="font-mono text-[#38BDF8]">app.py</span>)
                            </h2>
                            <p className="text-xs text-[#94A3B8]">
                                Optional local Python micro-server that proxies requests between LogGuard AI & Ollama.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#151F32] transition-colors cursor-pointer"
                        title="Close modal (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 text-xs text-[#94A3B8]">
                    {/* Instructions Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-[#0B1220] border border-[#334155] space-y-1.5">
                            <span className="inline-block text-[10px] font-mono font-bold text-[#38BDF8] bg-[#151F32] px-1.5 py-0.5 rounded border border-[#38BDF8]/30">
                                Step 1
                            </span>
                            <h3 className="font-semibold text-[#F8FAFC]">Install Dependencies</h3>
                            <div className="bg-[#151F32] p-2 rounded font-mono text-[11px] text-[#38BDF8] select-all">
                                pip install flask flask-cors requests
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-[#0B1220] border border-[#334155] space-y-1.5">
                            <span className="inline-block text-[10px] font-mono font-bold text-purple-400 bg-[#151F32] px-1.5 py-0.5 rounded border border-purple-400/30">
                                Step 2
                            </span>
                            <h3 className="font-semibold text-[#F8FAFC]">Start Local Ollama</h3>
                            <div className="bg-[#151F32] p-2 rounded font-mono text-[11px] text-purple-300 select-all">
                                ollama run gemma3:4b
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-[#0B1220] border border-[#334155] space-y-1.5">
                            <span className="inline-block text-[10px] font-mono font-bold text-emerald-400 bg-[#151F32] px-1.5 py-0.5 rounded border border-emerald-400/30">
                                Step 3
                            </span>
                            <h3 className="font-semibold text-[#F8FAFC]">Run Python Server</h3>
                            <div className="bg-[#151F32] p-2 rounded font-mono text-[11px] text-emerald-300 select-all">
                                python app.py
                            </div>
                        </div>
                    </div>

                    {/* Ping Test Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#0B1220] border border-[#334155]">
                        <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-[#38BDF8]" />
                            <span className="font-medium text-[#F8FAFC]">Test Local Server Status:</span>
                            {pingResult && (
                                <span
                                    className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded ${
                                        pingResult.success
                                            ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/30'
                                            : 'text-amber-400 bg-amber-950/30 border border-amber-500/30'
                                    }`}
                                >
                                    {pingResult.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {pingResult.message}
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleTestBridge}
                            disabled={testingPing}
                            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] text-[#F8FAFC] text-xs font-medium cursor-pointer transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin text-[#38BDF8]' : ''}`} />
                            <span>Ping http://localhost:5000</span>
                        </button>
                    </div>

                    {/* Code Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-[#F8FAFC]">Python Source Code (app.py):</span>
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#151F32] hover:bg-[#1E293B] border border-[#38BDF8]/40 text-[#38BDF8] font-medium text-xs transition-colors cursor-pointer active:scale-95 shadow-xs"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Copied to Clipboard!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Code</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="rounded-lg bg-[#0B1220] border border-[#334155] p-3 max-h-[260px] overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-[#F8FAFC]">
                            <pre className="whitespace-pre overflow-x-auto text-[#94A3B8]">
                                {PYTHON_APP_CODE}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-[#334155] bg-[#0B1220] flex items-center justify-between">
                    <span className="text-[11px] text-[#94A3B8]">
                        The file <code className="text-[#38BDF8] font-mono">app.py</code> is ready in your project root!
                    </span>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-[#151F32] hover:bg-[#1E293B] border border-[#334155] text-xs font-medium text-[#F8FAFC] transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
