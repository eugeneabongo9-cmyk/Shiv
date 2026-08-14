import { sendEmail } from '$lib/email/service';
import { buildClientProgressUpdateEmail } from '$lib/email/templates/client-progress-update';
import { buildContentReleaseEmail } from '$lib/email/templates/content-release';
import { buildImportedMemberOnboardingEmail } from '$lib/email/templates/import-onboarding';
import { buildLivestreamReminderEmail } from '$lib/email/templates/livestream-reminder';
import { buildSessionSecurityEmail } from '$lib/email/templates/session-security';
import { buildUpdateNotificationEmail } from '$lib/email/templates/update-notification';
import { buildVipBookingEmail } from '$lib/email/templates/vip-booking';
import { buildWelcomeEmail } from '$lib/email/templates/welcome';
import type { MembershipTier, PaidMembershipTier } from '$lib/constants/tiers';

export async function sendWelcomeEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: { email: string; name: string; tier: PaidMembershipTier }
) {
	const payload = buildWelcomeEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendImportedMemberOnboardingEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: { email: string; name: string; tier: MembershipTier }
) {
	const payload = buildImportedMemberOnboardingEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendSessionSecurityEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: { email: string; name: string; revokedDeviceLabel: string; currentDeviceLabel: string }
) {
	const payload = buildSessionSecurityEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendLivestreamReminderEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: { email: string; name: string; title: string; startsAt: string }
) {
	const payload = buildLivestreamReminderEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendVipBookingEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: { email: string; name: string; startsAt: string; joinUrl: string | null }
) {
	const payload = buildVipBookingEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendUpdateNotificationEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: { email: string; name: string; title: string; bodyMarkdown: string }
) {
	const payload = buildUpdateNotificationEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendContentReleaseEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: {
		email: string;
		name: string;
		courseTitle: string;
		courseSlug: string;
		moduleTitle: string;
		description: string | null;
	}
) {
	const payload = buildContentReleaseEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}

export async function sendClientProgressUpdateEmail(
	runtimeEnv: Record<string, string | undefined>,
	input: {
		email: string;
		recipientName: string;
		senderName?: string;
		isDraft?: boolean;
		liveUrl: string;
		walkthroughUrl: string;
	}
) {
	const payload = buildClientProgressUpdateEmail(input);
	await sendEmail(runtimeEnv, { to: input.email, ...payload });
}
