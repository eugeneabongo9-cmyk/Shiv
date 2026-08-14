<?php
/**
 * VIP Founding Member — Checkout header partial.
 *
 * Included by shivworks-wc.php when the cart contains product 31518 (VIP).
 * Renders above the WooCommerce order review heading.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="shivworks-checkout-tier shivworks-checkout-vip">
    <div class="shivworks-tier-badge shivworks-tier-badge--vip">
        <span class="shivworks-tier-label">VIP Founding Member</span>
        <span class="shivworks-tier-distinction">Highest-touch lane</span>
    </div>

    <div class="shivworks-tier-summary">
        <h3>You are joining as a VIP Founding Member.</h3>
        <p>
            VIP includes everything in Bronze and extends your lane with a visible VIP
            distinction inside the Network, priority booking callouts on member sessions,
            and quarterly VIP call request access directly with the ShivWorks team.
            Founding members lock in the VIP launch price permanently.
        </p>
    </div>

    <ul class="shivworks-tier-features">
        <li>Everything in Bronze Founding Membership</li>
        <li>VIP profile and community badge</li>
        <li>Priority booking callout on livestreams</li>
        <li>Quarterly VIP call request access</li>
    </ul>

    <div class="shivworks-tier-note shivworks-tier-note--vip">
        <p>
            <strong>How access works:</strong> After checkout, sign in to
            <a href="https://network.shivworks.com" target="_blank" rel="noopener">network.shivworks.com</a>
            with this same email address. Your VIP distinction will be active within a few minutes.
        </p>
    </div>
</div>
