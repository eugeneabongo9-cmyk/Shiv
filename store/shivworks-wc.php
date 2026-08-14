<?php
/**
 * Plugin Name: ShivWorks Network — WooCommerce Integration
 * Description: Checkout tier messaging, member-count tracker shortcode, and Network webhook bridge for the ShivWorks WC store.
 * Version:     1.0.0
 * Author:      ShivWorks / Alex
 * Text Domain: shivworks-wc
 *
 * DEPLOYMENT: Upload to wp-content/plugins/shivworks-wc/ and activate.
 *             Or copy the functions into the child theme's functions.php.
 *
 * REQUIRES: WooCommerce active.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ─── Constants ────────────────────────────────────────────────────────────────

define( 'SHIVWORKS_BRONZE_PRODUCT_ID', 31517 );
define( 'SHIVWORKS_VIP_PRODUCT_ID',    31518 );
define( 'SHIVWORKS_NETWORK_API',       'https://network.shivworks.com/api/members' );

// ─── 1. Member-count tracker shortcode ───────────────────────────────────────
// Usage: [shivworks_member_count]
// Fetches live counts from the Network API (CORS-enabled endpoint).

add_shortcode( 'shivworks_member_count', 'shivworks_member_count_shortcode' );

function shivworks_member_count_shortcode( $atts ) {
    $atts = shortcode_atts( array(
        'show_vip'   => 'true',
        'show_total' => 'true',
        'class'      => '',
    ), $atts, 'shivworks_member_count' );

    $extra_class = esc_attr( $atts['class'] );
    $show_vip    = filter_var( $atts['show_vip'],   FILTER_VALIDATE_BOOLEAN );
    $show_total  = filter_var( $atts['show_total'], FILTER_VALIDATE_BOOLEAN );

    ob_start();
    ?>
    <div class="shivworks-member-count <?php echo $extra_class; ?>"
         data-api="<?php echo esc_url( SHIVWORKS_NETWORK_API ); ?>"
         data-show-vip="<?php echo $show_vip   ? 'true' : 'false'; ?>"
         data-show-total="<?php echo $show_total ? 'true' : 'false'; ?>">
        <span class="shivworks-mc-bronze">
            <span class="shivworks-mc-label">Bronze members</span>
            <span class="shivworks-mc-value" data-key="bronze">—</span>
        </span>
        <?php if ( $show_vip ) : ?>
        <span class="shivworks-mc-vip">
            <span class="shivworks-mc-label">VIP members</span>
            <span class="shivworks-mc-value" data-key="vip">—</span>
        </span>
        <?php endif; ?>
        <?php if ( $show_total ) : ?>
        <span class="shivworks-mc-total">
            <span class="shivworks-mc-label">Total founding members</span>
            <span class="shivworks-mc-value" data-key="total">—</span>
        </span>
        <?php endif; ?>
    </div>
    <script>
    (function() {
        document.querySelectorAll('.shivworks-member-count').forEach(function(el) {
            var api = el.dataset.api;
            if (!api) return;
            fetch(api, { cache: 'no-cache' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    el.querySelectorAll('.shivworks-mc-value').forEach(function(span) {
                        var key = span.dataset.key;
                        if (key && data[key] !== undefined) {
                            span.textContent = data[key].toLocaleString();
                        }
                    });
                })
                .catch(function() {
                    // Silent fail — leave dashes in place.
                });
        });
    })();
    </script>
    <?php
    return ob_get_clean();
}

// ─── 2. Checkout tier messaging ───────────────────────────────────────────────
// Hooks into WooCommerce checkout to inject Bronze / VIP-specific trust copy
// above the order review section. Detects which membership product is in cart.

add_action( 'woocommerce_checkout_before_order_review_heading', 'shivworks_checkout_tier_header' );

function shivworks_checkout_tier_header() {
    $cart   = WC()->cart;
    $tier   = shivworks_detect_cart_tier( $cart );

    if ( 'bronze' === $tier ) {
        include plugin_dir_path( __FILE__ ) . 'checkout-bronze.php';
    } elseif ( 'vip' === $tier ) {
        include plugin_dir_path( __FILE__ ) . 'checkout-vip.php';
    }
}

/**
 * Returns 'bronze', 'vip', or null based on the highest-value membership
 * product in the cart. VIP wins over Bronze if both are present.
 */
function shivworks_detect_cart_tier( $cart ) {
    if ( ! $cart || $cart->is_empty() ) {
        return null;
    }
    $tier = null;
    foreach ( $cart->get_cart() as $item ) {
        $pid = (int) $item['product_id'];
        if ( SHIVWORKS_VIP_PRODUCT_ID === $pid ) {
            return 'vip';  // VIP wins immediately.
        }
        if ( SHIVWORKS_BRONZE_PRODUCT_ID === $pid ) {
            $tier = 'bronze';
        }
    }
    return $tier;
}

// ─── 3. Thank-you page redirect to Network ────────────────────────────────────
// After a successful order, surface a "return to network" link.

add_action( 'woocommerce_thankyou', 'shivworks_thankyou_network_link', 20 );

function shivworks_thankyou_network_link( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    $tier = shivworks_detect_order_tier( $order );
    if ( ! $tier ) return;

    $billing_email = $order->get_billing_email();
    $network_url   = 'https://theshivworksnetwork.com/signup?provisioned=1&email=' . rawurlencode( $billing_email );
    ?>
    <div class="shivworks-thankyou-cta">
        <h2>Your ShivWorks Network access is being provisioned.</h2>
        <p>
            Your membership will be active within a few minutes. Create your account on the Network
            using the same email address you used at checkout.
        </p>
        <a href="<?php echo esc_url( $network_url ); ?>" class="button">
            Create your Network account
        </a>
    </div>
    <?php
}

function shivworks_detect_order_tier( $order ) {
    foreach ( $order->get_items() as $item ) {
        $pid = (int) $item->get_product_id();
        if ( SHIVWORKS_VIP_PRODUCT_ID === $pid )    return 'vip';
        if ( SHIVWORKS_BRONZE_PRODUCT_ID === $pid ) return 'bronze';
    }
    return null;
}
