import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Compat } from '$lib/server/d1-compat';

const {
	upsertImportedMemberProvisionMock,
	applyActiveCampaignTagMock,
	revokePaidAccessFromWcOrderMock
} = vi.hoisted(() => ({
	upsertImportedMemberProvisionMock: vi.fn(),
	applyActiveCampaignTagMock: vi.fn(),
	revokePaidAccessFromWcOrderMock: vi.fn()
}));

vi.mock('$lib/server/db/shivworks', () => ({
	upsertImportedMemberProvision: upsertImportedMemberProvisionMock,
	revokePaidAccessFromWcOrder: revokePaidAccessFromWcOrderMock
}));

vi.mock('$lib/server/activecampaign', () => ({
	applyActiveCampaignTag: applyActiveCampaignTagMock,
	tagNameForTier: (tier: string) => (tier === 'vip' ? 'VIP_Founding' : 'Jujitsu_Course_Member')
}));

import {
	ingestWcRevokeWebhookEvent,
	ingestWcWebhookEvent,
	processDueWebhookRetries,
	processWcRevokeWebhookEvent,
	processWcWebhookEvent,
	replayWcWebhookEventById
} from './wc-webhook-pipeline';
import { WC_BRONZE_PRODUCT_ID } from './wc-webhook';

type Row = Record<string, unknown>;

function createMockDb() {
	const webhookEvents = new Map<string, Row>();
	const webhookSteps: Row[] = [];

	const db = {
		prepare(sql: string) {
			return {
				params: [] as unknown[],
				bind(...args: unknown[]) {
					this.params = args;
					return this;
				},
				async first<T>() {
					if (
						sql.includes('FROM webhook_processing_steps') &&
						sql.includes('event_id = ?') &&
						sql.includes('step = ?') &&
						sql.includes('attempt = ?')
					) {
						return (
							(webhookSteps.find(
								(s) =>
									s.event_id === this.params[0] &&
									s.step === this.params[1] &&
									Number(s.attempt) === Number(this.params[2])
							) as T) ?? null
						);
					}
					if (sql.includes('FROM webhook_processing_steps WHERE id = ?')) {
						return (webhookSteps.find((s) => s.id === this.params[0]) as T) ?? null;
					}
					if (sql.includes('FROM webhook_events WHERE event_key')) {
						const key = String(this.params[0]);
						const row = [...webhookEvents.values()].find((r) => r.event_key === key);
						return (row as T) ?? null;
					}
					if (sql.includes('FROM webhook_events WHERE id = ?')) {
						return (webhookEvents.get(String(this.params[0])) as T) ?? null;
					}
					if (sql.includes('FROM webhook_processing_steps')) {
						const eventId = String(this.params[0]);
						const step = this.params[1] != null ? String(this.params[1]) : null;
						const matches = webhookSteps.filter((s) => {
							if (s.event_id !== eventId) return false;
							if (step && s.step !== step) return false;
							return true;
						});
						if (sql.includes('ORDER BY attempt DESC')) {
							const latest = [...matches].sort((a, b) => Number(b.attempt) - Number(a.attempt))[0];
							return (latest as T) ?? null;
						}
						return (matches[0] as T) ?? null;
					}
					return null;
				},
				async all<T>() {
					if (sql.includes('FROM webhook_processing_steps')) {
						const eventId = String(this.params[0]);
						return {
							results: webhookSteps.filter((s) => s.event_id === eventId) as T[]
						};
					}
					if (sql.includes("status = 'failed'") && sql.includes('next_retry_at')) {
						const now = Number(this.params[0]);
						const limit = Number(this.params[1] ?? 25);
						const due = [...webhookEvents.values()]
							.filter(
								(row) =>
									row.status === 'failed' &&
									row.next_retry_at != null &&
									Number(row.next_retry_at) <= now
							)
							.sort((a, b) => Number(a.next_retry_at) - Number(b.next_retry_at))
							.slice(0, limit);
						return { results: due as T[] };
					}
					if (sql.includes('FROM webhook_events')) {
						return { results: [...webhookEvents.values()] as T[] };
					}
					return { results: [] as T[] };
				},
				async run() {
					if (sql.startsWith('INSERT INTO webhook_events')) {
						const [
							id,
							source,
							event_key,
							payload_hash,
							order_id,
							email,
							tier,
							payload_snapshot,
							status,
							,
							,
							received_at,
							updated_at
						] = this.params;
						webhookEvents.set(String(id), {
							id,
							source,
							event_key,
							payload_hash,
							order_id,
							email,
							tier,
							payload_snapshot,
							status,
							attempt_count: 0,
							max_attempts: 5,
							next_retry_at: null,
							last_error: null,
							failed_step: null,
							received_at,
							started_at: null,
							completed_at: null,
							updated_at
						});
						return { meta: { changes: 1 } };
					}

					if (sql.includes("SET status = 'processing'")) {
						const [started_at, updated_at, id, now] = this.params;
						const row = webhookEvents.get(String(id));
						if (
							row &&
							(row.status === 'received' || row.status === 'failed') &&
							(row.next_retry_at == null || Number(row.next_retry_at) <= Number(now))
						) {
							row.status = 'processing';
							row.attempt_count = Number(row.attempt_count ?? 0) + 1;
							row.started_at = started_at;
							row.updated_at = updated_at;
							row.last_error = null;
							row.failed_step = null;
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}

					if (sql.includes("SET status = 'completed'")) {
						const [completed_at, updated_at, id] = this.params;
						const row = webhookEvents.get(String(id));
						if (row) {
							row.status = 'completed';
							row.completed_at = completed_at;
							row.updated_at = updated_at;
							row.next_retry_at = null;
							row.last_error = null;
							row.failed_step = null;
						}
						return { meta: { changes: 1 } };
					}

					if (sql.includes('SET status = ?') && sql.includes('last_error = ?')) {
						const [status, last_error, failed_step, next_retry_at, updated_at, id] = this.params;
						const row = webhookEvents.get(String(id));
						if (row) {
							row.status = status;
							row.last_error = last_error;
							row.failed_step = failed_step;
							row.next_retry_at = next_retry_at;
							row.updated_at = updated_at;
						}
						return { meta: { changes: 1 } };
					}

					if (sql.includes("SET status = 'received'")) {
						const [updated_at, id] = this.params;
						const row = webhookEvents.get(String(id));
						if (row && (row.status === 'failed' || row.status === 'dead_letter')) {
							row.status = 'received';
							row.next_retry_at = null;
							row.last_error = null;
							row.failed_step = null;
							row.updated_at = updated_at;
						}
						return { meta: { changes: 1 } };
					}

					if (
						sql.includes('UPDATE webhook_processing_steps') &&
						sql.includes('WHERE event_id = ? AND step = ? AND attempt = ?')
					) {
						const [status, error, started_at, completed_at, metadata, event_id, step, attempt] =
							this.params;
						const existing = webhookSteps.find(
							(s) =>
								s.event_id === event_id && s.step === step && Number(s.attempt) === Number(attempt)
						);
						if (existing) {
							existing.status = status;
							existing.error = error;
							existing.started_at = existing.started_at ?? started_at;
							existing.completed_at = completed_at;
							existing.metadata = metadata;
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}

					if (sql.startsWith('INSERT INTO webhook_processing_steps')) {
						webhookSteps.push({
							id: this.params[0],
							event_id: this.params[1],
							step: this.params[2],
							status: this.params[3],
							attempt: this.params[4],
							error: this.params[5],
							started_at: this.params[6],
							completed_at: this.params[7],
							metadata: this.params[8]
						});
						return { meta: { changes: 1 } };
					}

					return { meta: { changes: 0 } };
				}
			};
		}
	} as unknown as D1Compat;

	return { db, webhookEvents, webhookSteps };
}

const acEnv = {
	ACTIVECAMPAIGN_API_URL: 'https://ac.example.com',
	ACTIVECAMPAIGN_API_KEY: 'test-key'
};

const order = {
	id: 4242,
	status: 'completed' as const,
	billing: { email: 'buyer@example.com', first_name: 'Jane', last_name: 'Doe' },
	line_items: [{ product_id: WC_BRONZE_PRODUCT_ID, name: 'Bronze', quantity: 1 }]
};

const payloadSnapshot = JSON.stringify(order);

describe('wc-webhook-pipeline', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		upsertImportedMemberProvisionMock.mockResolvedValue({
			id: 'import_1',
			email: 'buyer@example.com'
		});
		applyActiveCampaignTagMock.mockResolvedValue(true);
		revokePaidAccessFromWcOrderMock.mockResolvedValue({
			importUpdated: true,
			memberId: 'user_1',
			remainingActiveEntitlements: 0,
			accessStatus: 'revoked',
			tier: 'bronze'
		});
	});

	it('completes provision and activecampaign steps', async () => {
		const { db } = createMockDb();
		const { event } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-1',
			payloadSnapshot
		});

		const result = await processWcWebhookEvent(db, acEnv, event.id, order, 'bronze');
		expect(result.status).toBe('completed');
		expect(upsertImportedMemberProvisionMock).toHaveBeenCalledTimes(1);
		expect(applyActiveCampaignTagMock).toHaveBeenCalledTimes(1);
	});

	it('returns replayed for duplicate delivery after completion', async () => {
		const { db } = createMockDb();
		const { event } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-1',
			payloadSnapshot
		});

		await processWcWebhookEvent(db, acEnv, event.id, order, 'bronze');
		const replay = await processWcWebhookEvent(db, acEnv, event.id, order, 'bronze');

		expect(replay.status).toBe('replayed');
		expect(replay.replayed).toBe(true);
		expect(upsertImportedMemberProvisionMock).toHaveBeenCalledTimes(1);
	});

	it('marks event failed when provision throws and allows retry', async () => {
		const { db, webhookEvents } = createMockDb();
		upsertImportedMemberProvisionMock.mockRejectedValueOnce(new Error('d1 unavailable'));

		const { event } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-1',
			payloadSnapshot
		});

		const failed = await processWcWebhookEvent(db, {}, event.id, order, 'bronze');
		expect(failed.status).toBe('failed');

		const stored = webhookEvents.get(event.id);
		expect(stored?.status).toBe('failed');
		expect(stored?.next_retry_at).not.toBeNull();
		if (stored) stored.next_retry_at = Date.now() - 1_000;

		const retry = await processWcWebhookEvent(db, {}, event.id, order, 'bronze');
		expect(retry.status).toBe('completed');
		expect(upsertImportedMemberProvisionMock).toHaveBeenCalledTimes(2);
	});

	it('replays from stored payload snapshot via admin helper', async () => {
		const { db } = createMockDb();
		const { event } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-1',
			payloadSnapshot
		});

		upsertImportedMemberProvisionMock.mockRejectedValueOnce(new Error('d1 unavailable'));
		await processWcWebhookEvent(db, {}, event.id, order, 'bronze');

		const replay = await replayWcWebhookEventById(db, acEnv, event.id);
		expect(replay.status).toBe('completed');
	});

	it('processes due webhook retries from stored snapshots without an external order map', async () => {
		const { db, webhookEvents } = createMockDb();
		const { event } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-due-retry',
			payloadSnapshot
		});

		upsertImportedMemberProvisionMock.mockRejectedValueOnce(new Error('d1 unavailable'));
		await processWcWebhookEvent(db, {}, event.id, order, 'bronze');

		const stored = webhookEvents.get(event.id);
		expect(stored?.status).toBe('failed');
		if (stored) stored.next_retry_at = Date.now() - 1_000;

		const results = await processDueWebhookRetries(db, acEnv);
		expect(results).toHaveLength(1);
		expect(results[0]?.status).toBe('completed');
		expect(upsertImportedMemberProvisionMock).toHaveBeenCalledTimes(2);
	});

	it('upserts step rows so running→succeeded does not hit unique conflicts', async () => {
		const { db, webhookSteps } = createMockDb();
		const { event } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-upsert-steps',
			payloadSnapshot
		});

		const result = await processWcWebhookEvent(db, acEnv, event.id, order, 'bronze');
		expect(result.status).toBe('completed');

		const provisionSteps = webhookSteps.filter(
			(step) => step.event_id === event.id && step.step === 'provision'
		);
		expect(provisionSteps).toHaveLength(1);
		expect(provisionSteps[0]?.status).toBe('succeeded');
	});

	it('revokes paid access for refunded orders and is idempotent', async () => {
		const { db } = createMockDb();
		const refundedOrder = { ...order, status: 'refunded' as const };
		const { event } = await ingestWcRevokeWebhookEvent(db, {
			order: refundedOrder,
			tier: 'bronze',
			payloadHash: 'hash-revoke',
			payloadSnapshot: JSON.stringify(refundedOrder)
		});

		const result = await processWcRevokeWebhookEvent(
			db,
			event.id,
			refundedOrder,
			'bronze',
			'wc_refunded'
		);
		expect(result.status).toBe('completed');
		expect(result.action).toBe('revoke');
		expect(revokePaidAccessFromWcOrderMock).toHaveBeenCalledTimes(1);

		const replay = await processWcRevokeWebhookEvent(
			db,
			event.id,
			refundedOrder,
			'bronze',
			'wc_refunded'
		);
		expect(replay.status).toBe('replayed');
		expect(revokePaidAccessFromWcOrderMock).toHaveBeenCalledTimes(1);
	});

	it('marks revoke failures as retryable', async () => {
		const { db, webhookEvents } = createMockDb();
		revokePaidAccessFromWcOrderMock.mockRejectedValueOnce(new Error('d1 unavailable'));
		const cancelledOrder = { ...order, status: 'cancelled' as const };
		const { event } = await ingestWcRevokeWebhookEvent(db, {
			order: cancelledOrder,
			tier: 'bronze',
			payloadHash: 'hash-cancel',
			payloadSnapshot: JSON.stringify(cancelledOrder)
		});

		const failed = await processWcRevokeWebhookEvent(
			db,
			event.id,
			cancelledOrder,
			'bronze',
			'wc_cancelled'
		);
		expect(failed.status).toBe('failed');
		expect(webhookEvents.get(event.id)?.next_retry_at).not.toBeNull();
	});

	it('skips provision when a completed revoke already exists for the order', async () => {
		const { db } = createMockDb();
		const refundedOrder = { ...order, status: 'refunded' as const };
		const { event: revokeEvent } = await ingestWcRevokeWebhookEvent(db, {
			order: refundedOrder,
			tier: 'bronze',
			payloadHash: 'hash-revoke-first',
			payloadSnapshot: JSON.stringify(refundedOrder)
		});
		await processWcRevokeWebhookEvent(db, revokeEvent.id, refundedOrder, 'bronze', 'wc_refunded');

		const { event: provisionEvent } = await ingestWcWebhookEvent(db, {
			order,
			tier: 'bronze',
			payloadHash: 'hash-late-complete',
			payloadSnapshot
		});
		const result = await processWcWebhookEvent(db, acEnv, provisionEvent.id, order, 'bronze');

		expect(result.status).toBe('completed');
		expect(upsertImportedMemberProvisionMock).not.toHaveBeenCalled();
	});
});
