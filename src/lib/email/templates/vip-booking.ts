import { renderEmailLayout } from '$lib/email/layout';

export function buildVipBookingEmail(input: {
	name: string;
	startsAt: string;
	joinUrl: string | null;
}) {
	const joinLink = input.joinUrl
		? `<p><a href="${input.joinUrl}" style="color:#c8b27a;">Join your Zoom call</a></p>`
		: '<p>Your call details will be added by the ShivWorks team shortly.</p>';

	const content = renderEmailLayout({
		preheader: 'Your ShivWorks VIP call has been scheduled.',
		title: 'Your VIP call is scheduled',
		intro: `${input.name}, your ShivWorks VIP call is on the calendar.`,
		body: `
			<p>Your scheduled time: <strong>${input.startsAt}</strong>.</p>
			${joinLink}
		`
	});

	return {
		subject: 'Your ShivWorks VIP call is scheduled',
		...content
	};
}
