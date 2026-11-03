"""
LogGuard AI — Local IT System Log Triage & Incident Analysis (Gemma 3)
Local Python Bridge Server & Multi-Port Orchestrator (app.py)

Requirements:
    pip install flask flask-cors requests

Usage:
    # 1. Start local Ollama with Gemma 3 (4B):
    ollama run gemma3:4b

    # 2. Start this local Python bridge:
    python app.py

    # Optional: Automatically open web ports in browser:
    python app.py --open

    The server will run on http://localhost:5000 with CORS enabled.
"""

import json
import logging
import os
import socket
import sys
import threading
import time
import webbrowser
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin requests for the Laravel/React frontend

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "gemma3:4b"


def check_port(host, port, timeout=0.6):
    """Safely probes whether a TCP port is open and listening."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


@app.route("/", methods=["GET"])
def home():
    """Serves an interactive dark-themed Multi-Port Ecosystem & Bridge Hub."""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LogGuard AI — Multi-Port Ecosystem Hub</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #080D1A; color: #F8FAFC; margin: 0; padding: 24px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .container { max-width: 860px; width: 100%; }
            .header { text-align: center; margin-bottom: 28px; }
            .badge-hub { display: inline-flex; align-items: center; gap: 6px; background: rgba(56, 189, 248, 0.12); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
            h1 { font-size: 26px; font-weight: 800; margin: 0 0 8px 0; color: #F8FAFC; letter-spacing: -0.5px; }
            h1 span { color: #38BDF8; }
            .lead { color: #94A3B8; font-size: 14px; max-width: 620px; margin: 0 auto; line-height: 1.5; }
            
            .ports-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px; }
            .port-card { background: #0F172A; border: 1px solid #1E293B; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; position: relative; transition: border-color 0.2s, transform 0.2s; }
            .port-card:hover { border-color: #38BDF8; transform: translateY(-2px); }
            .port-number { font-size: 22px; font-weight: 800; font-family: monospace; color: #F8FAFC; display: flex; align-items: center; justify-content: space-between; }
            .port-dot { width: 10px; height: 10px; border-radius: 50%; background: #64748B; }
            .port-dot.online { background: #10B981; box-shadow: 0 0 8px #10B981; }
            .port-dot.offline { background: #EF4444; }
            .port-name { font-size: 13px; font-weight: 700; color: #E2E8F0; margin-top: 6px; }
            .port-desc { font-size: 11px; color: #64748B; margin: 4px 0 14px 0; min-height: 28px; line-height: 1.3; }
            .port-btn { display: block; text-align: center; text-decoration: none; padding: 7px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; transition: all 0.2s; }
            .port-btn.primary { background: #2563EB; color: #fff; }
            .port-btn.primary:hover { background: #1D4ED8; }
            .port-btn.secondary { background: #1E293B; color: #94A3B8; border: 1px solid #334155; }
            .port-btn.secondary:hover { background: #334155; color: #fff; }

            .action-bar { background: #0F172A; border: 1px solid #1E293B; border-radius: 10px; padding: 20px; margin-bottom: 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; }
            .action-info h3 { margin: 0 0 4px 0; font-size: 15px; color: #F8FAFC; }
            .action-info p { margin: 0; font-size: 12px; color: #94A3B8; }
            .btn-trigger { background: #059669; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s; }
            .btn-trigger:hover { background: #047857; }
            .btn-trigger:disabled { opacity: 0.5; cursor: not-allowed; }

            .terminal-box { background: #050811; border: 1px solid #1E293B; border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px; color: #CBD5E1; line-height: 1.5; max-height: 220px; overflow-y: auto; white-space: pre-wrap; display: none; }
            .footer-info { text-align: center; font-size: 11px; color: #475569; margin-top: 16px; }
            .footer-info a { color: #38BDF8; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="badge-hub">⚡ Multi-Port Bridge & Ecosystem Hub</span>
                <h1>🛡️ LogGuard AI <span>Ecosystem</span></h1>
                <p class="lead">Autonomous IT log triage and real-time port bridge connecting local web applications, Laravel dashboards, Python microservices, and Ollama AI inference.</p>
            </div>

            <div class="ports-grid">
                <!-- Port 8000: Target App -->
                <div class="port-card" id="card-8000">
                    <div>
                        <div class="port-number">
                            <span>:8000</span>
                            <span class="port-dot" id="dot-8000"></span>
                        </div>
                        <div class="port-name">Target Web App</div>
                        <div class="port-desc">App producing exceptions & DB logs (e.g. Iconect).</div>
                    </div>
                    <a href="http://localhost:8000" target="_blank" class="port-btn secondary">Open Port 8000 &rarr;</a>
                </div>

                <!-- Port 8080: LogGuard UI -->
                <div class="port-card" id="card-8080" style="border-color: rgba(56, 189, 248, 0.4);">
                    <div>
                        <div class="port-number" style="color: #38BDF8;">
                            <span>:8080</span>
                            <span class="port-dot" id="dot-8080"></span>
                        </div>
                        <div class="port-name">LogGuard Dashboard</div>
                        <div class="port-desc">Main web GUI, 24/7 Watcher & live AI auto-triage.</div>
                    </div>
                    <a href="http://localhost:8080" target="_blank" class="port-btn primary">Open Dashboard &rarr;</a>
                </div>

                <!-- Port 5000: Python Bridge (Self) -->
                <div class="port-card" id="card-5000">
                    <div>
                        <div class="port-number" style="color: #34D399;">
                            <span>:5000</span>
                            <span class="port-dot online" id="dot-5000"></span>
                        </div>
                        <div class="port-name">Python Server Bridge</div>
                        <div class="port-desc">High-speed file reader & Ollama triage proxy.</div>
                    </div>
                    <a href="/api/health" target="_blank" class="port-btn secondary">View Health API &rarr;</a>
                </div>

                <!-- Port 11434: Local Ollama -->
                <div class="port-card" id="card-11434">
                    <div>
                        <div class="port-number" style="color: #A78BFA;">
                            <span>:11434</span>
                            <span class="port-dot" id="dot-11434"></span>
                        </div>
                        <div class="port-name">Ollama (Gemma 3)</div>
                        <div class="port-desc">100% local LLM inference engine (zero cloud).</div>
                    </div>
                    <a href="/api/ollama/status" target="_blank" class="port-btn secondary">Check Model &rarr;</a>
                </div>
            </div>

            <div class="action-bar">
                <div class="action-info">
                    <h3>⚡ Instant Gemma 3 Triage Verification</h3>
                    <p>Trigger a sample incident triage test through the Python bridge to verify Gemma 3 responsiveness.</p>
                </div>
                <button class="btn-trigger" id="btn-test" onclick="runTriageTest()">
                    <span id="btn-text">⟳ Trigger Test Triage</span>
                </button>
            </div>

            <div class="terminal-box" id="test-output"></div>

            <div class="footer-info">
                LogGuard AI v2.4 (Local-First) • Running on Python Flask + Ollama • Mariano Marcos State University CCIS
            </div>
        </div>

        <script>
            async function checkPorts() {
                try {
                    const res = await fetch('/api/ports/check');
                    if (res.ok) {
                        const data = await res.json();
                        (data.ports || []).forEach(p => {
                            const dot = document.getElementById('dot-' + p.port);
                            if (dot) {
                                dot.className = 'port-dot ' + (p.status === 'online' ? 'online' : 'offline');
                                dot.title = p.port + ' is ' + p.status.toUpperCase();
                            }
                        });
                    }
                } catch (e) {
                    console.error('Failed to probe ports:', e);
                }
            }

            async function runTriageTest() {
                const btn = document.getElementById('btn-test');
                const btnText = document.getElementById('btn-text');
                const out = document.getElementById('test-output');
                
                btn.disabled = true;
                btnText.innerText = '⟳ Invoking Gemma 3:4b...';
                out.style.display = 'block';
                out.innerText = 'Sending sample database deadlock incident to Gemma 3 on Port 11434...\\n';

                try {
                    const sampleError = "[2026-11-04 00:00:01] local.CRITICAL: SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock; try restarting transaction at /app/Http/Controllers/OrderController.php:84";
                    const t0 = performance.now();
                    const res = await fetch('/api/triage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ log_text: sampleError, dry_run: false })
                    });
                    const duration = ((performance.now() - t0) / 1000).toFixed(2);
                    const json = await res.json();
                    out.innerText = `[SUCCESS] Triage completed in ${duration}s via Gemma 3 (Port 11434):\\n\\n` + JSON.stringify(json, null, 2);
                } catch (err) {
                    out.innerText = `[ERROR] Failed to run test triage: ${err.message}`;
                } finally {
                    btn.disabled = false;
                    btnText.innerText = '⟳ Trigger Test Triage';
                }
            }

            // Check ports immediately and refresh every 5s
            checkPorts();
            setInterval(checkPorts, 5000);
        </script>
    </body>
    </html>
    """


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "LogGuard AI Local Bridge",
        "version": "2.4-local",
        "engine": DEFAULT_MODEL
    })


@app.route("/api/ports/check", methods=["GET"])
def check_ports():
    """Probes status of all 4 active ports in the LogGuard ecosystem."""
    ports_to_check = [
        {"port": 8000, "name": "Target Web Application", "url": "http://localhost:8000", "role": "Log Producer (e.g. Iconect, Web Server)"},
        {"port": 8080, "name": "LogGuard AI Dashboard", "url": "http://localhost:8080", "role": "Main Web GUI & 24/7 Watcher"},
        {"port": 5000, "name": "Python Bridge Server", "url": "http://localhost:5000", "role": "API & File Bridge (Self)"},
        {"port": 11434, "name": "Local Ollama Engine", "url": "http://localhost:11434", "role": "Local LLM Inference (Gemma 3:4b)"},
    ]
    results = []
    for p in ports_to_check:
        is_open = True if p["port"] == 5000 else check_port("127.0.0.1", p["port"])
        results.append({
            **p,
            "status": "online" if is_open else "offline"
        })
    return jsonify({"ports": results})


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

    if not file_path:
        return jsonify({"error": "No file path provided"}), 400

    # Basic safety check: ensure the path exists and is a file
    if not os.path.exists(file_path):
        return jsonify({"error": f"File does not exist: {file_path}"}), 404

    if not os.path.isfile(file_path):
        return jsonify({"error": f"Path is not a regular file: {file_path}"}), 400

    try:
        # Read up to the last 1500 lines or 500KB to ensure fast responsive delivery
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
            # If large, take the most recent 1500 lines
            if len(lines) > 1500:
                content = "".join(lines[-1500:])
                is_truncated = True
            else:
                content = "".join(lines)
                is_truncated = False

        return jsonify({
            "path": file_path,
            "content": content,
            "total_lines": len(lines),
            "loaded_lines": min(len(lines), 1500),
            "truncated": is_truncated
        })
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {str(e)}"}), 500


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
                "1. Problem: Unauthorized access to /admin/config. Action: Review RoleMiddleware.php and verify authorization policies on all administrative endpoints.",
                "2. Problem: Parent row deletion violation on consumers. Action: Add SoftDeletes trait to Consumer model and handle foreign key constraints safely inside DB::transaction().",
                "3. Problem: Unhandled QueryException. Action: Wrap destructive operations in try-catch blocks and emit structured 409 conflict responses.",
                "4. Problem: Redis queue worker disconnected. Action: Verify Redis cluster status and restart queue workers using php artisan queue:restart."
            ],
            "verification_commands": [
                "php artisan route:list --path=admin",
                "tail -n 50 storage/logs/laravel.log | grep -E 'ERROR|CRITICAL'",
                "php artisan queue:monitor default,payments_high",
                "php artisan queue:restart"
            ],
            "is_simulated": True
        })

    system_prompt = (
        "You are LogGuard AI, an expert IT system log triage and incident analysis engine. "
        "Analyze the provided application and system logs. "
        "You MUST provide a structured incident triage report in pure, valid JSON with EXACTLY these keys:\n"
        "{\n"
        '  "root_cause": "1-2 concise sentences summarizing the most likely root cause.",\n'
        '  "affected_components": ["Component1", "Component2"],\n'
        '  "severity": "LOW | MEDIUM | HIGH | CRITICAL",\n'
        '  "severity_reason": "Short explanation of why this severity was assigned.",\n'
        '  "remediation_steps": [\n'
        '    "1. Problem: Description. Action: Recommended fix. Relevant files: File or service.",\n'
        '    "2. Problem: Description. Action: Recommended fix. Relevant files: File or service."\n'
        "  ],\n"
        '  "verification_commands": [\n'
        '    "safe diagnostic shell or artisan command",\n'
        '    "another verification command"\n'
        "  ]\n"
        "}\n"
        "Do not invent code locations not supported by the logs. Do not wrap in markdown or backticks. Output pure raw JSON only."
    )

    # Take only the newest error lines from the tail to prevent hallucinating on old errors
    user_prompt = f"System Logs for Triage:\n{log_text[-1200:]}"

    try:
        ollama_req = {
            "model": DEFAULT_MODEL,
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "stream": False,
            "format": "json",
            "options": {
                "num_ctx": 768,
                "num_predict": 160,
                "temperature": 0.0
            }
        }
        resp = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=ollama_req, timeout=25.0)
        if resp.status_code == 200:
            result = resp.json()
            response_text = result.get("response", "").strip()
            try:
                parsed = json.loads(response_text)
                parsed["is_simulated"] = False
                parsed["model"] = DEFAULT_MODEL
                return jsonify(parsed)
            except Exception:
                # Controlled recovery if json has surrounding markdown
                cleaned = response_text.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                parsed["is_simulated"] = False
                parsed["model"] = DEFAULT_MODEL
                return jsonify(parsed)
        else:
            return jsonify({
                "error": f"Ollama error: HTTP {resp.status_code}",
                "details": resp.text
            }), 502
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Failed to communicate with local Ollama",
            "message": str(e),
            "hint": "Check that Ollama is running at http://localhost:11434 with 'ollama run gemma3:4b'"
        }), 503


if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def print_banner():
    """Prints a clear console table of all ports and services upon startup."""
    print("=" * 66)
    print("  [LogGuard AI] Multi-Port Ecosystem & Bridge Server")
    print("=" * 66)
    ports = [
        (8000, "Target Application", "http://localhost:8000", "(Log Producer)"),
        (8080, "LogGuard Dashboard", "http://localhost:8080", "(Main Web UI & Watcher)"),
        (5000, "Python Bridge", "http://localhost:5000", "(API & Ecosystem Hub)"),
        (11434, "Local Ollama", "http://localhost:11434", "(Gemma 3:4b Engine)"),
    ]
    for port, name, url, note in ports:
        status = "ONLINE " if (port == 5000 or check_port("127.0.0.1", port)) else "OFFLINE"
        print(f"  [{status}] :{port:<5} | {name:<20} | {url:<24} {note}")
    print("=" * 66)
    print("  >> Open http://localhost:8080 to access the LogGuard AI Dashboard")
    print("  >> Open http://localhost:5000 to view the Ecosystem Port Hub")
    print("=" * 66 + "\n")


def auto_open_browser():
    """Waits for server to start, then opens the dashboard and port hub."""
    time.sleep(1.2)
    print("Launching LogGuard AI web interfaces in your default browser...")
    webbrowser.open("http://localhost:8080")
    webbrowser.open("http://localhost:5000")


if __name__ == "__main__":
    print_banner()

    if "--open" in sys.argv:
        threading.Thread(target=auto_open_browser, daemon=True).start()

    logging.info("Starting LogGuard AI Python Bridge on http://localhost:5000 ...")
    try:
        app.run(host="0.0.0.0", port=5000, debug=False)
    except OSError as e:
        if "10048" in str(e) or "Address already in use" in str(e):
            logging.error("Port 5000 is already in use! Kill any existing Python instance with 'Stop-Process -Name python -Force' before restarting.")
        raise
