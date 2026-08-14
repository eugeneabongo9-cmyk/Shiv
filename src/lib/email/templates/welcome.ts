import { SITE_URL, SITE_NAME } from '$lib/constants/site';
import { MEMBERSHIP_TIERS, type PaidMembershipTier } from '$lib/constants/tiers';
import { ctaButton, escapeHtml, renderEmailLayout } from '$lib/email/layout';

export function buildWelcomeEmail(input: { name: string; tier: PaidMembershipTier }): {
	subject: string;
	html: string;
	text: string;
} {
	const tier = MEMBERSHIP_TIERS[input.tier];
	const content = renderEmailLayout({
		preheader: `Your ${SITE_NAME} access is active.`,
		title: 'Your access is live',
		intro: `${input.name}, your ${tier.label.toLowerCase()} access is now active.`,
		body: `
			<p>You can log in now and head straight into the dashboard, the curriculum roadmap, upcoming live sessions, and the private member environment.</p>
			${ctaButton(`${SITE_URL}/dashboard`, 'Open your dashboard')}
			<p>Your current access level: <strong>${escapeHtml(tier.label)}</strong>.</p>
		`
	});

	return {
		subject: `Welcome to ${SITE_NAME}`,
		...content
	};
}
