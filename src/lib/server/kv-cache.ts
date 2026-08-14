// KV read-through cache helper (w450-b).
//
// `getOrSet` checks KV first; on miss it calls `fetcher()`, stores the result,
// and returns it. `bust` deletes a key for explicit invalidation.
//
// When `kv` is undefined (local/Replit dev where platform.env.KV is not bound)
// the helper falls through to the fetcher transparently — no dev-mode changes needed.

import type { KVNamespace } from '@cloudflare/workers-types';

export async function getOrSet<T>(
	kv: KVNamespace | undefined,
	key: string,
	ttlSeconds: number,
	fetcher: () => Promise<T>
): Promise<T> {
	if (!kv) {
		return fetcher();
	}

	try {
		const cached = await kv.get(key, 'json');
		if (cached !== null) {
			return cached as T;
		}
	} catch {
		// KV read failure — fall through to fetcher
	}

	const value = await fetcher();

	if (value !== null && value !== undefined) {
		try {
			await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
		} catch {
			// KV write failure — non-fatal, value still returned to caller
		}
	}

	return value;
}

export async function bust(kv: KVNamespace | undefined, ...keys: string[]): Promise<void> {
	if (!kv) return;
	await Promise.allSettled(keys.map((key) => kv.delete(key)));
}
