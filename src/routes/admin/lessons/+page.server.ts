import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { normalizeContentAudience, type ContentAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	bumpCatalogCacheVersion,
	createCourseModule,
	createEpisodeFromStreamReference,
	getCourseModuleById,
	listAdminLessons,
	listCourses,
	syncLessonEpisodeStatus,
	updateCourseModule
} from '$lib/server/db/shivworks';
import { requireAdmin } from '$lib/server/guards';
import { resolveRuntimeEnv } from '$lib/server/env';
import { checkStreamVideoExists, parseStreamUidFromReference } from '$lib/server/stream';

function readText(data: FormData, key: string): string {
	return String(data.get(key) || '').trim();
}

function readOptionalText(data: FormData, key: string): string | null {
	return readText(data, key) || null;
}

function readAudience(data: FormData, key: string): ContentAudience {
	return normalizeContentAudience(data.get(key));
}

function readMediaUrl(data: FormData, key: string): string | null {
	const raw = readText(data, key);
	if (!raw) {
		return null;
	}

	if (raw.startsWith('/')) {
		return raw;
	}

	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return null;
		}
		return parsed.toString();
	} catch {
		return null;
	}
}

function readLessonStatus(data: FormData): 'coming_soon' | 'available' | 'archived' {
	const value = readText(data, 'status');
	return value === 'available' || value === 'archived' ? value : 'coming_soon';
}

function readPublishedAt(data: FormData): number | null {
	const raw = readText(data, 'publishedAt');
	if (!raw) {
		return null;
	}

	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? null : parsed;
}

async function resolveStreamIngestState(
	runtimeEnv: ReturnType<typeof resolveRuntimeEnv>,
	streamUid: string
): Promise<{
	ingestStatus: 'processing' | 'ready';
	durationSeconds: number | null;
	sourceBytes: number | null;
} | null> {
	const lookup = await checkStreamVideoExists(runtimeEnv, streamUid);

	// A UID Cloudflare does not recognise must not be accepted. Recording it
	// creates a lesson pointing at a video that will never exist, and because
	// the failure looks identical to "still encoding" nobody is ever told.
	if (lookup.exists === false) {
		return null;
	}

	// Cloudflare unreachable or unconfigured: stay lenient. The UID may be
	// perfectly valid, and the webhook or a later sync will settle it.
	if (lookup.exists === 'unknown') {
		return { ingestStatus: 'processing', durationSeconds: null, sourceBytes: null };
	}

	const details = lookup.details;
	const ready = Boolean(details.readyToStream || details.status?.state === 'ready');
	return {
		ingestStatus: ready ? 'ready' : 'processing',
		durationSeconds:
			typeof details.duration === 'number' && details.duration > 0
				? Math.round(details.duration)
				: null,
		sourceBytes: typeof details.size === 'number' && details.size > 0 ? details.size : null
	};
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireAdmin(locals);
	const db = getDBFromPlatform(platform);

	return {
		courses: await listCourses(db),
		lessons: await listAdminLessons(db)
	};
};

export const actions: Actions = {
	createLesson: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const data = await request.formData();

		const courseId = readText(data, 'courseId');
		const title = readText(data, 'title');
		const description = readOptionalText(data, 'description');
		const accessTier = readAudience(data, 'accessTier');
		const thumbnailUrl = readMediaUrl(data, 'thumbnailUrl');
		const streamReference = readOptionalText(data, 'streamReference');
		const status = readLessonStatus(data);
		let publishedAt = readPublishedAt(data);

		if (!courseId || !title) {
			return fail(400, { error: 'Course and title are required.' });
		}

		if (status === 'available' && !publishedAt) {
			publishedAt = Date.now();
		}

		// Resolve the Stream reference before creating anything. Validating after
		// the module exists would leave an empty module behind on rejection.
		let streamUid: string | null = null;
		let streamState: Awaited<ReturnType<typeof resolveStreamIngestState>> = null;
		if (streamReference) {
			streamUid = parseStreamUidFromReference(streamReference);
			if (!streamUid) {
				return fail(400, { error: 'Enter a valid Cloudflare Stream ID or Stream URL.' });
			}

			streamState = await resolveStreamIngestState(runtimeEnv, streamUid);
			if (!streamState) {
				return fail(400, {
					error: `Cloudflare Stream has no video with ID ${streamUid}. Check the ID and try again.`
				});
			}
		}

		const module = await createCourseModule(db, {
			courseId,
			title,
			description,
			accessTier,
			thumbnailUrl
		});

		if (streamUid && streamState) {
			await createEpisodeFromStreamReference(db, {
				moduleId: module.id,
				title,
				description,
				accessTier,
				streamUid,
				...streamState,
				createdByMemberId: locals.user!.clerkUserId
			});
		}

		await updateCourseModule(db, {
			moduleId: module.id,
			title,
			description,
			status,
			videoKind: 'none',
			videoUrl: null,
			durationLabel: null,
			thumbnailUrl,
			publishedAt: status === 'available' ? publishedAt : null,
			accessTier
		});

		if (status === 'available') {
			await syncLessonEpisodeStatus(db, module.id, 'available');
		}

		await bumpCatalogCacheVersion(kv);
		return { success: 'Lesson created.' };
	},

	updateLesson: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const data = await request.formData();

		const moduleId = readText(data, 'moduleId');
		const title = readText(data, 'title');
		const description = readOptionalText(data, 'description');
		const accessTier = readAudience(data, 'accessTier');
		const thumbnailUrl = readMediaUrl(data, 'thumbnailUrl');
		const streamReference = readOptionalText(data, 'streamReference');
		const nextStatus = readLessonStatus(data);
		let publishedAt = readPublishedAt(data);

		if (!moduleId || !title) {
			return fail(400, { error: 'Lesson id and title are required.' });
		}

		const existingModule = await getCourseModuleById(db, moduleId);
		if (!existingModule) {
			return fail(404, { error: 'Lesson not found.' });
		}

		if (nextStatus === 'available' && existingModule.status !== 'available' && !publishedAt) {
			publishedAt = Date.now();
		}
		if (nextStatus !== 'available') {
			publishedAt = existingModule.publishedAt;
		}

		if (streamReference) {
			const streamUid = parseStreamUidFromReference(streamReference);
			if (!streamUid) {
				return fail(400, { error: 'Enter a valid Cloudflare Stream ID or Stream URL.' });
			}

			const streamState = await resolveStreamIngestState(runtimeEnv, streamUid);
			if (!streamState) {
				return fail(400, {
					error: `Cloudflare Stream has no video with ID ${streamUid}. Check the ID and try again.`
				});
			}

			await createEpisodeFromStreamReference(db, {
				moduleId,
				title,
				description,
				accessTier,
				streamUid,
				...streamState,
				createdByMemberId: locals.user!.clerkUserId
			});
		}

		await updateCourseModule(db, {
			moduleId,
			title,
			description,
			status: nextStatus,
			videoKind: existingModule.videoKind,
			videoUrl: existingModule.videoUrl,
			durationLabel: existingModule.durationLabel,
			thumbnailUrl,
			publishedAt: nextStatus === 'available' ? publishedAt : null,
			accessTier
		});

		await syncLessonEpisodeStatus(db, moduleId, nextStatus);
		await bumpCatalogCacheVersion(kv);

		return { success: 'Lesson updated.' };
	}
};
