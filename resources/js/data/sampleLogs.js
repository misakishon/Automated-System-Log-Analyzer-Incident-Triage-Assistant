/**
 * Quick Load Presets for LogGuard AI
 * Realistic IT, Laravel, Nginx & Database system logs for Incident Triage
 */

export const SAMPLE_LOGS = {
    iconnect: `[2026-11-03 14:22:04] production.INFO: Request initiated: POST /api/v1/auth/login {"ip": "192.168.1.104", "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "actor": "usr_4921_std"}
[2026-11-03 14:22:05] production.INFO: User authentication succeeded for usr_4921_std [role: standard_user, scope: read_basic]
[2026-11-03 14:22:15] production.WARNING: Unauthorized access attempt to /admin/config by non-admin actor usr_4921_std {"ip": "192.168.1.104", "role": "standard", "resource": "App\\Http\\Controllers\\Admin\\ConfigController@index"}
[2026-11-03 14:22:15] production.WARNING: Illuminate\\Auth\\Access\\AuthorizationException: This action is unauthorized. {"route": "/admin/config", "actor": "usr_4921_std", "policy": "AdminPolicy@view"}
[2026-11-03 14:22:42] production.INFO: Dispatching bulk export request: GET /api/v1/consumers/export {"actor": "usr_4921_std", "records_requested": 48200}
[2026-11-03 14:22:43] production.WARNING: SensitiveDataExportAudit: Actor usr_4921_std initiated bulk export of PII consumer database without supervisor clearance {"records": 48200, "status": "flagged_mfa_missing"}
[2026-11-03 14:23:01] production.CRITICAL: Malicious or destructive query execution detected: DELETE FROM consumers WHERE 1=1 {"actor": "usr_4921_std", "origin_ip": "192.168.1.104", "source": "Sandbox/AdminTrigger"}
[2026-11-03 14:23:02] production.ERROR: SQLSTATE[23000]: Integrity constraint violation: 1451 Cannot delete or update a parent row: a foreign key constraint fails ("iconnect_db"."meter_readings", CONSTRAINT "fk_meter_consumer" FOREIGN KEY ("consumer_id") REFERENCES "consumers" ("id")) (Connection: mysql, SQL: delete from \`consumers\`)
[2026-11-03 14:23:02] production.ERROR: Illuminate\\Database\\QueryException: SQLSTATE[23000]: Integrity constraint violation: 1451 Cannot delete or update a parent row: a foreign key constraint fails in /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Database/Connection.php:760
Stack trace:
#0 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Database/Connection.php(718): Illuminate\\Database\\Connection->runQueryCallback('delete from \`co...', Array, Object(Closure))
#1 /var/www/iconnect/app/Http/Controllers/ConsumerController.php(142): Illuminate\\Database\\Connection->delete('delete from \`co...')
#2 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Routing/ControllerDispatcher.php(48): App\\Http\\Controllers\\ConsumerController->destroyAll(Object(Illuminate\\Http\\Request))
#3 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Routing/Route.php(261): Illuminate\\Routing\\ControllerDispatcher->dispatch(Object(Illuminate\\Routing\\Route), Object(App\\Http\\Controllers\\ConsumerController), 'destroyAll')
#4 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Routing/Router.php(798): Illuminate\\Routing\\Route->run()
[2026-11-03 14:23:18] production.CRITICAL: App\\Exceptions\\Handler: Transaction rolled back due to fatal QueryException on table 'consumers'
[2026-11-03 14:23:45] production.ERROR: RedisException: Connection to Redis host queue-master:6379 failed: Connection refused. Unable to enqueue dead-letter notification.`,

    nginx_error: `[2026-11-03 13:42:01] nginx.INFO: 2026/11/03 13:42:01 [info] 14092#14092: *91020 client 172.16.20.5 closed keepalive connection
[2026-11-03 13:45:18] nginx.ERROR: 2026/11/03 13:45:18 [error] 14092#14092: *91024 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 172.16.20.5, server: api.iconnect.internal, request: "POST /api/v2/payments/batch HTTP/1.1", upstream: "fastcgi://127.0.0.1:9000", host: "api.iconnect.internal"
[2026-11-03 13:45:19] nginx.ERROR: 2026/11/03 13:45:19 [warn] 14092#14092: *91025 FastCGI primary worker buffer overflow: response buffered to temporary file /var/cache/nginx/fastcgi_temp/3/04/0000000403
[2026-11-03 13:45:20] nginx.CRITICAL: 2026/11/03 13:45:20 [alert] 14092#14092: *91028 1024 worker_connections are not enough while connecting to upstream
[2026-11-03 13:45:22] php-fpm.WARNING: [03-Nov-2026 13:45:22] WARNING: [pool www] server reached pm.max_children setting (50), consider raising it
[2026-11-03 13:45:25] nginx.ERROR: 2026/11/03 13:45:25 [error] 14092#14092: *91035 connect() to unix:/var/run/php/php8.2-fpm.sock failed (11: Resource temporarily unavailable) while connecting to upstream, client: 172.16.20.12, server: api.iconnect.internal, request: "GET /health/live HTTP/1.1", upstream: "fastcgi://unix:/var/run/php/php8.2-fpm.sock:"
[2026-11-03 13:45:30] nginx.CRITICAL: 2026/11/03 13:45:30 [error] 14092#14092: *91040 upstream prematurely closed FastCGI stdout while reading response header from upstream, client: 172.16.20.8, server: api.iconnect.internal, request: "POST /api/v1/sync HTTP/1.1"`,

    db_timeout: `[2026-11-03 13:45:10] production.INFO: Inbound batch billing synchronization worker started {"pid": 28410, "queue": "payments_high"}
[2026-11-03 13:45:14] production.CRITICAL: Illuminate\\Database\\QueryException: SQLSTATE[HY000] [2002] Connection timed out (Connection: mysql, Host: 10.0.4.15:3306, Database: utility_production)
[2026-11-03 13:45:15] production.ERROR: PDOException: SQLSTATE[HY000] [2002] Connection timed out in /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Database/Connectors/Connector.php:70
Stack trace:
#0 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Database/Connectors/Connector.php(70): PDO->__construct('mysql:host=10.0...', 'iconnect_user', '********', Array)
#1 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Database/Connectors/MySqlConnector.php(38): Illuminate\\Database\\Connectors\\Connector->createPdoConnection('mysql:host=10.0...', 'iconnect_user', '********', Array)
#2 /var/www/iconnect/vendor/laravel/framework/src/Illuminate/Database/Connectors/ConnectionFactory.php(184): Illuminate\\Database\\Connectors\\MySqlConnector->connect(Array)
[2026-11-03 13:45:22] production.CRITICAL: Illuminate\\Queue\\MaxAttemptsExceededException: App\\Jobs\\ProcessBatchBilling has been attempted too many times or timed out.
[2026-11-03 13:45:30] production.ERROR: RedisException: Connection refused (redis-cluster.internal:6379). Worker pool supervisor degraded to failover mode.
[2026-11-03 13:45:35] production.WARNING: HealthCheckWatcher: Database probe to 10.0.4.15 failed after 5000ms latency threshold. Service health: DEGRADED.`
};
