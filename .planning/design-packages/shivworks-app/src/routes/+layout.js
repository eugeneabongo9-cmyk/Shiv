export const prerender = false;
export const ssr = true;
// No hydration: every page is a pure server-rendered static document, exactly like
// the original HTML package. This is what makes the vanilla scripts (loaded as real
// deferred <script> tags in each page's <svelte:head>) behave faithfully, and avoids
// Svelte hydration corrupting the {@html} body when a page script mutates the DOM
// (e.g. the dashboard preloader removing itself).
export const csr = false;
export const trailingSlash = 'ignore';
