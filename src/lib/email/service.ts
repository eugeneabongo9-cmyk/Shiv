import { Resend } from 'resend';

export interface EmailPayload {
	to: string;
	subject: string;
	html: string;
	text: string;
}

export async function sendEmail(
	runtimeEnv: Record<string, string | undefined>,
	payload: EmailPayload
): Promise<void> {
	const resendApiKey = runtimeEnv.RESEND_API_KEY;
	const emailFrom = runtimeEnv.EMAIL_FROM || 'ShivWorks Network <noreply@shivworks.com>';
	if (!resendApiKey) {
		console.warn('RESEND_API_KEY is not configured, skipping email', payload.subject);
		return;
	}

	const resend = new Resend(resendApiKey);
	await resend.emails.send({
		from: emailFrom,
		to: payload.to,
		subject: payload.subject,
		html: payload.html,
		text: payload.text
	});
}
