<?php
/**
 * Plugin Name: Celtic Worship Commerce Backup
 * Description: Creates a resumable, signed snapshot of the WordPress database in the private Cloudflare commerce backup bucket.
 * Version: 1.0.0
 */

defined('ABSPATH') || exit;

final class CW_Commerce_Backup {
    private const STATE_OPTION = 'cw_commerce_backup_state';
    private const CRON_HOOK = 'cw_commerce_backup_step';
    private const CHUNK_ROWS = 100;
    private const MAX_ATTEMPTS = 8;

    public static function boot(): void {
        add_action('admin_menu', [self::class, 'admin_menu']);
        add_action('admin_post_cw_commerce_backup_start', [self::class, 'admin_start']);
        add_action('admin_post_cw_commerce_backup_step', [self::class, 'admin_step']);
        add_action(self::CRON_HOOK, [self::class, 'run_step']);
        if (defined('WP_CLI') && WP_CLI) WP_CLI::add_command('cw-commerce backup', [self::class, 'cli_backup']);
    }

    private static function sync_secret(): string {
        return defined('CW_PRODUCT_SYNC_SECRET') ? (string) CW_PRODUCT_SYNC_SECRET : (string) get_option('cw_product_sync_secret', '');
    }

    private static function endpoint(): string {
        $product_url = defined('CW_PRODUCT_SYNC_URL') ? (string) CW_PRODUCT_SYNC_URL : (string) get_option('cw_product_sync_url', '');
        if (!$product_url) return '';
        $endpoint = preg_replace('~/api/internal/product-sync/?$~', '/api/internal/commerce-backup', $product_url);
        return is_string($endpoint) && $endpoint !== $product_url ? $endpoint : '';
    }

    private static function configured(): bool {
        return self::endpoint() !== '' && self::sync_secret() !== '';
    }

    private static function event_id(string $prefix): string {
        return $prefix . ':' . time() . ':' . wp_generate_uuid4();
    }

    private static function now(): string {
        return gmdate('c');
    }

    private static function source_high_watermark(): string {
        global $wpdb;
        $orders_table = $wpdb->prefix . 'wc_orders';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $orders_table));
        if ($exists === $orders_table) {
            $value = $wpdb->get_var("SELECT MAX(date_updated_gmt) FROM `{$orders_table}`");
            if (is_string($value) && $value !== '') return gmdate('c', strtotime($value . ' UTC'));
        }
        return self::now();
    }

    private static function table_manifest(): array {
        global $wpdb;
        $like = $wpdb->esc_like($wpdb->prefix) . '%';
        $names = $wpdb->get_col($wpdb->prepare('SHOW TABLES LIKE %s', $like));
        sort($names, SORT_STRING);
        $tables = [];
        foreach ($names as $name) {
            if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) continue;
            $create_row = $wpdb->get_row("SHOW CREATE TABLE `{$name}`", ARRAY_N);
            $tables[] = [
                'name' => $name,
                'rows' => (int) $wpdb->get_var("SELECT COUNT(*) FROM `{$name}`"),
                'createSql' => isset($create_row[1]) ? (string) $create_row[1] : '',
            ];
        }
        return $tables;
    }

    private static function send(array $payload): void {
        $body = wp_json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($body)) throw new RuntimeException('Could not encode the backup payload.');
        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, self::sync_secret());
        $response = wp_remote_post(self::endpoint(), [
            'timeout' => 60,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-CW-Timestamp' => $timestamp,
                'X-CW-Signature' => 'sha256=' . $signature,
            ],
            'body' => $body,
        ]);
        if (is_wp_error($response)) throw new RuntimeException($response->get_error_message());
        $status = wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Worker returned HTTP ' . $status . ': ' . substr(wp_remote_retrieve_body($response), 0, 300));
        }
    }

    private static function encoded_rows(string $table, int $offset): array {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM `{$table}` LIMIT %d OFFSET %d", self::CHUNK_ROWS, $offset), ARRAY_A);
        return array_map(static function (array $row): array {
            $encoded = [];
            foreach ($row as $column => $value) $encoded[$column] = $value === null ? null : base64_encode((string) $value);
            return $encoded;
        }, $rows);
    }

    private static function rows_checksum(array $rows): string {
        $canonical = '';
        foreach ($rows as $row) {
            ksort($row, SORT_STRING);
            foreach ($row as $key => $value) {
                $canonical .= strlen((string) $key) . ':' . $key . ':';
                $canonical .= $value === null ? '-1:' : strlen((string) $value) . ':' . $value;
                $canonical .= ';';
            }
            $canonical .= "\n";
        }
        return hash('sha256', $canonical);
    }

    private static function schedule_next(int $delay = 1): void {
        if (!wp_next_scheduled(self::CRON_HOOK)) wp_schedule_single_event(time() + $delay, self::CRON_HOOK);
    }

    private static function save_failure(array $state, Throwable $error): void {
        $state['attempts'] = ((int) ($state['attempts'] ?? 0)) + 1;
        $state['last_error'] = $error->getMessage();
        $state['updated_at'] = self::now();
        if ($state['attempts'] >= self::MAX_ATTEMPTS) $state['status'] = 'failed';
        update_option(self::STATE_OPTION, $state, false);
        if ($state['status'] !== 'failed') self::schedule_next(min(3600, 30 * (2 ** $state['attempts'])));
        error_log('[Celtic Worship commerce backup] ' . $error->getMessage());
    }

    private static function begin(): array {
        if (!self::configured()) throw new RuntimeException('Product Sync must be configured before starting a commerce backup.');
        $tables = self::table_manifest();
        $run_id = 'wp-' . gmdate('YmdHis') . '-' . wp_generate_uuid4();
        $started_at = self::now();
        self::send([
            'action' => 'start',
            'eventId' => self::event_id('backup-start'),
            'runId' => $run_id,
            'startedAt' => $started_at,
            'sourceHighWatermark' => self::source_high_watermark(),
            'tables' => $tables,
        ]);
        $state = [
            'run_id' => $run_id,
            'status' => 'running',
            'started_at' => $started_at,
            'updated_at' => $started_at,
            'tables' => $tables,
            'table_index' => 0,
            'offset' => 0,
            'chunk' => 0,
            'record_counts' => [],
            'attempts' => 0,
            'last_error' => '',
        ];
        update_option(self::STATE_OPTION, $state, false);
        self::schedule_next();
        return $state;
    }

    public static function run_step(): void {
        $state = get_option(self::STATE_OPTION, []);
        if (!is_array($state) || ($state['status'] ?? '') !== 'running') return;
        try {
            $tables = $state['tables'] ?? [];
            $index = (int) ($state['table_index'] ?? 0);
            if ($index >= count($tables)) {
                self::send([
                    'action' => 'complete',
                    'eventId' => self::event_id('backup-complete'),
                    'runId' => $state['run_id'],
                    'completedAt' => self::now(),
                    'sourceHighWatermark' => self::source_high_watermark(),
                    'recordCounts' => (object) ($state['record_counts'] ?? []),
                ]);
                $state['status'] = 'complete';
                $state['completed_at'] = self::now();
                $state['updated_at'] = $state['completed_at'];
                $state['last_error'] = '';
                update_option(self::STATE_OPTION, $state, false);
                return;
            }
            $table = $tables[$index];
            $table_name = (string) $table['name'];
            $offset = (int) ($state['offset'] ?? 0);
            $rows = self::encoded_rows($table_name, $offset);
            if (!$rows) {
                $state['record_counts'][$table_name] = $offset;
                $state['table_index'] = $index + 1;
                $state['offset'] = 0;
                $state['chunk'] = 0;
            } else {
                self::send([
                    'action' => 'table_chunk',
                    'eventId' => self::event_id('backup-chunk'),
                    'runId' => $state['run_id'],
                    'table' => $table_name,
                    'chunk' => (int) ($state['chunk'] ?? 0),
                    'offset' => $offset,
                    'rows' => $rows,
                    'checksumSha256' => self::rows_checksum($rows),
                ]);
                $state['offset'] = $offset + count($rows);
                $state['chunk'] = ((int) ($state['chunk'] ?? 0)) + 1;
            }
            $state['attempts'] = 0;
            $state['last_error'] = '';
            $state['updated_at'] = self::now();
            update_option(self::STATE_OPTION, $state, false);
            self::schedule_next();
        } catch (Throwable $error) {
            self::save_failure($state, $error);
        }
    }

    public static function admin_menu(): void {
        add_management_page('Commerce Backup', 'Commerce Backup', 'manage_woocommerce', 'cw-commerce-backup', [self::class, 'admin_page']);
    }

    public static function admin_page(): void {
        if (!current_user_can('manage_woocommerce')) return;
        $state = get_option(self::STATE_OPTION, []);
        echo '<div class="wrap"><h1>Celtic Worship Commerce Backup</h1>';
        echo '<p>Destination: <strong>private Cloudflare R2 commerce backup bucket</strong></p>';
        echo '<p>Configuration: <strong>' . (self::configured() ? 'Ready' : 'Product Sync URL or secret missing') . '</strong></p>';
        if (is_array($state) && !empty($state)) {
            echo '<p>Run: <code>' . esc_html((string) ($state['run_id'] ?? '')) . '</code></p>';
            echo '<p>Status: <strong>' . esc_html((string) ($state['status'] ?? 'unknown')) . '</strong></p>';
            echo '<p>Progress: table ' . esc_html((string) (((int) ($state['table_index'] ?? 0)) + 1)) . ' of ' . esc_html((string) count($state['tables'] ?? [])) . ', row ' . esc_html((string) ($state['offset'] ?? 0)) . '</p>';
            if (!empty($state['last_error'])) echo '<p class="notice notice-error"><strong>Last error:</strong> ' . esc_html((string) $state['last_error']) . '</p>';
        }
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('cw_commerce_backup_start');
        echo '<input type="hidden" name="action" value="cw_commerce_backup_start">';
        submit_button('Start new full snapshot', 'primary', 'submit', false, ['onclick' => "return confirm('Start a new full database snapshot? The live store will remain online and unchanged.');"]);
        echo '</form> ';
        if (($state['status'] ?? '') === 'running' || ($state['status'] ?? '') === 'failed') {
            echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="display:inline-block;margin-left:8px">';
            wp_nonce_field('cw_commerce_backup_step');
            echo '<input type="hidden" name="action" value="cw_commerce_backup_step">';
            submit_button('Run next batch now', 'secondary', 'submit', false);
            echo '</form>';
        }
        if (($state['status'] ?? '') === 'running') echo '<script>setTimeout(function(){ location.reload(); }, 10000);</script>';
        echo '</div>';
    }

    public static function admin_start(): void {
        if (!current_user_can('manage_woocommerce')) wp_die('Forbidden', 403);
        check_admin_referer('cw_commerce_backup_start');
        try { self::begin(); }
        catch (Throwable $error) {
            update_option(self::STATE_OPTION, ['status' => 'failed', 'last_error' => $error->getMessage(), 'updated_at' => self::now()], false);
        }
        wp_safe_redirect(admin_url('tools.php?page=cw-commerce-backup'));
        exit;
    }

    public static function admin_step(): void {
        if (!current_user_can('manage_woocommerce')) wp_die('Forbidden', 403);
        check_admin_referer('cw_commerce_backup_step');
        $state = get_option(self::STATE_OPTION, []);
        if (($state['status'] ?? '') === 'failed') {
            $state['status'] = 'running';
            $state['attempts'] = 0;
            update_option(self::STATE_OPTION, $state, false);
        }
        self::run_step();
        wp_safe_redirect(admin_url('tools.php?page=cw-commerce-backup'));
        exit;
    }

    public static function cli_backup(): void {
        $state = self::begin();
        while (($state['status'] ?? '') === 'running') {
            self::run_step();
            $state = get_option(self::STATE_OPTION, []);
        }
        if (($state['status'] ?? '') !== 'complete') WP_CLI::error((string) ($state['last_error'] ?? 'Backup failed.'));
        WP_CLI::success('Commerce snapshot completed: ' . $state['run_id']);
    }
}

add_action('plugins_loaded', [CW_Commerce_Backup::class, 'boot']);
