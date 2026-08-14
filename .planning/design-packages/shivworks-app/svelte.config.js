import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// SPA fallback so the static build serves every route; dev uses `vite dev`.
		adapter: adapter({ fallback: '200.html' }),
		// All the mockup's links point at "X.html"; map them onto the dot-free routes.
		// (URL stays X.html in the bar; SvelteKit serves the matching route.)
		prerender: { entries: [] }
	}
};

export default config;
