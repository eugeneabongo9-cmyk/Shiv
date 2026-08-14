import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '$lib/constants/site';

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function ctaButton(href: string, label: string): string {
	return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#c8b27a;color:#111111;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a></p>`;
}

export function renderEmailLayout(input: {
	preheader: string;
	title: string;
	intro: string;
	body: string;
}): { html: string; text: string } {
	const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#0d1014;color:#f4efe6;font-family:Arial,sans-serif;">
    <div style="display:none;visibility:hidden;opacity:0;overflow:hidden;height:0;width:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#0d1014;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#141922;border:1px solid #232a35;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 12px;">
                <p style="margin:0 0 8px;color:#c8b27a;text-transform:uppercase;letter-spacing:0.12em;font-size:12px;">${escapeHtml(SITE_NAME)}</p>
                <h1 style="margin:0 0 16px;font-size:32px;line-height:1.15;color:#ffffff;">${escapeHtml(input.title)}</h1>
                <p style="margin:0;color:#d4d8df;line-height:1.65;">${escapeHtml(input.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;color:#d4d8df;line-height:1.7;">${input.body}</td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;border-top:1px solid #232a35;color:#8892a0;font-size:12px;line-height:1.6;">
                ${escapeHtml(SITE_NAME)}<br />
                <a href="${escapeHtml(SITE_URL)}" style="color:#c8b27a;">${escapeHtml(SITE_URL)}</a><br />
                Need help? Reply to this email or contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#c8b27a;">${escapeHtml(SUPPORT_EMAIL)}</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

	const text = `${input.title}\n\n${input.intro}\n\n${input.body
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()}\n\n${SITE_URL}\n${SUPPORT_EMAIL}`;

	return { html, text };
}
