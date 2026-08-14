// WooCommerce webhook pipeline — durable ingress, step audit log, retry-safe processing.
//
// Flow:
//   Validation (handler) → recordWebhookEvent → processWcWebhookEvent
//     → provision (critical) → activecampaign (retryable side effect)
//   Refund/cancel → recordWebhookEvent(revoke key) → processWcRevokeWebhookEvent
//
// Idempotency:
//   - event_key UNIQUE (wc:order:{id} for provision, wc:order:{id}:revoke for revocation)
//   - upsertImportedMemberProvision is email-keyed
//   - completed events return replayed:true without re-running steps

import type { PaidMembershipTier } from '$lib/constants/tiers';
import type { ActiveCampaignEnv } from '$lib/server/activecampaign';
import { applyActiveCampaignTag, tagNameForTier } from '$lib/server/activecampaign';
import type { D1Compat } from '$lib/server/d1-compat';
import {
	revokePaidAccessFromWcOrder,
	upsertImportedMemberProvision,
	type WcRevokeReason
} from '$lib/server/db/shivworks';
import {
	computeRetryDelayMs,
	getLatestWebhookStep,
	getWebhookEventById,
	getWebhookEventByKey,
	insertWebhookProcessingStep,
	listRetryableWebhookEvents,
	markWebhookEventCompleted,
	markWebhookEventFailed,
	recordWebhookEvent,
	resetWebhookEventForReplay,
	tryAcquireWebhookProcessingLock,
	type WebhookEventRecord,
	type WebhookStepName,
	wcOrderEventKey,
	wcOrderRevokeEventKey
} from '$lib/server/db/webhook-events';
import { logError } from '$lib/server/log';
import type { WcOrder } from '$lib/server/wc-webhook';
import { nameFromBilling, parseWcOrder } from '$lib/server/wc-webhook';
import type { KVNamespace } from '@cloudflare/workers-types';

export type WcWebhookIngressInput = {
	order: WcOrder;
	tier: PaidMembershipTier;
	payloadHash: string;
	payloadSnapshot: string;
};

export type WcWebhookProcessResult = {
	eventId: string;
	status: 'completed' | 'failed' | 'dead_letter' | 'replayed' | 'processing';
	orderId: number;
	email: string;
	tier: PaidMembershipTier;
	replayed?: boolean;
	error?: string;
	action?: 'provision' | 'revoke';
};

const PIPELINE_STEPS: WebhookStepName[] = ['provision', 'activecampaign'];
const REVOKE_STEPS: WebhookStepName[] = ['revoke'];

export async function ingestWcWebhookEvent(
	db: D1Compat,
	input: WcWebhookIngressInput
): Promise<{ event: WebhookEventRecord; created: boolean }> {
	const email = input.order.billing.email.toLowerCase().trim();
	return recordWebhookEvent(db, {
		eventKey: wcOrderEventKey(input.order.id),
		payloadHash: input.payloadHash,
		payloadSnapshot: input.payloadSnapshot,
		orderId: String(input.order.id),
		email,
		tier: input.tier
	});
}

export async function ingestWcRevokeWebhookEvent(
	db: D1Compat,
	input: WcWebhookIngressInput
): Promise<{ event: WebhookEventRecord; created: boolean }> {
	const email = input.order.billing.email.toLowerCase().trim();
	return recordWebhookEvent(db, {
		eventKey: wcOrderRevokeEventKey(input.order.id),
		payloadHash: input.payloadHash,
		payloadSnapshot: input.payloadSnapshot,
		orderId: String(input.order.id),
		email,
		tier: input.tier
	});
}

export function revokeReasonFromOrderStatus(status: string): WcRevokeReason | null {
	if (status === 'refunded') return 'wc_refunded';
	if (status === 'cancelled') return 'wc_cancelled';
	return null;
}

export async function processWcWebhookEvent(
	db: D1Compat,
	env: ActiveCampaignEnv,
	eventId: string,
	order: WcOrder,
	tier: PaidMembershipTier
): Promise<WcWebhookProcessResult> {
	const email = order.billing.email.toLowerCase().trim();
	const base = {
		eventId,
		orderId: order.id,
		email,
		tier,
		action: 'provision' as const
	};

	const event = await getWebhookEventById(db, eventId);
	if (!event) {
		throw new Error(`Webhook event not found: ${eventId}`);
	}

	if (event.status === 'completed') {
		return { ...base, status: 'replayed', replayed: true };
	}

	if (event.status === 'processing') {
		return { ...base, status: 'processing', replayed: true };
	}

	if (event.status === 'dead_letter') {
		return {
			...base,
			status: 'dead_letter',
			error: event.lastError ?? 'dead letter'
		};
	}

	const acquired = await tryAcquireWebhookProcessingLock(db, eventId);
	if (!acquired) {
		const latest = await getWebhookEventById(db, eventId);
		if (latest?.status === 'completed') {
			return { ...base, status: 'replayed', replayed: true };
		}
		return { ...base, status: 'processing', replayed: true };
	}

	const refreshed = await getWebhookEventById(db, eventId);
	if (!refreshed) {
		throw new Error(`Webhook event not found after lock: ${eventId}`);
	}

	try {
		for (const step of PIPELINE_STEPS) {
			const latestStep = await getLatestWebhookStep(db, eventId, step);
			if (latestStep?.status === 'succeeded' || latestStep?.status === 'skipped') {
				continue;
			}

			const stepResult = await runWcPipelineStep(db, env, {
				event: refreshed,
				order,
				tier,
				step,
				attempt: refreshed.attemptCount
			});

			if (!stepResult.ok) {
				const nextRetryAt =
					refreshed.attemptCount < refreshed.maxAttempts
						? Date.now() + computeRetryDelayMs(refreshed.attemptCount)
						: null;

				const terminalStatus = await markWebhookEventFailed(db, eventId, {
					error: stepResult.error,
					failedStep: step,
					attemptCount: refreshed.attemptCount,
					maxAttempts: refreshed.maxAttempts,
					nextRetryAt
				});

				logError('wc.webhook.pipeline.step', new Error(stepResult.error), {
					eventId,
					orderId: order.id,
					step,
					attempt: refreshed.attemptCount,
					status: terminalStatus
				});

				return {
					...base,
					status: terminalStatus,
					error: stepResult.error
				};
			}
		}

		await markWebhookEventCompleted(db, eventId);
		return { ...base, status: 'completed' };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const nextRetryAt =
			refreshed.attemptCount < refreshed.maxAttempts
				? Date.now() + computeRetryDelayMs(refreshed.attemptCount)
				: null;

		const terminalStatus = await markWebhookEventFailed(db, eventId, {
			error: message,
			failedStep: 'provision',
			attemptCount: refreshed.attemptCount,
			maxAttempts: refreshed.maxAttempts,
			nextRetryAt
		});

		logError('wc.webhook.pipeline', error, {
			eventId,
			orderId: order.id,
			status: terminalStatus
		});

		return { ...base, status: terminalStatus, error: message };
	}
}

export async function processWcRevokeWebhookEvent(
	db: D1Compat,
	eventId: string,
	order: WcOrder,
	tier: PaidMembershipTier,
	reason: WcRevokeReason,
	kv?: KVNamespace
): Promise<WcWebhookProcessResult> {
	const email = order.billing.email.toLowerCase().trim();
	const base = {
		eventId,
		orderId: order.id,
		email,
		tier,
		action: 'revoke' as const
	};

	const event = await getWebhookEventById(db, eventId);
	if (!event) {
		throw new Error(`Webhook event not found: ${eventId}`);
	}

	if (event.status === 'completed') {
		return { ...base, status: 'replayed', replayed: true };
	}

	if (event.status === 'processing') {
		return { ...base, status: 'processing', replayed: true };
	}

	if (event.status === 'dead_letter') {
		return {
			...base,
			status: 'dead_letter',
			error: event.lastError ?? 'dead letter'
		};
	}

	const acquired = await tryAcquireWebhookProcessingLock(db, eventId);
	if (!acquired) {
		const latest = await getWebhookEventById(db, eventId);
		if (latest?.status === 'completed') {
			return { ...base, status: 'replayed', replayed: true };
		}
		return { ...base, status: 'processing', replayed: true };
	}

	const refreshed = await getWebhookEventById(db, eventId);
	if (!refreshed) {
		throw new Error(`Webhook event not found after lock: ${eventId}`);
	}

	try {
		for (const step of REVOKE_STEPS) {
			const latestStep = await getLatestWebhookStep(db, eventId, step);
			if (latestStep?.status === 'succeeded') {
				continue;
			}

			const stepResult = await runWcRevokeStep(db, {
				event: refreshed,
				order,
				reason,
				step,
				attempt: refreshed.attemptCount,
				kv
			});

			if (!stepResult.ok) {
				const nextRetryAt =
					refreshed.attemptCount < refreshed.maxAttempts
						? Date.now() + computeRetryDelayMs(refreshed.attemptCount)
						: null;

				const terminalStatus = await markWebhookEventFailed(db, eventId, {
					error: stepResult.error,
					failedStep: step,
					attemptCount: refreshed.attemptCount,
					maxAttempts: refreshed.maxAttempts,
					nextRetryAt
				});

				logError('wc.webhook.revoke.step', new Error(stepResult.error), {
					eventId,
					orderId: order.id,
					step,
					reason,
					attempt: refreshed.attemptCount,
					status: terminalStatus
				});

				return {
					...base,
					status: terminalStatus,
					error: stepResult.error
				};
			}
		}

		await markWebhookEventCompleted(db, eventId);
		return { ...base, status: 'completed' };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const nextRetryAt =
			refreshed.attemptCount < refreshed.maxAttempts
				? Date.now() + computeRetryDelayMs(refreshed.attemptCount)
				: null;

		const terminalStatus = await markWebhookEventFailed(db, eventId, {
			error: message,
			failedStep: 'revoke',
			attemptCount: refreshed.attemptCount,
			maxAttempts: refreshed.maxAttempts,
			nextRetryAt
		});

		logError('wc.webhook.revoke', error, {
			eventId,
			orderId: order.id,
			reason,
			status: terminalStatus
		});

		return { ...base, status: terminalStatus, error: message };
	}
}

async function shouldSkipProvisionDueToRevoke(
	db: D1Compat,
	orderId: number,
	provisionReceivedAt: number
): Promise<boolean> {
	const revokeEvent = await getWebhookEventByKey(db, wcOrderRevokeEventKey(orderId));
	if (!revokeEvent || revokeEvent.status !== 'completed') {
		return false;
	}
	// Prefer the later completed revoke so delayed provision replays cannot restore access.
	return revokeEvent.receivedAt >= provisionReceivedAt || Boolean(revokeEvent.completedAt);
}

async function runWcPipelineStep(
	db: D1Compat,
	env: ActiveCampaignEnv,
	input: {
		event: WebhookEventRecord;
		order: WcOrder;
		tier: PaidMembershipTier;
		step: WebhookStepName;
		attempt: number;
	}
): Promise<{ ok: true } | { ok: false; error: string }> {
	const startedAt = Date.now();
	const email = input.order.billing.email.toLowerCase().trim();

	await insertWebhookProcessingStep(db, {
		eventId: input.event.id,
		step: input.step,
		status: 'running',
		attempt: input.attempt,
		startedAt
	});

	try {
		if (input.step === 'provision') {
			if (await shouldSkipProvisionDueToRevoke(db, input.order.id, input.event.receivedAt)) {
				await insertWebhookProcessingStep(db, {
					eventId: input.event.id,
					step: input.step,
					status: 'skipped',
					attempt: input.attempt,
					startedAt,
					completedAt: Date.now(),
					metadata: { reason: 'order-already-revoked' }
				});
				return { ok: true };
			}

			const name = nameFromBilling(input.order.billing);
			await upsertImportedMemberProvision(db, {
				email,
				name,
				tier: input.tier,
				accessStatus: 'active',
				role: 'member',
				sourceRef: `wc:${input.order.id}`
			});
		}

		if (input.step === 'activecampaign') {
			const configured = Boolean(env.ACTIVECAMPAIGN_API_URL && env.ACTIVECAMPAIGN_API_KEY);
			if (!configured) {
				await insertWebhookProcessingStep(db, {
					eventId: input.event.id,
					step: input.step,
					status: 'skipped',
					attempt: input.attempt,
					startedAt,
					completedAt: Date.now(),
					metadata: { reason: 'activecampaign-not-configured' }
				});
				return { ok: true };
			}

			await applyActiveCampaignTag(
				env,
				{
					email,
					firstName: input.order.billing.first_name,
					lastName: input.order.billing.last_name,
					tagName: tagNameForTier(input.tier)
				},
				{ strict: true }
			);
		}

		await insertWebhookProcessingStep(db, {
			eventId: input.event.id,
			step: input.step,
			status: 'succeeded',
			attempt: input.attempt,
			startedAt,
			completedAt: Date.now()
		});
		return { ok: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await insertWebhookProcessingStep(db, {
			eventId: input.event.id,
			step: input.step,
			status: 'failed',
			attempt: input.attempt,
			error: message,
			startedAt,
			completedAt: Date.now()
		});
		return { ok: false, error: message };
	}
}

async function runWcRevokeStep(
	db: D1Compat,
	input: {
		event: WebhookEventRecord;
		order: WcOrder;
		reason: WcRevokeReason;
		step: WebhookStepName;
		attempt: number;
		kv?: KVNamespace;
	}
): Promise<{ ok: true } | { ok: false; error: string }> {
	const startedAt = Date.now();
	const email = input.order.billing.email.toLowerCase().trim();

	await insertWebhookProcessingStep(db, {
		eventId: input.event.id,
		step: input.step,
		status: 'running',
		attempt: input.attempt,
		startedAt
	});

	try {
		const result = await revokePaidAccessFromWcOrder(
			db,
			{
				email,
				orderId: input.order.id,
				reason: input.reason
			},
			input.kv
		);

		await insertWebhookProcessingStep(db, {
			eventId: input.event.id,
			step: input.step,
			status: 'succeeded',
			attempt: input.attempt,
			startedAt,
			completedAt: Date.now(),
			metadata: {
				reason: input.reason,
				importUpdated: result.importUpdated,
				memberId: result.memberId,
				remainingActiveEntitlements: result.remainingActiveEntitlements,
				accessStatus: result.accessStatus
			}
		});
		return { ok: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await insertWebhookProcessingStep(db, {
			eventId: input.event.id,
			step: input.step,
			status: 'failed',
			attempt: input.attempt,
			error: message,
			startedAt,
			completedAt: Date.now()
		});
		return { ok: false, error: message };
	}
}

export async function replayWcWebhookEventById(
	db: D1Compat,
	env: ActiveCampaignEnv,
	eventId: string,
	kv?: KVNamespace
): Promise<WcWebhookProcessResult> {
	const event = await getWebhookEventById(db, eventId);
	if (!event?.payloadSnapshot || !event.tier) {
		throw new Error('Event is missing payload snapshot or tier');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(event.payloadSnapshot);
	} catch {
		throw new Error('Stored payload snapshot is invalid JSON');
	}

	const order = parseWcOrder(parsed);
	if (!order) {
		throw new Error('Stored payload snapshot failed validation');
	}

	await resetWebhookEventForReplay(db, eventId);

	const revokeReason = revokeReasonFromOrderStatus(order.status);
	if (revokeReason || event.eventKey.endsWith(':revoke')) {
		return processWcRevokeWebhookEvent(
			db,
			eventId,
			order,
			event.tier,
			revokeReason ?? 'wc_refunded',
			kv
		);
	}

	return processWcWebhookEvent(db, env, eventId, order, event.tier);
}

export async function replayWcWebhookEvent(
	db: D1Compat,
	env: ActiveCampaignEnv,
	eventId: string,
	order: WcOrder,
	tier: PaidMembershipTier
): Promise<WcWebhookProcessResult> {
	await resetWebhookEventForReplay(db, eventId);
	return processWcWebhookEvent(db, env, eventId, order, tier);
}

export async function processDueWebhookRetries(
	db: D1Compat,
	env: ActiveCampaignEnv,
	kv?: KVNamespace,
	limit = 25
): Promise<WcWebhookProcessResult[]> {
	const due = await listRetryableWebhookEvents(db, Date.now(), limit);
	const results: WcWebhookProcessResult[] = [];

	for (const event of due) {
		try {
			results.push(await replayWcWebhookEventById(db, env, event.id, kv));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logError('wc.webhook.retry', error, {
				eventId: event.id,
				orderId: event.orderId
			});
			results.push({
				eventId: event.id,
				status: 'failed',
				orderId: Number(event.orderId ?? 0),
				email: event.email ?? '',
				tier: event.tier ?? 'bronze',
				error: message
			});
		}
	}

	return results;
}
