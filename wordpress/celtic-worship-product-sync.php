<?php
/**
 * Plugin Name: Celtic Worship Product Sync
 * Description: Pushes the public WooCommerce catalogue to the Celtic Worship Cloudflare Worker.
 * Version: 1.0.0
 */

defined('ABSPATH') || exit;

final class CW_Product_Sync {
    private const QUEUE_OPTION = 'cw_product_sync_queue';
    private const CRON_HOOK = 'cw_product_sync_deliver';
    private const MAX_ATTEMPTS = 6;

    public static function boot(): void {
        add_action('save_post_product', [self::class, 'schedule_upsert'], 30, 3);
        add_action('woocommerce_product_set_stock', [self::class, 'schedule_stock'], 30);
        add_action('woocommerce_variation_set_stock', [self::class, 'schedule_stock'], 30);
        add_action('before_delete_post', [self::class, 'schedule_delete'], 10, 2);
        add_action('trashed_post', [self::class, 'schedule_delete'], 10, 1);
        add_action('untrashed_post', [self::class, 'schedule_restore'], 10, 1);
        add_action(self::CRON_HOOK, [self::class, 'deliver'], 10, 1);
        add_action('admin_menu', [self::class, 'admin_menu']);
        add_action('admin_post_cw_product_full_sync', [self::class, 'admin_full_sync']);
        add_action('admin_post_cw_product_sync_settings', [self::class, 'admin_settings']);
        if (defined('WP_CLI') && WP_CLI) WP_CLI::add_command('cw-products sync', [self::class, 'cli_full_sync']);
    }

    private static function configured(): bool {
        return self::sync_url() !== '' && self::sync_secret() !== '';
    }

    private static function sync_url(): string {
        return defined('CW_PRODUCT_SYNC_URL') ? (string) CW_PRODUCT_SYNC_URL : (string) get_option('cw_product_sync_url', '');
    }

    private static function sync_secret(): string {
        return defined('CW_PRODUCT_SYNC_SECRET') ? (string) CW_PRODUCT_SYNC_SECRET : (string) get_option('cw_product_sync_secret', '');
    }

    private static function event_id(string $prefix): string {
        return $prefix . ':' . time() . ':' . wp_generate_uuid4();
    }

    public static function schedule_upsert(int $post_id, WP_Post $post, bool $update): void {
        if (wp_is_post_revision($post_id) || $post->post_type !== 'product') return;
        self::queue_job('upsert', $post_id, 10);
    }

    public static function schedule_stock($product): void {
        if (!is_a($product, 'WC_Product')) return;
        $id = $product->is_type('variation') ? $product->get_parent_id() : $product->get_id();
        self::queue_job('upsert', (int) $id, 5);
    }

    public static function schedule_delete(int $post_id, $post = null): void {
        $type = $post instanceof WP_Post ? $post->post_type : get_post_type($post_id);
        if ($type === 'product') self::queue_job('delete', $post_id, 1);
    }

    public static function schedule_restore(int $post_id): void {
        if (get_post_type($post_id) === 'product') self::queue_job('upsert', $post_id, 5);
    }

    private static function queue_job(string $mode, int $product_id = 0, int $delay = 1): string {
        $id = self::event_id($mode);
        $queue = get_option(self::QUEUE_OPTION, []);
        $queue[$id] = ['mode' => $mode, 'product_id' => $product_id, 'attempts' => 0, 'created_at' => time()];
        update_option(self::QUEUE_OPTION, $queue, false);
        wp_schedule_single_event(time() + $delay, self::CRON_HOOK, [$id]);
        return $id;
    }

    private static function store_request(string $path, array $query = []): array {
        $request = new WP_REST_Request('GET', '/wc/store/v1' . $path);
        foreach ($query as $key => $value) $request->set_param($key, $value);
        $response = rest_do_request($request);
        if (is_wp_error($response) || $response->get_status() >= 400) throw new RuntimeException('Woo Store API failed for ' . $path);
        $data = $response->get_data();
        if (!is_array($data)) throw new RuntimeException('Woo Store API returned invalid data for ' . $path);
        return $data;
    }

    private static function categories(): array {
        return self::store_request('/products/categories', ['per_page' => 100]);
    }

    private static function variations(int $product_id): array {
        return self::store_request('/products', ['type' => 'variation', 'parent' => $product_id, 'per_page' => 100]);
    }

    private static function upsert_payload(string $event_id, int $product_id): array {
        $products = self::store_request('/products', ['include' => (string) $product_id, 'per_page' => 1]);
        if (!$products) return ['eventId' => $event_id, 'mode' => 'delete', 'productId' => $product_id, 'categories' => self::categories()];
        return [
            'eventId' => $event_id,
            'mode' => 'upsert',
            'product' => $products[0],
            'variations' => ($products[0]['type'] ?? '') === 'variable' ? self::variations($product_id) : [],
            'categories' => self::categories(),
        ];
    }

    private static function full_payload(string $event_id): array {
        $products = self::store_request('/products', ['per_page' => 100, 'orderby' => 'date', 'order' => 'desc']);
        $variations = [];
        foreach ($products as $product) {
            if (($product['type'] ?? '') === 'variable') $variations[(string) $product['id']] = self::variations((int) $product['id']);
        }
        return ['eventId' => $event_id, 'mode' => 'full', 'products' => $products, 'categories' => self::categories(), 'variationsByProduct' => $variations];
    }

    private static function send(array $payload): void {
        if (!self::configured()) throw new RuntimeException('The Worker URL and product sync secret have not been configured.');
        $body = wp_json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, self::sync_secret());
        $response = wp_remote_post(self::sync_url(), [
            'timeout' => 30,
            'headers' => ['Content-Type' => 'application/json', 'X-CW-Timestamp' => $timestamp, 'X-CW-Signature' => 'sha256=' . $signature],
            'body' => $body,
        ]);
        if (is_wp_error($response)) throw new RuntimeException($response->get_error_message());
        $status = wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) throw new RuntimeException('Worker returned HTTP ' . $status . ': ' . substr(wp_remote_retrieve_body($response), 0, 300));
    }

    public static function deliver(string $event_id): void {
        $queue = get_option(self::QUEUE_OPTION, []);
        if (empty($queue[$event_id])) return;
        $job = $queue[$event_id];
        try {
            if ($job['mode'] === 'full') $payload = self::full_payload($event_id);
            elseif ($job['mode'] === 'delete') $payload = ['eventId' => $event_id, 'mode' => 'delete', 'productId' => (int) $job['product_id'], 'categories' => self::categories()];
            else $payload = self::upsert_payload($event_id, (int) $job['product_id']);
            self::send($payload);
            unset($queue[$event_id]);
            update_option(self::QUEUE_OPTION, $queue, false);
            error_log('[Celtic Worship product sync] delivered ' . $event_id);
        } catch (Throwable $error) {
            $job['attempts']++;
            $job['last_error'] = $error->getMessage();
            $queue[$event_id] = $job;
            update_option(self::QUEUE_OPTION, $queue, false);
            error_log('[Celtic Worship product sync] failed ' . $event_id . ': ' . $error->getMessage());
            if ($job['attempts'] < self::MAX_ATTEMPTS) wp_schedule_single_event(time() + min(3600, 30 * (2 ** $job['attempts'])), self::CRON_HOOK, [$event_id]);
        }
    }

    public static function admin_menu(): void {
        add_management_page('Product Sync', 'Product Sync', 'manage_woocommerce', 'cw-product-sync', [self::class, 'admin_page']);
    }

    public static function admin_page(): void {
        if (!current_user_can('manage_woocommerce')) return;
        $queue = get_option(self::QUEUE_OPTION, []);
        echo '<div class="wrap"><h1>Celtic Worship Product Sync</h1>';
        echo '<p>Status: <strong>' . (self::configured() ? 'Configured' : 'Worker URL or secret missing') . '</strong></p>';
        echo '<p>Queued or failed deliveries: ' . esc_html((string) count($queue)) . '</p>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('cw_product_sync_settings');
        echo '<input type="hidden" name="action" value="cw_product_sync_settings">';
        echo '<table class="form-table"><tr><th><label for="cw-sync-url">Worker sync URL</label></th><td><input class="regular-text" id="cw-sync-url" name="sync_url" type="url" required value="' . esc_attr(self::sync_url()) . '"></td></tr>';
        echo '<tr><th><label for="cw-sync-secret">Webhook secret</label></th><td><input class="regular-text" id="cw-sync-secret" name="sync_secret" type="password" autocomplete="new-password" placeholder="Leave blank to keep the current secret"></td></tr></table>';
        submit_button('Save sync settings');
        echo '</form><hr>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('cw_product_full_sync');
        echo '<input type="hidden" name="action" value="cw_product_full_sync">';
        submit_button('Queue full product sync');
        echo '</form></div>';
    }

    public static function admin_full_sync(): void {
        if (!current_user_can('manage_woocommerce')) wp_die('Forbidden', 403);
        check_admin_referer('cw_product_full_sync');
        self::queue_job('full');
        wp_safe_redirect(add_query_arg('cw_sync', 'queued', admin_url('tools.php?page=cw-product-sync')));
        exit;
    }

    public static function admin_settings(): void {
        if (!current_user_can('manage_woocommerce')) wp_die('Forbidden', 403);
        check_admin_referer('cw_product_sync_settings');
        $url = esc_url_raw(wp_unslash($_POST['sync_url'] ?? ''));
        if (!$url || parse_url($url, PHP_URL_SCHEME) !== 'https') wp_die('A valid HTTPS Worker URL is required.', 400);
        update_option('cw_product_sync_url', $url, false);
        $secret = trim((string) wp_unslash($_POST['sync_secret'] ?? ''));
        if ($secret !== '') update_option('cw_product_sync_secret', $secret, false);
        wp_safe_redirect(admin_url('tools.php?page=cw-product-sync'));
        exit;
    }

    public static function cli_full_sync(): void {
        $id = self::queue_job('full');
        self::deliver($id);
        WP_CLI::success('Full product sync processed.');
    }
}

add_action('plugins_loaded', [CW_Product_Sync::class, 'boot']);
