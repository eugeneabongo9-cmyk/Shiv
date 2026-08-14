import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// These tests exercise createCourse and discardFailedUploadEpisode against a
// real (throwaway) SQLite database via the same D1Compat fallback path used
// in local/Node environments, so migrations, UNIQUE constraints, and cascades
// behave exactly like production instead of relying on ad-hoc mocks.
const dbPath = join(tmpdir(), `shivworks-admin-upload-test-${Date.now()}-${process.pid}.db`);
process.env.SHIVWORKS_DB_MODE = 'sqlite';
process.env.DATABASE_PATH = dbPath;

const { getDB } = await import('$lib/server/d1-compat');
const {
	applyStreamMediaWebhookUpdate,
	attachStreamUidToMediaAsset,
	createCourse,
	createCourseModule,
	createEpisodeUploadReservation,
	deleteCourseIfEmpty,
	deleteCourseModuleIfEmpty,
	discardFailedUploadEpisode,
	getCourseModuleById,
	getCourseModuleEpisodeById,
	updateUploadEpisodeMetadata
} = await import('./shivworks');

const db = getDB();

beforeAll(async () => {
	// Force the lazy SQLite connection (and its migrations) to initialize
	// before any test runs by issuing a trivial query.
	await db.prepare('SELECT 1').first();

	// media_assets.created_by_member_id has a foreign key to members, so seed
	// a member row the reservation tests can reference.
	await db
		.prepare(
			`INSERT OR IGNORE INTO members (clerk_user_id, email, name, access_status, role, created_at, updated_at)
			 VALUES ('admin_1', 'admin@example.com', 'Admin', 'active', 'admin', ?, ?)`
		)
		.bind(Date.now(), Date.now())
		.run();
});

afterAll(() => {
	// Best-effort cleanup only — better-sqlite3 keeps its file handle open for
	// the life of the process, so the underlying file may still be locked.
	for (const suffix of ['', '-wal', '-shm']) {
		try {
			if (existsSync(`${dbPath}${suffix}`)) {
				rmSync(`${dbPath}${suffix}`);
			}
		} catch {
			// Ignore — this is a throwaway temp file and will be cleaned up by the OS.
		}
	}
});

describe('createCourse', () => {
	it('creates a new destination that defaults to non-public', async () => {
		const course = await createCourse(db, {
			title: 'Knife Defense 101',
			slug: 'knife-defense-101',
			description: 'A brand-new course destination for uploads.',
			accessTier: 'member',
			courseKind: 'course'
		});

		expect(course.status).toBe('coming_soon');
		expect(course.slug).toBe('knife-defense-101');
		expect(course.accessTier).toBe('member');
	});

	it('rejects a duplicate slug with a useful message', async () => {
		await createCourse(db, {
			title: 'Spotlight Series Alpha',
			slug: 'spotlight-series-alpha',
			description: 'First series with this slug.',
			accessTier: 'vip',
			courseKind: 'series'
		});

		await expect(
			createCourse(db, {
				title: 'Spotlight Series Alpha Duplicate',
				slug: 'spotlight-series-alpha',
				description: 'Second attempt with the same slug.',
				accessTier: 'vip',
				courseKind: 'series'
			})
		).rejects.toThrow(/already exists/i);
	});

	it('rejects an invalid slug format', async () => {
		await expect(
			createCourse(db, {
				title: 'Bad Slug Course',
				slug: 'Not A Valid Slug!',
				description: 'Should be rejected before hitting the database.',
				accessTier: 'member',
				courseKind: 'course'
			})
		).rejects.toThrow(/lowercase letters/i);
	});

	it('rejects a missing title or description', async () => {
		await expect(
			createCourse(db, {
				title: '',
				slug: 'no-title',
				description: 'Has a description but no title.',
				accessTier: 'member',
				courseKind: 'course'
			})
		).rejects.toThrow(/title/i);
	});
});

describe('discardFailedUploadEpisode', () => {
	it('deletes a pending or failed upload reservation so the admin can retry', async () => {
		const module = await createCourseModule(db, {
			courseId: 'course_foundations',
			title: 'Discard test module',
			description: null,
			accessTier: 'member',
			thumbnailUrl: null
		});

		const reservation = await createEpisodeUploadReservation(db, {
			moduleId: module.id,
			title: 'Abandoned upload',
			description: null,
			sourceBytes: 1024,
			durationSeconds: null,
			playbackPolicy: 'private',
			fileName: 'abandoned.mp4',
			createdByMemberId: 'admin_1'
		});

		expect(reservation.mediaAsset.ingestStatus).toBe('pending_upload');

		const result = await discardFailedUploadEpisode(db, reservation.episode.id);
		expect(result.mediaAssetId).toBe(reservation.mediaAsset.id);

		const episodeAfterDiscard = await getCourseModuleEpisodeById(db, reservation.episode.id);
		expect(episodeAfterDiscard).toBeNull();
	});

	it('refuses to discard media that Cloudflare already reports ready', async () => {
		const module = await createCourseModule(db, {
			courseId: 'course_foundations',
			title: 'Ready module',
			description: null,
			accessTier: 'member',
			thumbnailUrl: null
		});

		const reservation = await createEpisodeUploadReservation(db, {
			moduleId: module.id,
			title: 'Already ready',
			description: null,
			sourceBytes: 1024,
			durationSeconds: null,
			playbackPolicy: 'private',
			fileName: 'ready.mp4',
			createdByMemberId: 'admin_1'
		});

		await db
			.prepare("UPDATE media_assets SET ingest_status = 'ready' WHERE id = ?")
			.bind(reservation.mediaAsset.id)
			.run();

		await expect(discardFailedUploadEpisode(db, reservation.episode.id)).rejects.toThrow(
			/protected/i
		);

		const episodeAfterAttempt = await getCourseModuleEpisodeById(db, reservation.episode.id);
		expect(episodeAfterAttempt).not.toBeNull();
	});

	it('throws for an episode that does not exist', async () => {
		await expect(discardFailedUploadEpisode(db, 'episode_does_not_exist')).rejects.toThrow(
			/not found/i
		);
	});
});

describe('direct upload metadata lifecycle', () => {
	it('saves edits made during upload and backfills the Stream thumbnail when ready', async () => {
		const module = await createCourseModule(db, {
			courseId: 'course_foundations',
			title: 'Metadata lifecycle module',
			description: null,
			accessTier: 'member',
			thumbnailUrl: null
		});
		const reservation = await createEpisodeUploadReservation(db, {
			moduleId: module.id,
			title: 'Filename title',
			description: null,
			sourceBytes: 2048,
			durationSeconds: null,
			playbackPolicy: 'private',
			fileName: 'lesson.mp4',
			createdByMemberId: 'admin_1'
		});
		const streamUid = 'a1b2c3d4e5f6789012345678abcdef01';
		const thumbnailUrl = `https://customer-example.cloudflarestream.com/${streamUid}/thumbnails/thumbnail.jpg`;

		await attachStreamUidToMediaAsset(db, reservation.mediaAsset.id, streamUid);
		await updateUploadEpisodeMetadata(db, {
			episodeId: reservation.episode.id,
			title: 'Edited while uploading',
			description: 'Final lesson description',
			accessTier: 'vip'
		});
		await applyStreamMediaWebhookUpdate(db, {
			streamUid,
			state: 'ready',
			durationSeconds: 600,
			sourceBytes: 4096,
			failureReason: null,
			thumbnailUrl
		});

		const episode = await getCourseModuleEpisodeById(db, reservation.episode.id);
		const updatedModule = await getCourseModuleById(db, module.id);
		expect(episode).toMatchObject({
			title: 'Edited while uploading',
			description: 'Final lesson description',
			accessTier: 'vip',
			media: {
				ingestStatus: 'ready',
				durationSeconds: 600,
				sourceBytes: 4096
			}
		});
		expect(updatedModule?.thumbnailUrl).toBe(thumbnailUrl);
	});
});

describe('deleteCourseIfEmpty / deleteCourseModuleIfEmpty', () => {
	it('deletes an empty module and refuses when episodes exist', async () => {
		const course = await createCourse(db, {
			title: 'Delete Guard Course',
			slug: 'delete-guard-course',
			description: 'Used to verify empty-only deletes.',
			accessTier: 'member',
			courseKind: 'course'
		});

		const emptyModule = await createCourseModule(db, {
			courseId: course.id,
			title: 'Empty module',
			description: null,
			accessTier: 'member',
			thumbnailUrl: null
		});

		await deleteCourseModuleIfEmpty(db, emptyModule.id);

		const filledModule = await createCourseModule(db, {
			courseId: course.id,
			title: 'Filled module',
			description: null,
			accessTier: 'member',
			thumbnailUrl: null
		});

		await createEpisodeUploadReservation(db, {
			moduleId: filledModule.id,
			title: 'Blocking episode',
			description: null,
			sourceBytes: 1024,
			durationSeconds: null,
			playbackPolicy: 'private',
			fileName: 'block.mp4',
			createdByMemberId: 'admin_1'
		});

		await expect(deleteCourseModuleIfEmpty(db, filledModule.id)).rejects.toThrow(/episodes/i);
	});

	it('deletes an empty course and refuses when modules exist', async () => {
		const emptyCourse = await createCourse(db, {
			title: 'Empty Delete Course',
			slug: 'empty-delete-course',
			description: 'No modules yet.',
			accessTier: 'member',
			courseKind: 'course'
		});

		await deleteCourseIfEmpty(db, emptyCourse.id);

		const filledCourse = await createCourse(db, {
			title: 'Filled Delete Course',
			slug: 'filled-delete-course',
			description: 'Has a module.',
			accessTier: 'member',
			courseKind: 'course'
		});

		await createCourseModule(db, {
			courseId: filledCourse.id,
			title: 'Blocking module',
			description: null,
			accessTier: 'member',
			thumbnailUrl: null
		});

		await expect(deleteCourseIfEmpty(db, filledCourse.id)).rejects.toThrow(/modules/i);
	});
});
