import { SITE_URL, SITE_NAME } from '$lib/constants/site';
import { ctaButton, escapeHtml, renderEmailLayout } from '$lib/email/layout';

export function buildContentReleaseEmail(input: {
	name: string;
	courseTitle: string;
	courseSlug: string;
	moduleTitle: string;
	description: string | null;
}): { subject: string; html: string; text: string } {
	const content = renderEmailLayout({
		preheader: `New ShivWorks course content is now live: ${input.moduleTitle}`,
		title: 'New course content is live',
		intro: `${input.name}, a new ShivWorks module just opened inside ${SITE_NAME}.`,
		body: `
			<p><strong>${escapeHtml(input.moduleTitle)}</strong> is now available in ${escapeHtml(input.courseTitle)}.</p>
			${
				input.description
					? `<p>${escapeHtml(input.description)}</p>`
					: '<p>Open the course lane to watch the latest release and continue your training path.</p>'
			}
			${ctaButton(`${SITE_URL}/library/${input.courseSlug}`, 'Open the course')}
		`
	});

	return {
		subject: `Now live in ShivWorks: ${input.moduleTitle}`,
		...content
	};
}
