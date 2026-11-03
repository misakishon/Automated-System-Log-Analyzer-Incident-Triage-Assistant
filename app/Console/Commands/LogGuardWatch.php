<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class LogGuardWatch extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logguard:watch 
                            {--path=C:\TrainAi\Iconect\storage\logs\laravel.log : Path to the target log file}
                            {--interval=3 : Polling interval in seconds}
                            {--auto-triage : Automatically trigger Gemma 3 triage on CRITICAL alerts}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Continuous 24/7 background IT log watcher with automatic Gemma 3 triage';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = $this->option('path');
        $interval = max(1, (int) $this->option('interval'));
        $autoTriage = $this->option('auto-triage');

        $this->info('================================================================');
        $this->info(' LogGuard AI — 24/7 Continuous System Log Watcher (Gemma 3)');
        $this->info('================================================================');
        $this->line("Target File: <comment>{$path}</comment>");
        $this->line("Interval:    <comment>{$interval}s</comment>");
        $this->line('Auto-Triage: <comment>'.($autoTriage ? 'ENABLED' : 'DISABLED').'</comment>');
        $this->line('Engine:      <comment>gemma3:4b (http://localhost:11434)</comment>');
        $this->newLine();

        if (! file_exists($path)) {
            $this->warn("Target log file does not exist yet: {$path}");
            $this->warn('Waiting for file creation...');
        }

        $lastSize = file_exists($path) ? filesize($path) : 0;
        $this->info('[INIT] Watcher active. Monitoring for new log events (Press Ctrl+C to stop)...');

        while (true) {
            clearstatcache(true, $path);

            if (file_exists($path)) {
                $currentSize = filesize($path);

                if ($currentSize < $lastSize) {
                    $this->warn('[ROTATE] Log file was rotated or truncated. Resetting offset.');
                    $lastSize = 0;
                }

                if ($currentSize > $lastSize) {
                    $fp = fopen($path, 'r');
                    if ($fp) {
                        fseek($fp, $lastSize);
                        $newContent = fread($fp, $currentSize - $lastSize);
                        fclose($fp);

                        $lastSize = $currentSize;
                        $lines = explode("\n", trim($newContent));
                        $newCount = count($lines);

                        $this->line('<info>['.date('H:i:s').']</info> Read <comment>+'.$newCount.'</comment> new log line(s).');

                        $hasCritical = false;
                        $criticalLines = [];

                        foreach ($lines as $line) {
                            if (preg_match('/CRITICAL/i', $line)) {
                                $this->error("  [CRITICAL] {$line}");
                                $hasCritical = true;
                                $criticalLines[] = $line;
                            } elseif (preg_match('/ERROR/i', $line)) {
                                $this->warn("  [ERROR] {$line}");
                            } elseif (preg_match('/WARNING/i', $line)) {
                                $this->line("  <comment>[WARNING]</comment> {$line}");
                            }
                        }

                        // Auto-Triage via Gemma 3 if enabled and critical error encountered
                        if ($autoTriage && $hasCritical) {
                            $this->info('  [AI] Triggering automatic Gemma 3 incident triage...');
                            $this->runGemmaTriage(implode("\n", array_slice($criticalLines, -10)));
                        }
                    }
                }
            }

            sleep($interval);
        }

        return 0;
    }

    /**
     * Call local Ollama gemma3:4b to triage detected exceptions.
     */
    protected function runGemmaTriage(string $logSnippet): void
    {
        try {
            $response = Http::timeout(25)->post('http://localhost:11434/api/generate', [
                'model' => 'gemma3:4b',
                'prompt' => "Analyze this critical IT log event. Provide 2 bullet points for root cause and 2 immediate remediation steps:\n\n{$logSnippet}",
                'stream' => false,
            ]);

            if ($response->successful()) {
                $this->line('  <info>[GEMMA 3 TRIAGE REPORT]:</info>');
                $this->line('  '.trim($response->json('response', 'No response generated.')));
            } else {
                $this->warn('  [OLLAMA] Returned HTTP '.$response->status());
            }
        } catch (\Throwable $e) {
            $this->warn('  [OLLAMA ERROR] '.$e->getMessage());
        }
    }
}
