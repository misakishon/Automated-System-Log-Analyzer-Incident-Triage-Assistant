/**
 * Structured Triage Templates for Gemma 3 (4B)
 * Used in Dry-Run mode and fallback schemas
 */

export const TRIAGE_TEMPLATES = {
    iconnect: {
        root_cause:
            'An unauthorized administrator route request to /admin/config was rejected by role-based middleware. A subsequent database deletion operation on /api/v1/consumers encountered an unhandled foreign key constraint violation on meter_readings.',
        affected_components: [
            'RoleMiddleware.php',
            'ConsumerController.php',
            'MySQL Database (InnoDB)',
            'Redis Queue Worker'
        ],
        severity: 'CRITICAL',
        severity_reason:
            'Foreign key integrity constraint failure cascaded into database transaction rollback, and background failure alerting failed due to an unreachable Redis daemon.',
        remediation_steps: [
            '1. Problem: Unauthorized administrator route probe by non-admin actor. Action: Review RoleMiddleware.php and verify Gate::define("view-admin") applies strictly across admin routes. Relevant files: app/Http/Middleware/RoleMiddleware.php, routes/web.php.',
            '2. Problem: Parent row deletion violation on table consumers. Action: Enforce $this->authorize("forceDelete", $consumer) and implement SoftDeletes trait on Consumer model to prevent hard deletions. Relevant files: app/Models/Consumer.php, app/Http/Controllers/ConsumerController.php.',
            '3. Problem: Fatal QueryException during delete query. Action: Wrap destructive operations in DB::transaction() and catch Illuminate\\Database\\QueryException with structured 409 conflict responses. Relevant files: app/Http/Controllers/ConsumerController.php.',
            '4. Problem: Dead-letter Redis worker connection refused on port 6379. Action: Verify Redis cluster status, inspect redis.conf, and restart queue workers using php artisan queue:restart. Relevant files: config/database.php, config/queue.php.'
        ],
        verification_commands: [
            'php artisan route:list --path=admin',
            'tail -n 50 storage/logs/laravel.log | grep -E "ERROR|CRITICAL"',
            'php artisan queue:monitor default,payments_high',
            'php artisan queue:restart',
            'php artisan config:clear && php artisan route:clear'
        ]
    },

    nginx_error: {
        root_cause:
            'FastCGI upstream connection timeouts and worker pool exhaustion occurred under high batch billing traffic. Nginx reached worker connection limits, causing HTTP 502/504 gateway failures.',
        affected_components: [
            'Nginx Reverse Proxy',
            'php-fpm (pool www)',
            'fastcgi://unix:/var/run/php/php8.2-fpm.sock'
        ],
        severity: 'HIGH',
        severity_reason:
            'Upstream PHP-FPM socket became unresponsive under concurrency spikes, triggering widespread gateway timeouts for active API clients.',
        remediation_steps: [
            '1. Problem: FastCGI primary worker buffer overflow. Action: Increase fastcgi_buffers (16 16k) and fastcgi_buffer_size (32k) in nginx.conf for batch API endpoints. Relevant files: /etc/nginx/nginx.conf, /etc/nginx/conf.d/api.conf.',
            '2. Problem: Server reached pm.max_children setting (50). Action: Tune PHP-FPM process manager to pm = dynamic, raise pm.max_children to 120 based on RAM capacity. Relevant files: /etc/php/8.2/fpm/pool.d/www.conf.',
            '3. Problem: Upstream connection timeout after 60s. Action: Adjust fastcgi_read_timeout to 180s for long-running synchronization endpoints. Relevant files: /etc/nginx/conf.d/api.conf.'
        ],
        verification_commands: [
            'sudo nginx -t && sudo systemctl reload nginx',
            'systemctl status php8.2-fpm',
            'tail -n 40 /var/log/nginx/error.log',
            'cat /var/log/php8.2-fpm.log | grep "pm.max_children"'
        ]
    },

    db_timeout: {
        root_cause:
            'Database connection pool starvation and network timeouts prevented billing workers from connecting to MySQL at 10.0.4.15:3306. Consecutive job retries failed with MaxAttemptsExceededException.',
        affected_components: [
            'MySQL Database Cluster (10.0.4.15:3306)',
            'PDO / MySqlConnector.php',
            'App\\Jobs\\ProcessBatchBilling',
            'Redis Queue Supervisor'
        ],
        severity: 'CRITICAL',
        severity_reason:
            'Core transactional database connectivity was interrupted, causing asynchronous queue worker deadlocks and service health degradation.',
        remediation_steps: [
            '1. Problem: MySQL connection timeout to 10.0.4.15:3306. Action: Inspect MySQL max_connections and verify network security group/firewall rules. Relevant files: /etc/mysql/my.cnf, config/database.php.',
            '2. Problem: Max retry attempts exceeded on ProcessBatchBilling. Action: Implement exponential backoff ($backoff = [30, 120, 300]) and fail gracefully into failed_jobs table. Relevant files: app/Jobs/ProcessBatchBilling.php.',
            '3. Problem: Health check probe latency exceeded 5000ms. Action: Enable MySQL connection pooling and verify replica read-routing. Relevant files: config/database.php.'
        ],
        verification_commands: [
            'php artisan tinker --execute "DB::connection()->getPdo();"',
            'php artisan queue:failed',
            'php artisan queue:retry all',
            'redis-cli ping'
        ]
    }
};

/**
 * Dynamically extract a structured report from custom project logs
 */
export function generateDynamicReportFromLogs(events, rawText) {
    if (!events || events.length === 0) {
        return {
            root_cause: 'Log file loaded, but no error or critical anomalies were detected matching current severity filters.',
            affected_components: ['Application Logger'],
            severity: 'LOW',
            severity_reason: 'All parsed log entries are INFO or normal operational messages.',
            remediation_steps: [
                '1. Problem: No anomalies detected. Action: System logs indicate healthy operation. Continue standard monitoring.'
            ],
            verification_commands: ['php artisan route:list', 'php artisan queue:failed'],
            is_simulated: true
        };
    }

    // Find the highest severity event
    const critEvent = events.find((e) => e.level === 'CRITICAL');
    const errEvent = events.find((e) => e.level === 'ERROR' || e.isException);
    const mainEvent = critEvent || errEvent || events[0];

    const severity = critEvent ? 'CRITICAL' : errEvent ? 'HIGH' : 'MEDIUM';

    // Extract potential component names / files from message or stack trace
    const textToScan = `${mainEvent.message} ${mainEvent.stackTrace.slice(0, 5).join(' ')}`;
    const componentMatches = textToScan.match(/[A-Z][a-zA-Z0-9_\\]+(?:Controller|Service|Middleware|Exception|Job|Model|Connection)/g) || [];
    const uniqueComponents = Array.from(new Set(componentMatches)).slice(0, 4);

    if (uniqueComponents.length === 0) {
        uniqueComponents.push(mainEvent.channel || 'System Kernel', 'Application Router');
    }

    // Extract first error line
    const cleanMsg = mainEvent.message.replace(/\{.*\}/g, '').trim();

    return {
        root_cause: `Detected ${mainEvent.level} anomaly: ${cleanMsg.slice(0, 180)}. Root cause involves ${uniqueComponents[0] || 'an unhandled application exception'}.`,
        affected_components: uniqueComponents,
        severity: severity,
        severity_reason: `Anomaly classified as ${severity} due to exception propagation at [${mainEvent.timestamp}] in ${mainEvent.channel}.`,
        remediation_steps: [
            `1. Problem: ${cleanMsg.slice(0, 120)}. Action: Inspect ${uniqueComponents[0] || 'the affected controller'} and handle exception safely.`,
            `2. Problem: Error in channel ${mainEvent.channel}. Action: Review relevant routes and validation middleware in routes/web.php or routes/api.php.`,
            `3. Problem: Stack trace recursion in vendor packages. Action: Check database connection and verify environment variables in .env.`
        ],
        verification_commands: [
            'php artisan route:list',
            'tail -n 40 storage/logs/laravel.log | grep -E "ERROR|CRITICAL"',
            'php artisan config:clear && php artisan cache:clear'
        ],
        is_simulated: true
    };
}
