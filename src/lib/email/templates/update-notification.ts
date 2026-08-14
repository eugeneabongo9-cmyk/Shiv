import { SITE_URL, SITE_NAME } from '$lib/constants/site';
import { ctaButton, escapeHtml, renderEmailLayout } from '$lib/email/layout';

export function buildUpdateNotificationEmail(input: {
	name: string;
	title: string;
	bodyMarkdown: string;
}): { subject: string; html: string; text: string } {
	const content = renderEmailLayout({
		preheader: `New ShivWorks Network update: ${input.title}`,
		title: 'New network update',
		intro: `${input.name}, a new update has been posted inside ${SITE_NAME}.`,
		body: `
			<p><strong>${escapeHtml(input.title)}</strong></p>
			<p>${escapeHtml(input.bodyMarkdown)}</p>
			${ctaButton(`${SITE_URL}/updates`, 'Open the updates lane')}
		`
	});

	return {
		subject: `New ShivWorks update: ${input.title}`,
		...content
	};
}
