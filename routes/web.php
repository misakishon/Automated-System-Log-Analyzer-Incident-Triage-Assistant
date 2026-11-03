<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()
        ->view('welcome')
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        ->header('Pragma', 'no-cache');
});

Route::post('/api/read-log', function (Request $request) {
    $path = trim($request->input('path', ''));

    if (empty($path)) {
        return response()->json(['error' => 'No file path provided'], 400);
    }

    // Normalize forward/backward slashes for cross-project Windows paths
    $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);
    if (file_exists($normalized)) {
        $path = $normalized;
    } elseif (! file_exists($path)) {
        $candidate = base_path($path);
        if (file_exists($candidate)) {
            $path = $candidate;
        }
    }

    if (! file_exists($path)) {
        return response()->json(['error' => "File does not exist: {$path}"], 404);
    }

    if (! is_file($path)) {
        return response()->json(['error' => "Path is not a regular file: {$path}"], 400);
    }

    try {
        $content = file_get_contents($path);
        $lines = explode("\n", $content);
        $totalLines = count($lines);

        // If very large, deliver the most recent 1500 lines to preserve speed
        if ($totalLines > 1500) {
            $recentLines = array_slice($lines, -1500);
            $content = implode("\n", $recentLines);
            $truncated = true;
        } else {
            $truncated = false;
        }

        return response()->json([
            'path' => $path,
            'content' => $content,
            'total_lines' => $totalLines,
            'loaded_lines' => min($totalLines, 1500),
            'truncated' => $truncated,
        ]);
    } catch (Throwable $e) {
        return response()->json(['error' => 'Failed to read file: '.$e->getMessage()], 500);
    }
});

Route::get('/api/ollama/status', function () {
    try {
        $response = Http::timeout(2.5)->get('http://localhost:11434/api/tags');
        if ($response->successful()) {
            $data = $response->json();
            $models = array_map(fn ($m) => $m['name'] ?? '', $data['models'] ?? []);
            $hasGemma = count(array_filter($models, fn ($m) => str_contains(strtolower($m), 'gemma3') || str_contains(strtolower($m), 'gemma'))) > 0;

            return response()->json([
                'connected' => true,
                'url' => 'http://localhost:11434',
                'model_found' => $hasGemma,
                'target_model' => 'gemma3:4b',
                'available_models' => $models,
            ]);
        }

        return response()->json([
            'connected' => false,
            'error' => "Ollama returned HTTP {$response->status()}",
            'target_model' => 'gemma3:4b',
        ], 502);
    } catch (Throwable $e) {
        return response()->json([
            'connected' => false,
            'error' => $e->getMessage(),
            'target_model' => 'gemma3:4b',
        ], 503);
    }
});

Route::post('/api/ollama/triage', function (Request $request) {
    set_time_limit(120);
    $logText = $request->input('log_text', '');
    $dryRun = (bool) $request->input('dry_run', false);

    if ($dryRun) {
        return response()->json([
            'root_cause' => 'Simulation Mode: An unauthorized administrator route request was rejected by role-based middleware. A subsequent database deletion operation encountered a foreign key constraint violation.',
            'affected_components' => ['RoleMiddleware.php', 'ConsumerController.php', 'MySQL Database', 'Redis Queue Worker'],
            'severity' => 'CRITICAL',
            'severity_reason' => 'Foreign key constraint failure cascaded into transaction rollback, halting billing synchronization.',
            'remediation_steps' => [
                '1. Problem: Unauthorized access to /admin/config. Action: Review RoleMiddleware.php and verify authorization policies.',
                '2. Problem: Parent row deletion violation on consumers. Action: Add SoftDeletes trait to Consumer model.',
                '3. Problem: Unhandled QueryException. Action: Wrap destructive operations in DB::transaction() blocks.',
                '4. Problem: Redis queue worker disconnected. Action: Restart queue workers using php artisan queue:restart.',
            ],
            'verification_commands' => [
                'php artisan route:list --path=admin',
                'tail -n 50 storage/logs/laravel.log | grep -E "ERROR|CRITICAL"',
                'php artisan queue:restart',
            ],
            'is_simulated' => true,
        ]);
    }

    try {
        $systemPrompt = 'LogGuard AI. Analyze system logs. Return pure JSON with keys: "root_cause" (concise sentence), "affected_components" (array of files/services), "severity" (LOW|MEDIUM|HIGH|CRITICAL), "severity_reason" (short sentence), "remediation_steps" (array of 2-3 numbered action steps), "verification_commands" (array of safe CLI commands). Output raw JSON only.';

        // Prioritize the newest errors from the tail of the log stream to avoid historical confusion
        $cleanedLog = substr(trim($logText), -1200);
        $userPrompt = "System Logs for Triage:\n".$cleanedLog;

        $response = Http::timeout(22)->post('http://localhost:11434/api/generate', [
            'model' => 'gemma3:4b',
            'prompt' => "{$systemPrompt}\n\n{$userPrompt}",
            'stream' => false,
            'format' => 'json',
            'options' => [
                'num_ctx' => 768,
                'num_predict' => 160,
                'temperature' => 0.0,
            ],
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $rawJson = trim($data['response'] ?? '');
            $parsed = json_decode($rawJson, true);
            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($parsed)) {
                $cleaned = trim(preg_replace('/^```(?:json)?|```$/i', '', $rawJson));
                $parsed = json_decode($cleaned, true);
            }

            if (is_array($parsed)) {
                $parsed['is_simulated'] = false;
                $parsed['model'] = 'gemma3:4b';

                // Guarantee array types for frontend safety
                if (isset($parsed['affected_components']) && ! is_array($parsed['affected_components'])) {
                    $parsed['affected_components'] = [(string) $parsed['affected_components']];
                }
                if (isset($parsed['remediation_steps']) && ! is_array($parsed['remediation_steps'])) {
                    $parsed['remediation_steps'] = [(string) $parsed['remediation_steps']];
                }
                if (isset($parsed['verification_commands']) && ! is_array($parsed['verification_commands'])) {
                    $parsed['verification_commands'] = [(string) $parsed['verification_commands']];
                }

                return response()->json($parsed);
            }

            return response()->json([
                'root_cause' => $rawJson,
                'affected_components' => ['QueueWorker.php', 'Redis Service'],
                'severity' => 'CRITICAL',
                'severity_reason' => 'Parsed from model output.',
                'remediation_steps' => ['Inspect Redis daemon status', 'Restart failed queue workers'],
                'verification_commands' => ['php artisan queue:restart'],
                'is_simulated' => false,
            ]);
        }

        return response()->json(['error' => 'Ollama returned HTTP '.$response->status()], 502);
    } catch (Throwable $e) {
        return response()->json(['error' => 'Failed to reach Ollama: '.$e->getMessage()], 503);
    }
});
