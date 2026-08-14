import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { formatScheduleForEmail, parseDateTimeLocal } from '$lib/admin/schedule-time';
import {
	isMemberTier,
	normalizeContentAudience,
	type AccessStatus,
	type ContentAudience,
	type MembershipTier
} from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	type CourseModuleVideoKind,
	approveVipCallRequest,
	applyStreamMediaWebhookUpdate,
	bumpCatalogCacheVersion,
	claimImportedMemberProvision,
	createCourse,
	createCourseModule,
	createEpisodeFromStreamReference,
	createExternalLink,
	createActivityUpdate,
	createEvent,
	deleteCourseIfEmpty,
	deleteCourseModuleIfEmpty,
	discardFailedUploadEpisode,
	getMemberByClerkId,
	getCourseModuleById,
	getCourseModuleEpisodeById,
	getEventById,
	listContentReleaseNotificationRecipients,
	listImportedMemberProvisions,
	listAdminExternalLinks,
	listAdminMembers,
	listMembersByEmails,
	listCourses,
	listCourseModuleEpisodes,
	listCourseModules,
	listEventReminderRecipients,
	listUpdateNotificationRecipients,
	listEvents,
	listPendingVipCallRequests,
	listRecentUpdates,
	slugify,
	upsertImportedMemberProvision,
	upsertImportedMemberProvisionsBatch,
	updateCourseModule,
	updateCourseModuleEpisodeStatus,
	updateCourseStatus,
	updateEvent,
	updateExternalLink,
	updateMemberTier
} from '$lib/server/db/shivworks';
import { requireAdmin } from '$lib/server/guards';
import {
	sendContentReleaseEmail,
	sendImportedMemberOnboardingEmail,
	sendLivestreamReminderEmail,
	sendUpdateNotificationEmail,
	sendVipBookingEmail
} from '$lib/email';
import { resolveRuntimeEnv } from '$lib/server/env';
import {
	nudgeAwaitingSignupImports,
	nudgeImportedMemberOnboarding
} from '$lib/server/import-onboarding-nudge';
import { parseImportedMemberCsv } from '$lib/server/member-imports';
import {
	getMaxDirectUploadBytes,
	getStreamConfigStatus,
	checkStreamVideoExists,
	parseStreamUidFromReference
} from '$lib/server/stream';

function readText(data: FormData, key: string): string {
	return String(data.get(key) || '').trim();
}

function readScheduleTime(data: FormData, key: string): number | null {
	const epochText = readText(data, `${key}Epoch`);
	if (epochText) {
		const epoch = Number(epochText);
		if (Number.isFinite(epoch)) return epoch;
	}

	const offset = Number(data.get('timezoneOffsetMinutes') ?? 0);
	return parseDateTimeLocal(readText(data, key), offset);
}

function readOptionalText(data: FormData, key: string): string | null {
	return readText(data, key) || null;
}

function readSortOrder(data: FormData, key: string): number {
	const parsed = Number.parseInt(readText(data, key) || '0', 10);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function readChecked(data: FormData, key: string): boolean {
	return data.get(key) !== null;
}

function readMembershipTier(data: FormData, key: string): MembershipTier | null {
	const value = data.get(key);
	return isMemberTier(value) ? value : null;
}

function readAccessStatus(data: FormData, key: string): AccessStatus {
	const value = data.get(key);
	return value === 'active' || value === 'revoked' ? value : 'none';
}

function readAudience(data: FormData, key: string): ContentAudience {
	return normalizeContentAudience(data.get(key));
}

function readExternalUrl(data: FormData, key: string): string | null {
	const raw = readText(data, key);
	if (!raw) {
		return null;
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

/** Rejects unsafe embed hosts for live iframes while allowing common providers. */
function readEventEmbedUrl(data: FormData, key: string): string | null {
	const raw = readText(data, key);
	if (!raw) {
		return null;
	}

	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== 'https:') {
			return null;
		}
		const host = parsed.hostname.toLowerCase();
		const allowed =
			host === 'www.youtube.com' ||
			host === 'youtube.com' ||
			host === 'youtu.be' ||
			host === 'player.vimeo.com' ||
			host.endsWith('.cloudflarestream.com') ||
			host === 'iframe.cloudflarestream.com' ||
			host === 'embed.cloudflarestream.com' ||
			host === 'zoom.us' ||
			host.endsWith('.zoom.us');
		return allowed ? parsed.toString() : null;
	} catch {
		return null;
	}
}

function readRequiredExternalField(
	data: FormData,
	key: string,
	reader: (data: FormData, key: string) => string | null
): { ok: true; value: string | null } | { ok: false; error: string } {
	const raw = readText(data, key);
	if (!raw) {
		return { ok: true, value: null };
	}
	const value = reader(data, key);
	if (!value) {
		return {
			ok: false,
			error:
				key === 'embedUrl'
					? 'Embed URL must be a valid https YouTube, Vimeo, Zoom, or Cloudflare Stream link.'
					: 'Booking URL must be a valid http(s) link.'
		};
	}
	return { ok: true, value };
}

function readMediaUrl(data: FormData, key: string): string | null {
	const raw = readText(data, key);
	if (!raw) {
		return null;
	}

	if (raw.startsWith('/')) {
		return raw;
	}

	return readExternalUrl(data, key);
}

function readCourseModuleVideoKind(data: FormData, key: string): CourseModuleVideoKind {
	const value = data.get(key);
	return value === 'mp4' || value === 'embed' ? value : 'none';
}

function formatImportParseWarnings(errors: string[]): string {
	if (errors.length === 0) {
		return '';
	}

	const preview = errors.slice(0, 3).join(' ');
	const remainder = errors.length > 3 ? ` …and ${errors.length - 3} more.` : '';
	return ` Skipped ${errors.length} row${errors.length === 1 ? '' : 's'}: ${preview}${remainder}`;
}

function getVideoUploadConfig(platform: App.Platform | undefined) {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	return getStreamConfigStatus(runtimeEnv);
}

function readCourseKind(data: FormData, key: string): 'course' | 'series' {
	return data.get(key) === 'series' ? 'series' : 'course';
}

function readCourseCreationStatus(data: FormData, key: string): 'coming_soon' | 'archived' {
	return data.get(key) === 'archived' ? 'archived' : 'coming_soon';
}

async function readCsvUpload(data: FormData): Promise<string> {
	const file = data.get('csvFile');
	if (file && typeof file === 'object' && 'text' in file && typeof file.text === 'function') {
		const text = await file.text();
		if (text.trim()) {
			return text.trim();
		}
	}

	return readText(data, 'csvData');
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireAdmin(locals);
	const db = getDBFromPlatform(platform);
	const imports = await listImportedMemberProvisions(db);

	const bronzeImports = imports.filter((row) => row.tier === 'bronze').length;
	const vipImports = imports.filter((row) => row.tier === 'vip').length;

	return {
		videoUploadConfig: getVideoUploadConfig(platform),
		maxUploadFileSizeBytes: getMaxDirectUploadBytes(),
		members: await listAdminMembers(db),
		imports,
		importStats: {
			total: imports.length,
			bronze: bronzeImports,
			vip: vipImports,
			queued: imports.filter((row) => !row.claimedAt).length,
			claimed: imports.filter((row) => row.claimedAt).length
		},
		courses: await listCourses(db),
		modules: await listCourseModules(db),
		episodes: await listCourseModuleEpisodes(db),
		updates: await listRecentUpdates(db, { ...locals.user!, tier: 'vip' }, 25),
		events: await listEvents(db, { ...locals.user!, tier: 'vip' }),
		links: await listAdminExternalLinks(db),
		vipRequests: await listPendingVipCallRequests(db)
	};
};

export const actions: Actions = {
	importMembers: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const data = await request.formData();
		const csvText = await readCsvUpload(data);
		const importValues = {
			csvData: readText(data, 'csvData'),
			sendOnboardingEmail: readChecked(data, 'sendOnboardingEmail')
		};

		if (!csvText) {
			return fail(400, {
				action: 'importMembers' as const,
				error: 'Upload a CSV file or paste CSV rows to import members.',
				values: importValues
			});
		}

		const parsed = parseImportedMemberCsv(csvText);
		if (parsed.rows.length === 0) {
			return fail(400, {
				action: 'importMembers' as const,
				error: parsed.errors.join(' ') || 'No valid purchaser rows found in the CSV.',
				values: importValues
			});
		}

		let claimedCount = 0;
		let emailedCount = 0;
		let queuedCount = 0;
		const warnings: string[] = [];
		const sendEmails = readChecked(data, 'sendOnboardingEmail');
		const sourceBatch = `admin-import-${Date.now()}`;
		const importRows = parsed.rows.map((row) => ({
			...row,
			sourceRef: row.sourceRef || sourceBatch
		}));

		await upsertImportedMemberProvisionsBatch(db, importRows);
		const existingMembers = await listMembersByEmails(
			db,
			importRows.map((row) => row.email)
		);
		const existingMemberByEmail = new Map(
			existingMembers.map((member) => [member.email.trim().toLowerCase(), member])
		);

		for (const row of importRows) {
			const existingMember = existingMemberByEmail.get(row.email.trim().toLowerCase());
			if (existingMember) {
				await claimImportedMemberProvision(db, {
					clerkUserId: existingMember.clerkUserId,
					email: row.email,
					name: existingMember.name || row.name
				});
				claimedCount += 1;
				continue;
			}

			queuedCount += 1;

			if (!sendEmails) {
				continue;
			}

			try {
				await upsertImportedMemberProvision(db, {
					...row,
					lastEmailedAt: Date.now()
				});
				await sendImportedMemberOnboardingEmail(runtimeEnv, {
					email: row.email,
					name: row.name,
					tier: row.tier
				});
				emailedCount += 1;
			} catch (error) {
				console.error('Failed to send imported member onboarding email', error);
				warnings.push(`Could not send onboarding email to ${row.email}.`);
			}
		}

		const parseWarnings = formatImportParseWarnings(parsed.errors);

		return {
			action: 'importMembers' as const,
			success: `${parsed.rows.length} member${parsed.rows.length === 1 ? '' : 's'} imported. ${claimedCount} claimed immediately, ${queuedCount} queued, ${emailedCount} onboarding email${emailedCount === 1 ? '' : 's'} sent.${parseWarnings}${warnings.length > 0 ? ` ${warnings.join(' ')}` : ''}`,
			importWarnings: parsed.errors.length > 0 ? parsed.errors : undefined
		};
	},

	resendImportOnboarding: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const email = readText(await request.formData(), 'email');
		if (!email) {
			return fail(400, { error: 'Import email is required.' });
		}

		const result = await nudgeImportedMemberOnboarding(db, runtimeEnv, email);
		if (!result.ok) {
			return fail(400, { error: result.error });
		}
		if (result.status === 'cooldown') {
			return {
				success: `Onboarding email for ${email} was already sent recently. Try again after the 24h cooldown.`
			};
		}
		return { success: `Onboarding re-nudge sent to ${email}.` };
	},

	nudgeAwaitingSignups: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const data = await request.formData();
		if (readText(data, 'confirmBulkNudge') !== 'confirm') {
			return fail(400, {
				error: 'Review the awaiting-signup recipients and confirm before sending re-nudges.'
			});
		}

		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const result = await nudgeAwaitingSignupImports(db, runtimeEnv);
		const failureNote =
			result.failures.length > 0 ? ` Failures: ${result.failures.slice(0, 3).join(' ')}` : '';
		return {
			success: `Awaiting-signup re-nudge complete. Sent ${result.sent}, skipped ${result.skippedCooldown} on cooldown, skipped ${result.skippedInactive} inactive/ineligible.${failureNote}`
		};
	},

	linkExistingStreamVideo: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const moduleId = readText(data, 'moduleId');
		const title = readText(data, 'title');
		const description = readOptionalText(data, 'description');
		const accessTier = readAudience(data, 'accessTier');
		const streamUid = parseStreamUidFromReference(readText(data, 'streamReference'));
		if (!moduleId || !title || !streamUid) {
			return fail(400, {
				error: 'Destination, title, and a valid Cloudflare Stream ID or URL are required.'
			});
		}

		const db = getDBFromPlatform(platform);
		if (!(await getCourseModuleById(db, moduleId))) {
			return fail(404, { error: 'Upload destination not found.' });
		}

		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		let ingestStatus: 'processing' | 'ready' = 'processing';
		let durationSeconds: number | null = null;
		let sourceBytes: number | null = null;
		let thumbnailUrl: string | null = null;

		const lookup = await checkStreamVideoExists(runtimeEnv, streamUid);

		// Reject a UID Cloudflare does not recognise. Accepting one records a
		// lesson against a video that will never exist, and the resulting failure
		// is indistinguishable from "still encoding" — which is how an episode
		// ends up reported ready while members get a playback error.
		if (lookup.exists === false) {
			return fail(400, {
				error: `Cloudflare Stream has no video with ID ${streamUid}. Check the ID and try again.`
			});
		}

		// exists === 'unknown' means Stream was unreachable or unconfigured, not
		// that the UID is wrong. Stay lenient: the webhook or automatic sync will
		// fill these values in once Stream is reachable.
		if (lookup.exists === true) {
			const details = lookup.details;
			ingestStatus =
				details.readyToStream || details.status?.state === 'ready' ? 'ready' : 'processing';
			durationSeconds =
				typeof details.duration === 'number' && details.duration > 0
					? Math.round(details.duration)
					: null;
			sourceBytes = typeof details.size === 'number' && details.size > 0 ? details.size : null;
			thumbnailUrl = details.thumbnail || null;
		}

		const linked = await createEpisodeFromStreamReference(db, {
			moduleId,
			title,
			description,
			accessTier,
			streamUid,
			ingestStatus,
			durationSeconds,
			sourceBytes,
			createdByMemberId: locals.user!.clerkUserId
		});
		if (thumbnailUrl) {
			await applyStreamMediaWebhookUpdate(db, {
				streamUid,
				state: ingestStatus,
				durationSeconds,
				sourceBytes,
				thumbnailUrl,
				failureReason: null
			});
		}
		await bumpCatalogCacheVersion(platform?.env?.KV);
		return { success: `Linked ${linked.episode.title} to Cloudflare Stream.` };
	},

	updateMember: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		await updateMemberTier(
			db,
			String(data.get('memberId')),
			readMembershipTier(data, 'tier'),
			readAccessStatus(data, 'accessStatus')
		);
		return { success: 'Member access updated.' };
	},

	updateCourse: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		await updateCourseStatus(
			db,
			String(data.get('courseId')),
			String(data.get('status')) as 'coming_soon' | 'available' | 'archived',
			(String(data.get('badgeText')) || '').trim() || null,
			readAudience(data, 'accessTier')
		);
		return { success: 'Course settings updated.' };
	},

	archiveCourse: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const courseId = readText(await request.formData(), 'courseId');
		if (!courseId) {
			return fail(400, { error: 'Course id is required.' });
		}

		const course = (await listCourses(db)).find((entry) => entry.id === courseId);
		if (!course) {
			return fail(404, { error: 'Course not found.' });
		}

		await updateCourseStatus(db, courseId, 'archived', course.badgeText, course.accessTier);
		await bumpCatalogCacheVersion(kv);
		return { success: `"${course.title}" archived.` };
	},

	deleteCourse: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const courseId = readText(await request.formData(), 'courseId');
		if (!courseId) {
			return fail(400, { error: 'Course id is required.' });
		}

		try {
			await deleteCourseIfEmpty(db, courseId);
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Could not delete that course.'
			});
		}

		await bumpCatalogCacheVersion(kv);
		return { success: 'Empty course deleted.' };
	},

	archiveModule: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const moduleId = readText(await request.formData(), 'moduleId');
		if (!moduleId) {
			return fail(400, { error: 'Module id is required.' });
		}

		const existingModule = await getCourseModuleById(db, moduleId);
		if (!existingModule) {
			return fail(404, { error: 'Course module not found.' });
		}

		await updateCourseModule(db, {
			moduleId,
			title: existingModule.title,
			description: existingModule.description,
			status: 'archived',
			videoKind: existingModule.videoKind,
			videoUrl: existingModule.videoUrl,
			durationLabel: existingModule.durationLabel
		});
		await bumpCatalogCacheVersion(kv);
		return { success: `"${existingModule.title}" archived.` };
	},

	deleteModule: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const moduleId = readText(await request.formData(), 'moduleId');
		if (!moduleId) {
			return fail(400, { error: 'Module id is required.' });
		}

		try {
			await deleteCourseModuleIfEmpty(db, moduleId);
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Could not delete that module.'
			});
		}

		await bumpCatalogCacheVersion(kv);
		return { success: 'Empty module deleted.' };
	},

	updateModule: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const moduleId = readText(data, 'moduleId');
		const title = readText(data, 'title');
		const description = readOptionalText(data, 'description');
		const nextStatus =
			readText(data, 'status') === 'available'
				? 'available'
				: readText(data, 'status') === 'archived'
					? 'archived'
					: 'coming_soon';

		if (!moduleId || !title) {
			return fail(400, { error: 'Course modules require an id and title.' });
		}

		const existingModule = await getCourseModuleById(db, moduleId);
		if (!existingModule) {
			return fail(404, { error: 'Course module not found.' });
		}

		if (nextStatus === 'available' && existingModule.videoKind === 'none') {
			const moduleEpisodes = await listCourseModuleEpisodes(db, { moduleId });
			const hasReadyEpisode = moduleEpisodes.some(
				(episode) => episode.media?.ingestStatus === 'ready'
			);
			if (!hasReadyEpisode) {
				return fail(400, {
					error:
						'Publishing is blocked until Cloudflare Stream reports the uploaded video as ready. Use Sync Stream status, then try again.'
				});
			}
		}

		await updateCourseModule(db, {
			moduleId,
			title,
			description,
			status: nextStatus,
			videoKind: readCourseModuleVideoKind(data, 'videoKind'),
			videoUrl: readMediaUrl(data, 'videoUrl'),
			durationLabel: readOptionalText(data, 'durationLabel')
		});

		if (!readChecked(data, 'sendReleaseEmail')) {
			return { success: 'Course module updated.' };
		}

		const justPublished = existingModule.status !== 'available' && nextStatus === 'available';

		if (!justPublished) {
			return {
				success: 'Course module updated. Release alerts send only when a module moves live.'
			};
		}

		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const recipients = await listContentReleaseNotificationRecipients(
			db,
			existingModule.courseAccessTier
		);
		await Promise.all(
			recipients.map((recipient) =>
				sendContentReleaseEmail(runtimeEnv, {
					email: recipient.email,
					name: recipient.name,
					courseTitle: existingModule.courseTitle,
					courseSlug: existingModule.courseSlug,
					moduleTitle: title,
					description
				})
			)
		);

		return {
			success: `Course module updated and ${recipients.length} release alert email${recipients.length === 1 ? '' : 's'} sent.`
		};
	},

	updateEpisode: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const episodeId = readText(data, 'episodeId');
		const nextStatus =
			readText(data, 'status') === 'available'
				? 'available'
				: readText(data, 'status') === 'archived'
					? 'archived'
					: 'coming_soon';

		if (!episodeId) {
			return fail(400, { error: 'Episode id is required.' });
		}

		const episode = await getCourseModuleEpisodeById(db, episodeId);
		if (!episode) {
			return fail(404, { error: 'Episode not found.' });
		}
		if (nextStatus === 'available' && episode.media?.ingestStatus !== 'ready') {
			return fail(400, { error: 'Sync Stream status before making this episode available.' });
		}

		await updateCourseModuleEpisodeStatus(db, episodeId, nextStatus);
		return { success: 'Episode updated.' };
	},

	discardUpload: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const episodeId = readText(data, 'episodeId');

		if (!episodeId) {
			return fail(400, { error: 'Episode id is required to discard an upload.' });
		}

		try {
			await discardFailedUploadEpisode(db, episodeId);
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Could not discard that upload.'
			});
		}

		return { success: 'Upload discarded. You can start a new upload into this destination.' };
	},

	createCourse: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const data = await request.formData();

		const title = readText(data, 'title');
		const slugInput = readText(data, 'slug');
		const description = readText(data, 'description');
		const accessTier = readAudience(data, 'accessTier');
		const courseKind = readCourseKind(data, 'courseKind');
		const status = readCourseCreationStatus(data, 'status');
		const firstModuleTitle = readOptionalText(data, 'firstModuleTitle');
		const firstModuleDescription = readOptionalText(data, 'firstModuleDescription');

		if (!title || !description) {
			return fail(400, { error: 'New destinations require a title and a description.' });
		}

		const slug = (slugInput || slugify(title, '')).toLowerCase();
		if (!slug) {
			return fail(400, { error: 'Enter a valid slug (lowercase letters, numbers, hyphens).' });
		}

		let course;
		try {
			course = await createCourse(db, {
				title,
				slug,
				description,
				accessTier,
				courseKind,
				status
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Could not create that destination.';
			return fail(message.includes('already exists') ? 409 : 400, { error: message });
		}

		let newModuleId: string | null = null;
		if (firstModuleTitle) {
			const module = await createCourseModule(db, {
				courseId: course.id,
				title: firstModuleTitle,
				description: firstModuleDescription,
				accessTier,
				thumbnailUrl: null
			});
			newModuleId = module.id;
		}

		await bumpCatalogCacheVersion(kv);

		return {
			success: `Created "${course.title}"${newModuleId ? ' with its first module' : ''}. It stays hidden from members until you publish it.`,
			newCourseId: course.id,
			newModuleId
		};
	},

	createModule: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const kv = platform?.env?.KV;
		const data = await request.formData();

		const courseId = readText(data, 'courseId');
		const title = readText(data, 'title');
		const description = readOptionalText(data, 'description');
		const accessTier = readAudience(data, 'accessTier');

		if (!courseId || !title) {
			return fail(400, { error: 'Adding a module requires a destination course and a title.' });
		}

		let module;
		try {
			module = await createCourseModule(db, {
				courseId,
				title,
				description,
				accessTier,
				thumbnailUrl: null
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Could not create that module.'
			});
		}

		await bumpCatalogCacheVersion(kv);

		return {
			success: `Module "${module.title}" created. It stays hidden from members until you publish it.`,
			newModuleId: module.id
		};
	},

	createUpdate: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const title = readText(data, 'title');
		const bodyMarkdown = readText(data, 'bodyMarkdown');
		const audience = readAudience(data, 'audience');

		if (!title || !bodyMarkdown) {
			return fail(400, { error: 'Title and update copy are required.' });
		}

		await createActivityUpdate(db, {
			title,
			bodyMarkdown,
			audience,
			authorName: locals.user?.name || 'Admin'
		});

		if (!readChecked(data, 'sendUpdateEmail')) {
			return { success: 'Update published.' };
		}

		const recipients = await listUpdateNotificationRecipients(db, audience);
		await Promise.all(
			recipients.map((recipient) =>
				sendUpdateNotificationEmail(runtimeEnv, {
					email: recipient.email,
					name: recipient.name,
					title,
					bodyMarkdown
				})
			)
		);

		return {
			success: `Update published and ${recipients.length} notification email${recipients.length === 1 ? '' : 's'} sent.`
		};
	},

	createEvent: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const title = readText(data, 'title');
		const description = readText(data, 'description');
		const startsAtText = readText(data, 'startsAt');
		const endsAtText = readText(data, 'endsAt');
		const startsAt = readScheduleTime(data, 'startsAt');
		const endsAt = readScheduleTime(data, 'endsAt');
		const status =
			readText(data, 'status') === 'live'
				? 'live'
				: readText(data, 'status') === 'ended'
					? 'ended'
					: 'scheduled';

		if (!title || !description) {
			return fail(400, { error: 'Event title and description are required.' });
		}

		if ((startsAtText && startsAt === null) || (endsAtText && endsAt === null)) {
			return fail(400, { error: 'Event start and end times must be valid dates.' });
		}

		if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
			return fail(400, { error: 'Event end time must be later than the start time.' });
		}

		const embedUrl = readRequiredExternalField(data, 'embedUrl', readEventEmbedUrl);
		if (!embedUrl.ok) {
			return fail(400, { error: embedUrl.error });
		}
		const bookingUrl = readRequiredExternalField(data, 'bookingUrl', readExternalUrl);
		if (!bookingUrl.ok) {
			return fail(400, { error: bookingUrl.error });
		}

		await createEvent(db, {
			title,
			description,
			eventKind: readText(data, 'eventKind') === 'vip_call' ? 'vip_call' : 'livestream',
			accessTier: readAudience(data, 'accessTier'),
			status,
			startsAt,
			endsAt,
			embedUrl: embedUrl.value,
			bookingUrl: bookingUrl.value,
			locationType:
				readText(data, 'locationType') === 'zoom'
					? 'zoom'
					: readText(data, 'locationType') === 'external'
						? 'external'
						: 'youtube',
			reminderEnabled: readChecked(data, 'reminderEnabled')
		});

		return {
			success: `"${title}" created with ${status === 'live' ? 'Live' : status === 'ended' ? 'Ended' : 'Scheduled'} status.`
		};
	},

	updateEvent: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const id = readText(data, 'id');
		const title = readText(data, 'title');
		const description = readText(data, 'description');
		const startsAtText = readText(data, 'startsAt');
		const endsAtText = readText(data, 'endsAt');
		const startsAt = readScheduleTime(data, 'startsAt');
		const endsAt = readScheduleTime(data, 'endsAt');

		if (!id || !title || !description) {
			return fail(400, { error: 'Existing events require an id, title, and description.' });
		}

		if ((startsAtText && startsAt === null) || (endsAtText && endsAt === null)) {
			return fail(400, { error: 'Event start and end times must be valid dates.' });
		}

		if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
			return fail(400, { error: 'Event end time must be later than the start time.' });
		}

		const embedUrl = readRequiredExternalField(data, 'embedUrl', readEventEmbedUrl);
		if (!embedUrl.ok) {
			return fail(400, { error: embedUrl.error });
		}
		const bookingUrl = readRequiredExternalField(data, 'bookingUrl', readExternalUrl);
		if (!bookingUrl.ok) {
			return fail(400, { error: bookingUrl.error });
		}

		await updateEvent(db, {
			id,
			title,
			description,
			eventKind: readText(data, 'eventKind') === 'vip_call' ? 'vip_call' : 'livestream',
			accessTier: readAudience(data, 'accessTier'),
			status:
				readText(data, 'status') === 'live'
					? 'live'
					: readText(data, 'status') === 'ended'
						? 'ended'
						: 'scheduled',
			startsAt,
			endsAt,
			embedUrl: embedUrl.value,
			bookingUrl: bookingUrl.value,
			locationType:
				readText(data, 'locationType') === 'zoom'
					? 'zoom'
					: readText(data, 'locationType') === 'external'
						? 'external'
						: 'youtube',
			reminderEnabled: readChecked(data, 'reminderEnabled')
		});

		return { success: 'Event updated.' };
	},

	createLink: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const label = readText(data, 'label');
		const url = readExternalUrl(data, 'url');

		if (!label || !url) {
			return fail(400, { error: 'External links require a label and a valid URL.' });
		}

		try {
			await createExternalLink(db, {
				label,
				url,
				audience: readAudience(data, 'audience'),
				sortOrder: readSortOrder(data, 'sortOrder'),
				description: readOptionalText(data, 'description'),
				ctaText: readOptionalText(data, 'ctaText'),
				linkKey: readOptionalText(data, 'linkKey')
			});
		} catch {
			return fail(400, { error: 'Could not create that external link. Check the URL and key.' });
		}

		return { success: 'External link created.' };
	},

	updateLink: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const id = readText(data, 'id');
		const label = readText(data, 'label');
		const url = readExternalUrl(data, 'url');

		if (!id || !label || !url) {
			return fail(400, { error: 'External links require an id, label, and valid URL.' });
		}

		try {
			await updateExternalLink(db, {
				id,
				label,
				url,
				audience: readAudience(data, 'audience'),
				sortOrder: readSortOrder(data, 'sortOrder'),
				description: readOptionalText(data, 'description'),
				ctaText: readOptionalText(data, 'ctaText'),
				linkKey: readOptionalText(data, 'linkKey')
			});
		} catch {
			return fail(400, { error: 'Could not update that external link. Check the URL and key.' });
		}

		return { success: 'External link updated.' };
	},

	approveVip: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);

		const requestId = String(data.get('requestId') || '');
		const memberId = String(data.get('memberId') || '');
		const startsAt = readScheduleTime(data, 'startsAt');
		const endsAt = readScheduleTime(data, 'endsAt');
		const zoomJoinUrl = String(data.get('zoomJoinUrl') || '').trim() || null;

		if (!requestId || !memberId || startsAt === null || endsAt === null) {
			return fail(400, { error: 'Request, member, and schedule details are required.' });
		}

		await approveVipCallRequest(db, {
			requestId,
			memberId,
			startsAt,
			endsAt,
			zoomJoinUrl
		});

		const member = await getMemberByClerkId(db, memberId);

		if (member?.email) {
			await sendVipBookingEmail(runtimeEnv, {
				email: member.email,
				name: member.name,
				startsAt: formatScheduleForEmail(startsAt),
				joinUrl: zoomJoinUrl
			});
		}

		return { success: 'VIP booking approved and scheduled.' };
	},

	sendReminder: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);

		const eventId = String(data.get('eventId') || '');
		if (!eventId) {
			return fail(400, { error: 'Reminder requires an event.' });
		}

		const db = getDBFromPlatform(platform);
		const event = await getEventById(db, eventId);
		if (!event || !event.startsAt) {
			return fail(400, { error: 'Reminder requires a scheduled event with a start time.' });
		}

		const recipients = await listEventReminderRecipients(db, eventId);
		if (recipients.length === 0) {
			return fail(400, { error: 'No RSVP recipients are ready for reminders yet.' });
		}

		await Promise.all(
			recipients.map((recipient) =>
				sendLivestreamReminderEmail(runtimeEnv, {
					email: recipient.email,
					name: recipient.name,
					title: event.title,
					startsAt: formatScheduleForEmail(event.startsAt!)
				})
			)
		);

		return { success: `${recipients.length} reminder${recipients.length === 1 ? '' : 's'} sent.` };
	}
};
