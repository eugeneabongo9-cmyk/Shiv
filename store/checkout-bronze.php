<?php
/**
 * Bronze Founding Member — Checkout header partial.
 *
 * Included by shivworks-wc.php when the cart contains product 31517 (Bronze).
 * Renders above the WooCommerce order review heading.
 *
 * Do NOT echo output from this file — return it via ob_start/ob_get_clean if
 * you are calling it from a shortcode context. When called via include() from
 * a hook it outputs directly.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="shivworks-checkout-tier shivworks-checkout-bronze">
    <div class="shivworks-tier-badge">
        <span class="shivworks-tier-label">Bronze Founding Member</span>
    </div>

    <div class="shivworks-tier-summary">
        <h3>You are joining as a Bronze Founding Member.</h3>
        <p>
            Bronze gives you full access to the ShivWorks Network — courses, community,
            livestreams, and the complete curriculum as it ships. Founding members lock
            in the launch price and keep it as long as their membership is active.
        </p>
    </div>

    <ul class="shivworks-tier-features">
        <li>Full curriculum access as modules release</li>
        <li>Roadshow docu-series access</li>
        <li>Bi-monthly member livestreams</li>
        <li>Private member community (Circle)</li>
    </ul>

    <div class="shivworks-tier-note">
        <p>
            <strong>How access works:</strong> After checkout, sign in to
            <a href="https://network.shivworks.com" target="_blank" rel="noopener">network.shivworks.com</a>
            with this same email address. Your membership will be active within a few minutes.
        </p>
    </div>
</div>
