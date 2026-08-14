const publicEnv = import.meta.env;

export const SITE_NAME = 'ShivWorks Network';
export const SITE_TAGLINE = 'The private training platform for ShivWorks members.';
export const SITE_URL = publicEnv.PUBLIC_SITE_URL || 'https://network.shivworks.com';
export const SHIVWORKS_MAIN_SITE = publicEnv.PUBLIC_SHIVWORKS_MAIN_SITE || 'https://shivworks.com';
export const SHIVWORKS_STORE_URL =
	publicEnv.PUBLIC_SHIVWORKS_STORE_URL || 'https://shivworkspg.com';
export const SHIVWORKS_MEMBERSHIP_URL =
	publicEnv.PUBLIC_SHIVWORKS_MEMBERSHIP_URL || 'https://shivworkspg.com/theshivworksnetwork/';

// WC deep-link checkout URLs — Network buy buttons send users straight into a
// checkout-ready cart on the ShivWorks PG store. WC interprets
// ?add-to-cart=<product-id> by adding the item to the session cart, and /cart/
// then renders the line item with a Proceed to checkout button.
//
// These MUST target /cart/, not /checkout/. On a cold session,
// /checkout/?add-to-cart=<id> loses the product and WC bounces the buyer to an
// empty /cart/ with no way to pay — the store's own landing page hit this and
// it silently killed purchases.
//
// Product IDs are the canonical Bronze/VIP founding-member SKUs (also encoded
// server-side in src/lib/server/wc-webhook.ts).
export const WC_CHECKOUT_URLS = {
	bronze: `${SHIVWORKS_STORE_URL}/cart/?add-to-cart=31517`,
	vip: `${SHIVWORKS_STORE_URL}/cart/?add-to-cart=31518`
} as const;

/** WooCommerce customer account — orders, billing, and payment methods on the PG store. */
export const WC_MY_ACCOUNT_URL = `${SHIVWORKS_STORE_URL}/my-account/`;
export const CIRCLE_COMMUNITY_URL = publicEnv.PUBLIC_CIRCLE_COMMUNITY_URL || '';
export const SUPPORT_EMAIL = publicEnv.PUBLIC_SUPPORT_EMAIL || 'network@shivworks.com';

export const SOCIAL_LINKS = [
	{ label: 'Instagram', href: 'https://www.instagram.com/shivworks_official/' },
	{ label: 'YouTube', href: 'https://www.youtube.com/@shivworks' },
	{ label: 'Facebook', href: 'https://www.facebook.com/shivworks' }
];

export const PRIMARY_NAV = [
	{ label: 'Dashboard', href: '/dashboard' },
	{ label: 'Library', href: '/library' },
	{ label: 'Updates', href: '/updates' },
	{ label: 'Live', href: '/live' },
	{ label: 'Community', href: '/community' },
	{ label: 'People', href: '/people' }
];
