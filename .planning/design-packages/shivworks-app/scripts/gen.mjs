// Faithful 1:1 generator: turns each static mockup page into a SvelteKit route.
// - All <style> blocks  -> /static/pagecss/<name>.css  (global, unscoped)
// - All inline <script> -> /static/pagejs/<name>.js    (classic global scope)
// - <script src> tags    -> detected as loader opts (gsap/sidebar/catalog/docs)
// - body markup          -> +page.svelte (braces escaped for the Svelte compiler)
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('../Shivworks (4.1)');
const ROUTES = path.resolve('src/routes');
const PAGECSS = path.resolve('static/pagecss');
const PAGEJS = path.resolve('static/pagejs');
const PAGEHTML = path.resolve('src/lib/pages');

fs.mkdirSync(PAGECSS, { recursive: true });
fs.mkdirSync(PAGEJS, { recursive: true });
fs.mkdirSync(PAGEHTML, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.html'));
const STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const SCRIPT_ANY_RE = /<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/>/gi;
const SCRIPT_INLINE_RE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

const summary = [];

for (const file of files) {
	const name = file.replace(/\.html$/, '');
	const html = fs.readFileSync(path.join(SRC, file), 'utf8');
	const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');

	const title = (cleanHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'ShivWorks Network').trim();

	// gather every <style> (head + body)
	const styles = [...cleanHtml.matchAll(STYLE_RE)]
		.map((m) => m[1])
		.join('\n\n')
		.trim();

	// body inner
	const body = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? cleanHtml;

	// inline scripts (no src) from the whole doc, in order
	let inline = [...cleanHtml.matchAll(SCRIPT_INLINE_RE)]
		.map((m) => m[1])
		.join('\n;\n')
		.trim();

	// external-script detection -> loader opts
	const opts = {
		gsap: /gsap[^"']*\.min\.js/.test(cleanHtml),
		sidebar: /assets\/sidebar\.js/.test(cleanHtml),
		catalog: /assets\/catalog\.js/.test(cleanHtml),
		docs: /assets\/docs\.js/.test(cleanHtml),
		active: cleanHtml.match(/sidebar\.js[^>]*data-active="([^"]*)"/)?.[1] || ''
	};
	if (inline) opts.pagejs = name;

	if (name === 'dashboard' && inline.includes("document.getElementById('swl-preloader')")) {
		inline = inline.replace(
			/var loaded\s*=\s*\(document\.readyState === 'complete'\);/,
			"var loaded = (document.readyState === 'complete' || document.readyState === 'interactive');"
		);
		inline = inline.replace(
			/if \(!loaded\) window\.addEventListener\('load', function \(\) \{ loaded = true; \}\);/,
			"if (!loaded) window.addEventListener('load', function () { loaded = true; });\n    setTimeout(function () { loaded = true; }, 250);"
		);
	}

	// strip styles + scripts from markup; keep the rest byte-for-byte.
	// Rendered via {@html} so Svelte never re-parses the (browser-tolerant) tree.
	const markup = body.replace(STYLE_RE, '').replace(SCRIPT_ANY_RE, '').trim();

	// write side-car css / js / html
	if (styles) fs.writeFileSync(path.join(PAGECSS, `${name}.css`), styles);
	if (inline) fs.writeFileSync(path.join(PAGEJS, `${name}.js`), inline);
	fs.writeFileSync(path.join(PAGEHTML, `${name}.html`), markup);

	// Pages are pure SSR documents (csr=false). Per-page scripts are emitted as real
	// deferred <script> tags in <svelte:head>, mirroring the original HTML head exactly.
	// `defer` preserves order (gsap -> catalog/docs -> sidebar -> page script) and runs
	// them after DOM parse but before window 'load', so currentScript + load events work.
	const GSAP = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
	const head = [`<title>${title.replace(/</g, '&lt;')}</title>`];
	if (styles) head.push(`<link rel="stylesheet" href="/pagecss/${name}.css" />`);
	if (opts.gsap) head.push(`<script src="${GSAP}" defer></` + `script>`);
	if (opts.catalog) head.push(`<script src="/assets/catalog.js" defer></` + `script>`);
	if (opts.docs) head.push(`<script src="/assets/docs.js" defer></` + `script>`);
	if (opts.sidebar)
		head.push(`<script src="/assets/sidebar.js" data-active="${opts.active}" defer></` + `script>`);
	if (opts.pagejs) head.push(`<script src="/pagejs/${name}.js" defer></` + `script>`);

	const page = `<script>
	import body from '$lib/pages/${name}.html?raw';
</script>

<svelte:head>
	${head.join('\n\t')}
</svelte:head>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html body}
`;

	const dir = name === 'index' ? ROUTES : path.join(ROUTES, name);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, '+page.svelte'), page);
	summary.push(`${name === 'index' ? '/' : '/' + name}  <-  ${file}  ${JSON.stringify(opts)}`);
}

console.log(`Generated ${files.length} routes:\n` + summary.join('\n'));
