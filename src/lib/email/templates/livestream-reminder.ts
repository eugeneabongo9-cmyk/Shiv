import { SITE_URL } from '$lib/constants/site';
import { ctaButton, renderEmailLayout } from '$lib/email/layout';

export function buildLivestreamReminderEmail(input: {
	name: string;
	title: string;
	startsAt: string;
}) {
	const content = renderEmailLayout({
		preheader: `Reminder: ${input.title} is coming up soon.`,
		title: 'Livestream reminder',
		intro: `${input.name}, your ShivWorks livestream is coming up soon.`,
		body: `
			<p><strong>${input.title}</strong> starts at ${input.startsAt}.</p>
			${ctaButton(`${SITE_URL}/live`, 'Open the live page')}
		`
	});

	return {
		subject: `Reminder: ${input.title}`,
		...content
	};
}
