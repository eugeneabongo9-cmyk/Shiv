import { describe, expect, it } from 'vitest';
import type { D1Compat } from '$lib/server/d1-compat';
import { claimWebhookEvent, releaseWebhookEvent } from './webhook-idempotency';

function createIdempotencyDb() {
	const rows = new Map<
		string,
		{ source: string; event_id: string; received_at: number; context: string | null }
	>();

	const db = {
		prepare(sql: string) {
			return {
				params: [] as unknown[],
				bind(...args: unknown[]) {
					this.params = args;
					return this;
				},
				async run() {
					if (sql.startsWith('INSERT INTO processed_webhook_events')) {
						const [source, event_id, received_at, context] = this.params as [
							string,
							string,
							number,
							string | null
						];
						const key = `${source}:${event_id}`;
						if (rows.has(key)) {
							throw new Error('UNIQUE constraint failed');
						}
						rows.set(key, { source, event_id, received_at, context });
						return { meta: { changes: 1 } };
					}
					if (sql.startsWith('DELETE FROM processed_webhook_events')) {
						const [source, event_id] = this.params as [string, string];
						rows.delete(`${source}:${event_id}`);
						return { meta: { changes: 1 } };
					}
					return { meta: { changes: 0 } };
				}
			};
		}
	} as unknown as D1Compat;

	return { db, rows };
}

describe('webhook-idempotency', () => {
	it('claims a fresh event once', async () => {
		const { db } = createIdempotencyDb();
		const first = await claimWebhookEvent(db, 'wc', '1001', 'tier=bronze');
		const second = await claimWebhookEvent(db, 'wc', '1001', 'tier=bronze');

		expect(first.fresh).toBe(true);
		expect(second.fresh).toBe(false);
	});

	it('releases a claimed event for retry', async () => {
		const { db, rows } = createIdempotencyDb();
		await claimWebhookEvent(db, 'wc', '1002');
		await releaseWebhookEvent(db, 'wc', '1002');

		expect(rows.size).toBe(0);

		const reclaimed = await claimWebhookEvent(db, 'wc', '1002');
		expect(reclaimed.fresh).toBe(true);
	});
});
