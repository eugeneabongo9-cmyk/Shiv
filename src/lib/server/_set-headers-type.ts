// Tiny re-export so the cache module doesn't pull a `@sveltejs/kit` type
// into a file that's heavily unit-tested in isolation. The actual setHeaders
// signature is identical to SvelteKit's RequestEvent['setHeaders'].

export type SetHeaders = (headers: Record<string, string>) => void;
