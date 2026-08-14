import { SITE_NAME } from '$lib/constants/site';
import { ctaButton, escapeHtml, renderEmailLayout } from '$lib/email/layout';

function renderBulletList(items: string[]): string {
	return `<ul style="margin:0;padding-left:20px;color:#d4d8df;">${items
		.map(
			(item) =>
				`<li style="margin:0 0 12px;"><span style="color:#f4efe6;">${escapeHtml(item)}</span></li>`
		)
		.join('')}</ul>`;
}

export function buildClientProgressUpdateEmail(input: {
	recipientName: string;
	senderName?: string;
	isDraft?: boolean;
	liveUrl: string;
	walkthroughUrl: string;
}): { subject: string; html: string; text: string } {
	const senderName = input.senderName ?? 'Micah';
	const draftPrefix = input.isDraft ? 'Draft: ' : '';

	const content = renderEmailLayout({
		preheader: `${draftPrefix}${SITE_NAME} progress update against the Phase 1 brief`,
		title: `${draftPrefix}ShivWorks Network progress update`,
		intro: `${input.recipientName}, here is the current ShivWorks Network progress update against the Phase 1 build brief. The network now operates like a real member product rather than a placeholder shell.`,
		body: `
			${
				input.isDraft
					? '<p style="margin:0 0 20px;color:#c8b27a;"><strong>Internal draft:</strong> sending this to ourselves first before it goes to Aaron.</p>'
					: ''
			}
			<p style="margin:0 0 16px;">Compared to the original brief, the Phase 1 platform now covers the main member experience layers:</p>

			<p style="margin:24px 0 10px;color:#ffffff;font-weight:700;">1. Member access, onboarding, and account control</p>
			${renderBulletList([
				'Clerk-managed sign in, signup, account recovery, and profile control',
				'Preview, Bronze, and VIP lanes inside the same product shell',
				'WooCommerce-based upgrade flow for new purchasers (Bronze/VIP add-to-cart deep links), with a route-preserving handoff after checkout',
				'Bulk member import plus create-your-password onboarding for previously purchased members',
				'Active-session visibility, revoke controls, and the two-device perimeter for shared-login deterrence'
			])}

			<p style="margin:24px 0 10px;color:#ffffff;font-weight:700;">2. The post-login network experience</p>
			${renderBulletList([
				'Operational dashboard and build-log/updates lane',
				'Full curriculum map with all 11 course lanes visible from day one',
				'Roadshow series lane and staged series treatment',
				'Live page with RSVP/reminder flow plus an active embed slot when a session goes live',
				'In-product community lane with Circle-backed launch shell and fallback behavior',
				'VIP request and booking workflow inside the product',
				'External resource hub, social footer, and account/settings surfaces'
			])}

			<p style="margin:24px 0 10px;color:#ffffff;font-weight:700;">3. Bonus progress beyond the original “shell only” Phase 1 brief</p>
			${renderBulletList([
				'Real gated playback is now in place with a free preview module and a paid member-only module',
				'Resume/progress tracking is live so members can continue training across sessions',
				'Notification preferences are wired for build updates, content-release alerts, and livestream reminders',
				'Transactional emails are in place for onboarding, welcome/access granted, build updates, content-release alerts, livestream reminders, VIP bookings, and session-security alerts',
				'Admin controls are live for courses, updates, events, external links, VIP booking actions, imports, and notification sends'
			])}

			<p style="margin:24px 0 10px;color:#ffffff;font-weight:700;">4. What this means relative to the brief</p>
			<p style="margin:0 0 16px;">The main Phase 1 member platform is in place. Remaining future-phase work is mostly continued content population, deeper community behavior beyond the current Circle-backed lane, and optional expansion into native mobile / TV apps later.</p>

			${ctaButton(input.liveUrl, 'Open the live network')}
			${ctaButton(input.walkthroughUrl, 'Open the earlier walkthrough')}

			<p style="margin:24px 0 0;">If you want, I can send this same update externally next after your review.</p>
			<p style="margin:16px 0 0;">— ${escapeHtml(senderName)}</p>
		`
	});

	return {
		subject: `${draftPrefix}ShivWorks Network — Phase 1 progress update`,
		...content
	};
}
