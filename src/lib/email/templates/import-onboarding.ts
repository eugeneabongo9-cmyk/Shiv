import { SITE_NAME, SITE_URL } from '$lib/constants/site';
import { MEMBERSHIP_TIERS, type MembershipTier } from '$lib/constants/tiers';
import { ctaButton, escapeHtml, renderEmailLayout } from '$lib/email/layout';

export function buildImportedMemberOnboardingEmail(input: {
	name: string;
	email: string;
	tier: MembershipTier;
}): { subject: string; html: string; text: string } {
	const tier = MEMBERSHIP_TIERS[input.tier];
	const signupUrl = `${SITE_URL}/signup?email=${encodeURIComponent(input.email)}&provisioned=1`;
	const signInUrl = `${SITE_URL}/login`;
	const content = renderEmailLayout({
		preheader: `Your ${SITE_NAME} account has been provisioned.`,
		title: 'Your account is ready',
		intro: `${input.name}, your ${tier.label.toLowerCase()} has been provisioned inside ${SITE_NAME}.`,
		body: `
			<p>Use the same email address this message was sent to when you create your password. Once that account exists, your imported access will activate automatically.</p>
			${ctaButton(signupUrl, 'Create your password')}
			<p>If you already created an account with this email, sign in instead:</p>
			${ctaButton(signInUrl, 'Sign in to ShivWorks Network')}
			<p>Provisioned tier: <strong>${escapeHtml(tier.label)}</strong>.</p>
		`
	});

	return {
		subject: `Finish setting up ${SITE_NAME}`,
		...content
	};
}
