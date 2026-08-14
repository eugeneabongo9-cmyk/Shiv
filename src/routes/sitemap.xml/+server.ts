import type { RequestHandler } from './$types';
import { SITE_URL } from '$lib/constants/site';

const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export const GET: RequestHandler = async () => {
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(
	(route) => `  <url><loc>${SITE_URL}${route === '/' ? '' : route}</loc></url>`
).join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=86400, stale-while-revalidate=3600'
		}
	});
};
