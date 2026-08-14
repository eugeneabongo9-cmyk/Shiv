import type { PaidMembershipTier } from '$lib/constants/tiers';
import type { D1Compat } from '$lib/server/d1-compat';

export type WebhookEventStatus =
	| 'received'
	| 'processing'
	| 'completed'
	| 'failed'
	| 'dead_letter'
	| 'ignored';

const WEBHOOK_EVENT_STATUSES = new Set<WebhookEventStatus>([
	'received',
	'processing',
	'completed',
	'failed',
	'dead_letter',
	'ignored'
]);

export type WebhookStepName = 'provision' | 'activecampaign' | 'revoke';

export type WebhookStepStatus = 'running' | 'succeeded' | 'failed' | 'skipped';

export type WebhookEventRecord = {
	id: string;
	source: string;
	eventKey: string;
	payloadHash: string;
	orderId: string | null;
	email: string | null;
	tier: PaidMembershipTier | null;
	payloadSnapshot: string | null;
	status: WebhookEventStatus;
	attemptCount: number;
	maxAttempts: number;
	nextRetryAt: number | null;
	lastError: string | null;
	failedStep: WebhookStepName | null;
	receivedAt: number;
	startedAt: number | null;
	completedAt: number | null;
	updatedAt: number;
};

export type WebhookProcessingStepRecord = {
	id: string;
	eventId: string;
	step: WebhookStepName;
	status: WebhookStepStatus;
	attempt: number;
	error: string | null;
	startedAt: number | null;
	completedAt: number | null;
	metadata: string | null;
};

export type WebhookPipelineMetrics = {
	total24h: number;
	completed24h: number;
	failed24h: number;
	deadLetterTotal: number;
	pendingRetry: number;
	processing: number;
};

export type RecordWebhookEventInput = {
	source?: string;
	eventKey: string;
	payloadHash: string;
	orderId: string;
	email: string;
	tier: PaidMembershipTier;
	payloadSnapshot?: string;
	status?: WebhookEventStatus;
};

function mapWebhookEvent(row: Record<string, unknown>): WebhookEventRecord {
	return {
		id: String(row.id),
		source: String(row.source),
		eventKey: String(row.event_key),
		payloadHash: String(row.payload_hash),
		orderId: row.order_id != null ? String(row.order_id) : null,
		email: row.email != null ? String(row.email) : null,
		tier: (row.tier as PaidMembershipTier | null) ?? null,
		payloadSnapshot: row.payload_snapshot != null ? String(row.payload_snapshot) : null,
		status: row.status as WebhookEventStatus,
		attemptCount: Number(row.attempt_count ?? 0),
		maxAttempts: Number(row.max_attempts ?? 5),
		nextRetryAt: row.next_retry_at != null ? Number(row.next_retry_at) : null,
		lastError: row.last_error != null ? String(row.last_error) : null,
		failedStep: (row.failed_step as WebhookStepName | null) ?? null,
		receivedAt: Number(row.received_at),
		startedAt: row.started_at != null ? Number(row.started_at) : null,
		completedAt: row.completed_at != null ? Number(row.completed_at) : null,
		updatedAt: Number(row.updated_at)
	};
}

function mapWebhookStep(row: Record<string, unknown>): WebhookProcessingStepRecord {
	return {
		id: String(row.id),
		eventId: String(row.event_id),
		step: row.step as WebhookStepName,
		status: row.status as WebhookStepStatus,
		attempt: Number(row.attempt ?? 1),
		error: row.error != null ? String(row.error) : null,
		startedAt: row.started_at != null ? Number(row.started_at) : null,
		completedAt: row.completed_at != null ? Number(row.completed_at) : null,
		metadata: row.metadata != null ? String(row.metadata) : null
	};
}

export async function getWebhookEventByKey(
	db: D1Compat,
	eventKey: string
): Promise<WebhookEventRecord | null> {
	const row = await db
		.prepare('SELECT * FROM webhook_events WHERE event_key = ?')
		.bind(eventKey)
		.first<Record<string, unknown>>();
	return row ? mapWebhookEvent(row) : null;
}

export async function getWebhookEventById(
	db: D1Compat,
	id: string
): Promise<WebhookEventRecord | null> {
	const row = await db
		.prepare('SELECT * FROM webhook_events WHERE id = ?')
		.bind(id)
		.first<Record<string, unknown>>();
	return row ? mapWebhookEvent(row) : null;
}

export async function recordWebhookEvent(
	db: D1Compat,
	input: RecordWebhookEventInput
): Promise<{ event: WebhookEventRecord; created: boolean }> {
	const existing = await getWebhookEventByKey(db, input.eventKey);
	if (existing) {
		return { event: existing, created: false };
	}

	const now = Date.now();
	const id = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO webhook_events (
        id, source, event_key, payload_hash, order_id, email, tier, payload_snapshot, status,
        attempt_count, max_attempts, received_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 5, ?, ?)`
		)
		.bind(
			id,
			input.source ?? 'wc',
			input.eventKey,
			input.payloadHash,
			input.orderId,
			input.email,
			input.tier,
			input.payloadSnapshot ?? null,
			input.status ?? 'received',
			now,
			now
		)
		.run();

	const event = await getWebhookEventById(db, id);
	if (!event) {
		throw new Error('Failed to record webhook event');
	}
	return { event, created: true };
}

export async function tryAcquireWebhookProcessingLock(
	db: D1Compat,
	eventId: string,
	now = Date.now()
): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE webhook_events
       SET status = 'processing',
           attempt_count = attempt_count + 1,
           started_at = ?,
           updated_at = ?,
           last_error = NULL,
           failed_step = NULL
       WHERE id = ?
         AND status IN ('received', 'failed')
         AND (next_retry_at IS NULL OR next_retry_at <= ?)`
		)
		.bind(now, now, eventId, now)
		.run();
	return result.meta.changes > 0;
}

export async function markWebhookEventCompleted(
	db: D1Compat,
	eventId: string,
	now = Date.now()
): Promise<void> {
	await db
		.prepare(
			`UPDATE webhook_events
       SET status = 'completed',
           completed_at = ?,
           updated_at = ?,
           next_retry_at = NULL,
           last_error = NULL,
           failed_step = NULL
       WHERE id = ?`
		)
		.bind(now, now, eventId)
		.run();
}

export async function markWebhookEventFailed(
	db: D1Compat,
	eventId: string,
	input: {
		error: string;
		failedStep: WebhookStepName;
		attemptCount: number;
		maxAttempts: number;
		nextRetryAt: number | null;
		now?: number;
	}
): Promise<'failed' | 'dead_letter'> {
	const now = input.now ?? Date.now();
	const status = input.attemptCount >= input.maxAttempts ? 'dead_letter' : 'failed';

	await db
		.prepare(
			`UPDATE webhook_events
       SET status = ?,
           last_error = ?,
           failed_step = ?,
           next_retry_at = ?,
           updated_at = ?
       WHERE id = ?`
		)
		.bind(status, input.error, input.failedStep, input.nextRetryAt, now, eventId)
		.run();

	return status;
}

export async function resetWebhookEventForReplay(
	db: D1Compat,
	eventId: string,
	now = Date.now()
): Promise<void> {
	await db
		.prepare(
			`UPDATE webhook_events
       SET status = 'received',
           next_retry_at = NULL,
           last_error = NULL,
           failed_step = NULL,
           updated_at = ?
       WHERE id = ?
         AND status IN ('failed', 'dead_letter')`
		)
		.bind(now, eventId)
		.run();
}

export async function insertWebhookProcessingStep(
	db: D1Compat,
	input: {
		eventId: string;
		step: WebhookStepName;
		status: WebhookStepStatus;
		attempt: number;
		error?: string | null;
		startedAt?: number | null;
		completedAt?: number | null;
		metadata?: Record<string, unknown> | null;
	}
): Promise<WebhookProcessingStepRecord> {
	const startedAt = input.startedAt ?? Date.now();
	const error = input.error ?? null;
	const completedAt = input.completedAt ?? null;
	const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

	const updated = await db
		.prepare(
			`UPDATE webhook_processing_steps
       SET status = ?,
           error = ?,
           started_at = COALESCE(started_at, ?),
           completed_at = ?,
           metadata = ?
       WHERE event_id = ? AND step = ? AND attempt = ?`
		)
		.bind(
			input.status,
			error,
			startedAt,
			completedAt,
			metadata,
			input.eventId,
			input.step,
			input.attempt
		)
		.run();

	if (updated.meta.changes === 0) {
		await db
			.prepare(
				`INSERT INTO webhook_processing_steps (
          id, event_id, step, status, attempt, error, started_at, completed_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				crypto.randomUUID(),
				input.eventId,
				input.step,
				input.status,
				input.attempt,
				error,
				startedAt,
				completedAt,
				metadata
			)
			.run();
	}

	const row = await db
		.prepare(
			`SELECT * FROM webhook_processing_steps
       WHERE event_id = ? AND step = ? AND attempt = ?
       LIMIT 1`
		)
		.bind(input.eventId, input.step, input.attempt)
		.first<Record<string, unknown>>();
	if (!row) {
		throw new Error('Failed to upsert webhook processing step');
	}
	return mapWebhookStep(row);
}

export async function getLatestWebhookStep(
	db: D1Compat,
	eventId: string,
	step: WebhookStepName
): Promise<WebhookProcessingStepRecord | null> {
	const row = await db
		.prepare(
			`SELECT * FROM webhook_processing_steps
       WHERE event_id = ? AND step = ?
       ORDER BY attempt DESC, started_at DESC
       LIMIT 1`
		)
		.bind(eventId, step)
		.first<Record<string, unknown>>();
	return row ? mapWebhookStep(row) : null;
}

export async function listWebhookProcessingSteps(
	db: D1Compat,
	eventId: string
): Promise<WebhookProcessingStepRecord[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM webhook_processing_steps
       WHERE event_id = ?
       ORDER BY started_at ASC, attempt ASC`
		)
		.bind(eventId)
		.all<Record<string, unknown>>();
	return results.map(mapWebhookStep);
}

export async function listWebhookEvents(
	db: D1Compat,
	options: { status?: WebhookEventStatus | WebhookEventStatus[]; limit?: number } = {}
): Promise<WebhookEventRecord[]> {
	const limit = options.limit ?? 50;
	const statuses = options.status
		? Array.from(
				new Set(
					(Array.isArray(options.status) ? options.status : [options.status]).filter((status) =>
						WEBHOOK_EVENT_STATUSES.has(status)
					)
				)
			)
		: null;

	let sql = 'SELECT * FROM webhook_events';
	const params: unknown[] = [];

	if (statuses?.length) {
		sql += ` WHERE status IN (${statuses.map(() => '?').join(', ')})`;
		params.push(...statuses);
	}

	sql += ' ORDER BY received_at DESC LIMIT ?';
	params.push(limit);

	const { results } = await db
		.prepare(sql)
		.bind(...params)
		.all<Record<string, unknown>>();
	return results.map(mapWebhookEvent);
}

export async function listRetryableWebhookEvents(
	db: D1Compat,
	now = Date.now(),
	limit = 25
): Promise<WebhookEventRecord[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM webhook_events
       WHERE status = 'failed'
         AND next_retry_at IS NOT NULL
         AND next_retry_at <= ?
       ORDER BY next_retry_at ASC
       LIMIT ?`
		)
		.bind(now, limit)
		.all<Record<string, unknown>>();
	return results.map(mapWebhookEvent);
}

export async function getWebhookPipelineMetrics(db: D1Compat): Promise<WebhookPipelineMetrics> {
	const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

	const totals = await db
		.prepare(
			`SELECT
         SUM(CASE WHEN received_at >= ? THEN 1 ELSE 0 END) AS total_24h,
         SUM(CASE WHEN received_at >= ? AND status = 'completed' THEN 1 ELSE 0 END) AS completed_24h,
         SUM(CASE WHEN received_at >= ? AND status IN ('failed', 'dead_letter') THEN 1 ELSE 0 END) AS failed_24h,
         SUM(CASE WHEN status = 'dead_letter' THEN 1 ELSE 0 END) AS dead_letter_total,
         SUM(CASE WHEN status = 'failed' AND next_retry_at IS NOT NULL THEN 1 ELSE 0 END) AS pending_retry,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing
       FROM webhook_events`
		)
		.bind(dayAgo, dayAgo, dayAgo)
		.first<Record<string, number | string>>();

	return {
		total24h: Number(totals?.total_24h ?? 0),
		completed24h: Number(totals?.completed_24h ?? 0),
		failed24h: Number(totals?.failed_24h ?? 0),
		deadLetterTotal: Number(totals?.dead_letter_total ?? 0),
		pendingRetry: Number(totals?.pending_retry ?? 0),
		processing: Number(totals?.processing ?? 0)
	};
}

export function wcOrderEventKey(orderId: string | number): string {
	return `wc:order:${orderId}`;
}

/** Separate from provision key so refunds can run after a completed provision event. */
export function wcOrderRevokeEventKey(orderId: string | number): string {
	return `wc:order:${orderId}:revoke`;
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function computeRetryDelayMs(attemptCount: number): number {
	const base = 5 * 60 * 1000;
	const max = 60 * 60 * 1000;
	return Math.min(base * 2 ** Math.max(attemptCount - 1, 0), max);
}
