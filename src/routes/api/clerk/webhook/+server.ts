import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteMemberByClerkId, upsertMemberFromWebhook } from '$lib/server/db/shivworks';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { verifyClerkWebhook } from '$lib/server/clerk';
import { bust } from '$lib/server/kv-cache';
import { logError } from '$lib/server/log';
import { claimWebhookEvent } from '$lib/server/webhook-idempotency';
import { ClerkWebhookEventSchema } from '$lib/server/schemas';
import {
	getWebhookDisplayName,
	getWebhookPrimaryEmail,
	isWebhookPrimaryEmailVerified,
	type ClerkWebhookUser
} from '$lib/server/clerk-webhook-user';

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);

	if (!runtimeEnv.CLERK_WEBHOOK_SIGNING_SECRET) {
		logError('clerk.webhook.config', new Error('CLERK_WEBHOOK_SIGNING_SECRET is not set'));
		return json({ success: false, error: 'webhook not configured' }, { status: 500 });
	}

	// Read the svix-id for idempotency before the body is consumed by verification.
	const svixId = request.headers.get('svix-id');

	let rawEvent: Awaited<ReturnType<typeof verifyClerkWebhook>>;
	try {
		rawEvent = await verifyClerkWebhook(request, runtimeEnv);
	} catch (error) {
		logError('clerk.webhook.verify', error);
		return json({ success: false, error: 'invalid signature' }, { status: 401 });
	}

	const parsed = ClerkWebhookEventSchema.safeParse(rawEvent);
	if (!parsed.success) {
		logError('clerk.webhook.shape', new Error('Invalid event shape'));
		return json({ success: false, error: 'Invalid event shape' }, { status: 400 });
	}
	const event = rawEvent;

	const db = getDBFromPlatform(platform);

	if (svixId) {
		const claim = await claimWebhookEvent(db, 'clerk', svixId, `type=${event.type}`);
		if (!claim.fresh) {
			return json({ success: true, replayed: true });
		}
	}

	const kv = platform?.env?.KV;

	try {
		switch (event.type) {
			case 'user.created':
			case 'user.updated': {
				const data = event.data as ClerkWebhookUser;
				await upsertMemberFromWebhook(db, {
					clerkUserId: data.id,
					email: getWebhookPrimaryEmail(data),
					name: getWebhookDisplayName(data),
					emailVerified: isWebhookPrimaryEmailVerified(data)
				});
				await bust(kv, `member:${data.id}`, `courses:${data.id}`);
				break;
			}
			case 'user.deleted': {
				const data = event.data as { id?: string | null };
				if (data.id) {
					await deleteMemberByClerkId(db, data.id);
					await bust(kv, `member:${data.id}`, `courses:${data.id}`, `progress:${data.id}`);
				}
				break;
			}
			default:
				break;
		}

		return json({ success: true });
	} catch (error) {
		logError('clerk.webhook.process', error);
		return json({ success: false, error: 'Clerk webhook failed' }, { status: 500 });
	}
};
