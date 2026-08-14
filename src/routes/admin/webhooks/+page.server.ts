import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getWebhookEventById,
	getWebhookPipelineMetrics,
	listWebhookEvents,
	listWebhookProcessingSteps,
	type WebhookEventStatus
} from '$lib/server/db/webhook-events';
import { resolveRuntimeEnv } from '$lib/server/env';
import { requireAdmin } from '$lib/server/guards';
import {
	processDueWebhookRetries,
	replayWcWebhookEventById
} from '$lib/server/wc-webhook-pipeline';

function readStatusFilter(value: string | null): WebhookEventStatus | undefined {
	if (
		value === 'completed' ||
		value === 'failed' ||
		value === 'dead_letter' ||
		value === 'processing' ||
		value === 'received'
	) {
		return value;
	}
	return undefined;
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	requireAdmin(locals);
	const db = getDBFromPlatform(platform);
	const status = readStatusFilter(url.searchParams.get('status'));

	const [metrics, events] = await Promise.all([
		getWebhookPipelineMetrics(db),
		listWebhookEvents(db, {
			status: status ? status : ['failed', 'dead_letter', 'processing', 'completed', 'received'],
			limit: 100
		})
	]);

	const selectedId = url.searchParams.get('event');
	const selected =
		selectedId != null
			? {
					event: await getWebhookEventById(db, selectedId),
					steps: await listWebhookProcessingSteps(db, selectedId)
				}
			: null;

	return {
		metrics,
		events,
		filterStatus: status ?? 'all',
		selected
	};
};

export const actions: Actions = {
	replayEvent: async ({ locals, platform, request }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);

		const data = await request.formData();
		const eventId = String(data.get('eventId') ?? '').trim();
		if (!eventId) {
			return fail(400, { error: 'Missing event id' });
		}

		try {
			const result = await replayWcWebhookEventById(db, runtimeEnv, eventId);
			return {
				replayed: true,
				eventId,
				status: result.status,
				error: result.error ?? null
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Replay failed';
			return fail(500, { error: message, eventId });
		}
	},

	processDueRetries: async ({ locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const kv = (
			platform as { env?: { KV?: import('@cloudflare/workers-types').KVNamespace } } | undefined
		)?.env?.KV;

		try {
			const results = await processDueWebhookRetries(db, runtimeEnv, kv);
			const completed = results.filter((result) => result.status === 'completed').length;
			const failed = results.filter(
				(result) => result.status === 'failed' || result.status === 'dead_letter'
			).length;
			return {
				processedDue: true,
				processed: results.length,
				completed,
				failed
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Retry processing failed';
			return fail(500, { error: message });
		}
	}
};
