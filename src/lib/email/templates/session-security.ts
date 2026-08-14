import { renderEmailLayout } from '$lib/email/layout';

export function buildSessionSecurityEmail(input: {
	name: string;
	revokedDeviceLabel: string;
	currentDeviceLabel: string;
}) {
	const content = renderEmailLayout({
		preheader: 'A ShivWorks session was signed out because the device limit was exceeded.',
		title: 'A device session was signed out',
		intro: `${input.name}, your account stays limited to two active devices at a time.`,
		body: `
			<p>A previous session on <strong>${input.revokedDeviceLabel}</strong> was signed out after a newer session was started on <strong>${input.currentDeviceLabel}</strong>.</p>
			<p>If this was not you, sign back in and change your password in Clerk immediately.</p>
		`
	});

	return {
		subject: 'A ShivWorks session was signed out',
		...content
	};
}
