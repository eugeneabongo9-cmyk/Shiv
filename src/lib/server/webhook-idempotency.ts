// Webhook idempotency — claim an (source,event_id) pair atomically so a replayed
// webhook is recognised and 2xx-no-op'd instead of double-processing.
//
// Usage:
//   const claimed = await claimWebhookEvent(db, 'wc', orderId);
//   if (!claimed.fresh) return json({ success: true, replayed: true });
//   // ... do the work ...
//
// We INSERT first; SQLite returns a constraint error on the PK if the row already
// exists, which we treat as "already processed". This is atomic — two simultaneous
// invocations of the same event_id race to the INSERT and exactly one wins.
//
// Ledger entry: 2026-05-29 · w358 · INV-009 · WooCommerce webhook receiver.

import type { D1Compat } from './d1-compat';

export type WebhookSource = 'wc' | 'clerk' | 'stream';

export interface ClaimResult {
	fresh: boolean; // true if this call won the race; false if it was already processed
	receivedAt: number; // ms epoch
}

export async function claimWebhookEvent(
	db: D1Compat,
	source: WebhookSource,
	eventId: string,
	context?: string
): Promise<ClaimResult> {
	const receivedAt = Date.now();
	try {
		await db
			.prepare(
				`INSERT INTO processed_webhook_events (source, event_id, received_at, context)
 VALUES (?, ?, ?, ?)`
			)
			.bind(source, eventId, receivedAt, context ?? null)
			.run();
		return { fresh: true, receivedAt };
	} catch (error) {
		// SQLite raises a UNIQUE constraint failure on duplicate PK; treat as already-claimed.
		const message = error instanceof Error ? error.message.toLowerCase() : String(error);
		if (message.includes('unique') || message.includes('constraint')) {
			return { fresh: false, receivedAt };
		}
		throw error;
	}
}

export async function releaseWebhookEvent(
	db: D1Compat,
	source: WebhookSource,
	eventId: string
): Promise<void> {
	await db
		.prepare('DELETE FROM processed_webhook_events WHERE source = ? AND event_id = ?')
		.bind(source, eventId)
		.run();
}
