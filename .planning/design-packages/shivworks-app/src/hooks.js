// Universal reroute: the mockup links everywhere as "dashboard.html", "index.html",
// etc. Map those URLs onto the dot-free SvelteKit routes without rewriting markup.
export function reroute({ url }) {
	let p = url.pathname;
	if (p === '/index.html') return '/';
	if (p.endsWith('.html')) return p.slice(0, -5);
	return p;
}
