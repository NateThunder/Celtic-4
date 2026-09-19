<?php
/**
 * Plugin Name: Celtic Worship Cart Handoff
 * Description: Receives a browser cart and opens WooCommerce checkout without Worker-to-CMS requests.
 * Version: 1.0.1
 */
defined('ABSPATH') || exit;

add_action('woocommerce_api_cw_cart_handoff', function () {
    nocache_headers();
    $fail = static function ($message, $status = 400) {
        wp_die(esc_html($message), 'Unable to open checkout', ['response' => $status, 'back_link' => true]);
    };
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') $fail('Please start checkout from the shop cart.', 405);
    // A normal top-level browser POST supplies Origin. Do not accept arbitrary sites.
    $origins = apply_filters('cw_cart_handoff_origins', [
        'https://celticworship.co.uk',
        'https://www.celticworship.co.uk',
        'https://ifedadet1.sg-host.com',
    ]);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!in_array($origin, $origins, true)) $fail('Please start checkout from the Celtic Worship website.', 403);
    $raw = isset($_POST['items']) && is_string($_POST['items']) ? wp_unslash($_POST['items']) : '';
    if (!$raw || strlen($raw) > 65536) $fail('The cart is empty or too large. Please return to the shop.');
    $items = json_decode($raw, true);
    if (!is_array($items) || array_keys($items) !== range(0, count($items) - 1) || count($items) > 100) $fail('Invalid cart. Please return to the shop.');
    $prepared = [];
    foreach ($items as $item) {
        if (!is_array($item) || !is_int($item['id'] ?? null) || $item['id'] <= 0 ||
            !is_int($item['quantity'] ?? null) || $item['quantity'] < 1 || $item['quantity'] > 99) $fail('Invalid product or quantity. Please update your cart.');
        $product = wc_get_product($item['id']);
        if (!$product || !$product->is_purchasable() || !$product->is_in_stock() || !$product->has_enough_stock($item['quantity'])) {
            $fail('An item is unavailable or has insufficient stock. Please return to your cart and update it.');
        }
        if (!$product->is_type(['simple', 'variation'])) $fail('This product must be configured in the WooCommerce shop before purchasing.');
        $attributes = [];
        $options = $item['variation'] ?? [];
        if (!is_array($options) || count($options) > 20) $fail('Invalid product options.');
        foreach ($options as $option) {
            if (!is_array($option) || !is_string($option['attribute'] ?? null) || !is_string($option['value'] ?? null)) $fail('Invalid product options.');
            $key = 'attribute_' . sanitize_title(preg_replace('/^attribute_/', '', $option['attribute']));
            $attributes[$key] = wc_clean($option['value']);
        }
        $prepared[] = [$product, $item['quantity'], $attributes];
    }
    if (!WC()->cart) wc_load_cart();
    // Replace, rather than merge, so repeated submissions cannot double quantities.
    // Restore the previous cart if ANY item fails WooCommerce/plugin validation.
    $previous = WC()->cart->get_cart();
    $coupons = WC()->cart->get_applied_coupons();
    $notices = wc_get_notices();
    try {
        WC()->cart->empty_cart(false);
        foreach ($prepared as [$product, $quantity, $attributes]) {
            $variation_id = $product->is_type('variation') ? $product->get_id() : 0;
            $product_id = $variation_id ? $product->get_parent_id() : $product->get_id();
            if (!apply_filters('woocommerce_add_to_cart_validation', true, $product_id, $quantity, $variation_id, $attributes) ||
                !WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $attributes)) {
                throw new Exception('An item could not be added. Please check its options, availability and quantity.');
            }
        }
        WC()->cart->calculate_totals();
        WC()->session->set_customer_session_cookie(true);
        WC()->cart->set_session();
        wc_add_notice('Please review your order. Prices and availability have been checked; delivery and tax are calculated at checkout.', 'notice');
    } catch (Throwable $error) {
        WC()->cart->set_cart_contents($previous);
        WC()->cart->set_applied_coupons($coupons);
        WC()->cart->calculate_totals();
        WC()->cart->set_session();
        wc_set_notices($notices);
        $fail('We could not transfer your complete cart. Your previous checkout cart has been kept. Please return to the shop and check product options, quantities and availability.');
    }
    wp_safe_redirect(wc_get_checkout_url(), 303);
    exit;
});
