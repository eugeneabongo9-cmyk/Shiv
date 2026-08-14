import type { ClerkClient } from '@clerk/backend';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
	canAccessAudience,
	isPaidMemberTier,
	normalizeContentAudience,
	type MembershipTier,
	type AccessStatus,
	type ContentAudience
} from '$lib/constants/tiers';
import {
	DEFAULT_MEMBER_NOTIFICATION_PREFERENCES,
	type MemberNotificationPreferences
} from '$lib/constants/notifications';
import type { D1Compat } from '$lib/server/d1-compat';
import { getDisplayName, getPrimaryEmail, isUserEmailVerified } from '$lib/server/clerk';
import { logError } from '$lib/server/log';
import { bust } from '$lib/server/kv-cache';

export interface MemberRecord {
	clerkUserId: string;
	email: string;
	name: string;
	tier: MembershipTier | null;
	accessStatus: AccessStatus;
	role: 'member' | 'admin';
	createdAt: string;
	updatedAt: string;
}

export interface ImportedMemberProvisionRecord {
	id: string;
	email: string;
	name: string;
	tier: MembershipTier;
	accessStatus: AccessStatus;
	role: 'member' | 'admin';
	sourceRef: string | null;
	invitedAt: number | null;
	lastEmailedAt: number | null;
	claimedMemberId: string | null;
	claimedAt: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface MemberEntitlementRecord {
	id: string;
	tier: MembershipTier;
	sourceType: 'wc' | 'import' | 'admin' | 'other';
	status: 'active' | 'revoked';
	createdAt: string;
	updatedAt: string;
}

export interface StoredMemberNotificationPreferences extends MemberNotificationPreferences {
	memberId: string;
	createdAt: string;
	updatedAt: string;
}

export interface ActivityUpdateRecord {
	id: string;
	title: string;
	bodyMarkdown: string;
	audience: ContentAudience;
	publishedAt: number;
	authorName: string | null;
}

export interface CourseRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: 'coming_soon' | 'available' | 'archived';
	sortOrder: number;
	badgeText: string | null;
	artworkUrl: string | null;
	courseKind: 'course' | 'series';
	accessTier: ContentAudience;
	totalModuleCount: number;
	availableModuleCount: number;
	roadmapModuleCount: number;
	completedModuleCount: number;
	startedModuleCount: number;
}

export type CourseModuleVideoKind = 'none' | 'mp4' | 'embed';

export interface CourseModuleRecord {
	id: string;
	courseId: string;
	title: string;
	description: string | null;
	sortOrder: number;
	status: 'coming_soon' | 'available' | 'archived';
	videoKind: CourseModuleVideoKind;
	videoUrl: string | null;
	durationLabel: string | null;
	thumbnailUrl: string | null;
	publishedAt: number | null;
	accessTier: ContentAudience;
}

export interface AdminLessonRecord extends CourseModuleRecord {
	courseSlug: string;
	courseTitle: string;
	courseAccessTier: ContentAudience;
	primaryEpisode: CourseModuleEpisodeRecord | null;
}

export type MediaProvider = 'external' | 'cloudflare_stream';
export type MediaIngestStatus = 'pending_upload' | 'processing' | 'ready' | 'failed';
export type MediaPlaybackPolicy = 'private' | 'public';

export interface MediaAssetRecord {
	id: string;
	provider: MediaProvider;
	providerAssetId: string | null;
	title: string;
	fileName: string | null;
	sourceUrl: string | null;
	sourceBytes: number | null;
	durationSeconds: number | null;
	durationLabel: string | null;
	playbackPolicy: MediaPlaybackPolicy;
	ingestStatus: MediaIngestStatus;
	failureReason: string | null;
	createdByMemberId: string | null;
	uploadedAt: number | null;
	playbackReadyAt: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface CourseModuleEpisodeRecord {
	id: string;
	courseId: string;
	courseSlug: string;
	courseTitle: string;
	courseAccessTier: ContentAudience;
	moduleId: string;
	moduleTitle: string;
	mediaAssetId: string | null;
	episodeNumber: number;
	title: string;
	description: string | null;
	status: 'coming_soon' | 'available' | 'archived';
	accessTier: ContentAudience;
	sortOrder: number;
	durationLabel: string | null;
	media: MediaAssetRecord | null;
}

export interface MemberModuleProgressRecord {
	moduleId: string;
	currentSeconds: number;
	durationSeconds: number | null;
	completedAt: number | null;
	updatedAt: number;
}

export interface ResumeModuleRecord extends MemberModuleProgressRecord {
	courseSlug: string;
	courseTitle: string;
	courseAccessTier: ContentAudience;
	courseStatus: 'coming_soon' | 'available' | 'archived';
	courseArtworkUrl: string | null;
	moduleTitle: string;
	moduleStatus: 'coming_soon' | 'available' | 'archived';
	moduleThumbnailUrl: string | null;
}

export interface MemberEpisodeProgressRecord {
	episodeId: string;
	currentSeconds: number;
	durationSeconds: number | null;
	completedAt: number | null;
	updatedAt: number;
}

export interface MemberModuleNoteRecord {
	moduleId: string;
	body: string;
	updatedAt: number;
}

export interface SeriesRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: 'coming_soon' | 'available' | 'archived';
	artworkUrl: string | null;
	accessTier: ContentAudience;
}

export interface EventRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	eventKind: 'livestream' | 'vip_call';
	accessTier: ContentAudience;
	status: 'scheduled' | 'live' | 'ended';
	startsAt: number | null;
	endsAt: number | null;
	locationType: 'youtube' | 'zoom' | 'external';
	embedUrl: string | null;
	bookingUrl: string | null;
	reminderEnabled: boolean;
}

export interface MemberSessionRecord {
	sessionId: string;
	memberId: string;
	deviceLabel: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: number;
	lastActiveAt: number;
	revokedAt: number | null;
	revokeReason: string | null;
}

export interface VipCallRequestRecord {
	id: string;
	memberId: string;
	goals: string;
	preferredMonth: string | null;
	notes: string | null;
	status: 'requested' | 'approved' | 'scheduled' | 'completed' | 'declined';
	createdAt: number;
	updatedAt: number;
}

export interface PendingVipCallRequestRecord extends VipCallRequestRecord {
	memberEmail: string | null;
	memberName: string | null;
	memberTier: MembershipTier | null;
}

export interface VipCallBookingRecord {
	id: string;
	requestId: string;
	memberId: string;
	startsAt: number;
	endsAt: number;
	zoomJoinUrl: string | null;
	confirmationSentAt: number | null;
}

export interface ExternalLinkRecord {
	id: string;
	linkKey: string;
	label: string;
	url: string;
	audience: ContentAudience;
	sortOrder: number;
	description: string | null;
	ctaText: string | null;
}

export interface EventReminderRecipient {
	memberId: string;
	email: string;
	name: string;
}

export interface UpdateNotificationRecipient extends EventReminderRecipient {
	tier: MembershipTier | null;
	role: 'member' | 'admin';
}

function toIso(value: number | string | null | undefined): string {
	const numeric = typeof value === 'string' ? Number(value) : value;
	return new Date(numeric || Date.now()).toISOString();
}

export function slugify(value: string, fallback = 'item'): string {
	const slug = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

	return slug || fallback;
}

function hasValue<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

function mapMember(row: Record<string, unknown>): MemberRecord {
	return {
		clerkUserId: String(row.clerk_user_id),
		email: String(row.email || ''),
		name: String(row.name || 'Member'),
		tier: row.tier === 'free' || row.tier === 'bronze' || row.tier === 'vip' ? row.tier : null,
		accessStatus:
			row.access_status === 'active' || row.access_status === 'revoked'
				? row.access_status
				: 'none',
		role: row.role === 'admin' ? 'admin' : 'member',
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapAudience(value: unknown): ContentAudience {
	return normalizeContentAudience(value);
}

function mapMemberNotificationPreferences(
	row: Record<string, unknown>
): StoredMemberNotificationPreferences {
	return {
		memberId: String(row.member_id),
		buildUpdates:
			hasValue(row.build_updates) && Number(row.build_updates) === 0
				? false
				: DEFAULT_MEMBER_NOTIFICATION_PREFERENCES.buildUpdates,
		contentReleaseAlerts:
			hasValue(row.content_release_alerts) && Number(row.content_release_alerts) === 0
				? false
				: DEFAULT_MEMBER_NOTIFICATION_PREFERENCES.contentReleaseAlerts,
		livestreamReminders:
			hasValue(row.livestream_reminders) && Number(row.livestream_reminders) === 0
				? false
				: DEFAULT_MEMBER_NOTIFICATION_PREFERENCES.livestreamReminders,
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapImportedMemberProvision(row: Record<string, unknown>): ImportedMemberProvisionRecord {
	return {
		id: String(row.id),
		email: String(row.email || ''),
		name: String(row.name || 'Member'),
		tier: row.tier === 'free' || row.tier === 'bronze' || row.tier === 'vip' ? row.tier : 'free',
		accessStatus:
			row.access_status === 'active' || row.access_status === 'revoked'
				? row.access_status
				: 'none',
		role: row.role === 'admin' ? 'admin' : 'member',
		sourceRef: row.source_ref ? String(row.source_ref) : null,
		invitedAt: hasValue(row.invited_at) ? Number(row.invited_at) : null,
		lastEmailedAt: hasValue(row.last_emailed_at) ? Number(row.last_emailed_at) : null,
		claimedMemberId: row.claimed_member_id ? String(row.claimed_member_id) : null,
		claimedAt: hasValue(row.claimed_at) ? Number(row.claimed_at) : null,
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapMemberEntitlement(row: Record<string, unknown>): MemberEntitlementRecord {
	const sourceType =
		row.source_type === 'wc' || row.source_type === 'import' || row.source_type === 'admin'
			? row.source_type
			: 'other';

	return {
		id: String(row.id),
		tier: row.tier === 'bronze' || row.tier === 'vip' ? row.tier : 'free',
		sourceType,
		status: row.status === 'revoked' ? 'revoked' : 'active',
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapCourse(row: Record<string, unknown>): CourseRecord {
	return {
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		status: row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		sortOrder: Number(row.sort_order || 0),
		badgeText: row.badge_text ? String(row.badge_text) : null,
		artworkUrl: row.artwork_url ? String(row.artwork_url) : null,
		courseKind: row.course_kind === 'series' ? 'series' : 'course',
		accessTier: mapAudience(row.access_tier),
		totalModuleCount: Number(row.total_module_count || 0),
		availableModuleCount: Number(row.available_module_count || 0),
		roadmapModuleCount: Number(row.roadmap_module_count || 0),
		completedModuleCount: Number(row.completed_module_count || 0),
		startedModuleCount: Number(row.started_module_count || 0)
	};
}

function mapCourseModule(row: Record<string, unknown>): CourseModuleRecord {
	return {
		id: String(row.id),
		courseId: String(row.course_id),
		title: String(row.title),
		description: row.description ? String(row.description) : null,
		sortOrder: Number(row.sort_order || 0),
		status: row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		videoKind: row.video_kind === 'mp4' || row.video_kind === 'embed' ? row.video_kind : 'none',
		videoUrl: row.video_url ? String(row.video_url) : null,
		durationLabel: row.duration_label ? String(row.duration_label) : null,
		thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
		publishedAt: hasValue(row.published_at) ? Number(row.published_at) : null,
		accessTier: mapAudience(row.access_tier)
	};
}

function mapMediaAsset(row: Record<string, unknown>, prefix = ''): MediaAssetRecord | null {
	const id = row[`${prefix}id`];
	if (!id) {
		return null;
	}

	const providerValue = row[`${prefix}provider`];
	const ingestValue = row[`${prefix}ingest_status`];
	const policyValue = row[`${prefix}playback_policy`];

	return {
		id: String(id),
		provider: providerValue === 'cloudflare_stream' ? 'cloudflare_stream' : 'external',
		providerAssetId: row[`${prefix}provider_asset_id`]
			? String(row[`${prefix}provider_asset_id`])
			: null,
		title: String(row[`${prefix}title`] || ''),
		fileName: row[`${prefix}file_name`] ? String(row[`${prefix}file_name`]) : null,
		sourceUrl: row[`${prefix}source_url`] ? String(row[`${prefix}source_url`]) : null,
		sourceBytes: hasValue(row[`${prefix}source_bytes`])
			? Number(row[`${prefix}source_bytes`])
			: null,
		durationSeconds: hasValue(row[`${prefix}duration_seconds`])
			? Number(row[`${prefix}duration_seconds`])
			: null,
		durationLabel: row[`${prefix}duration_label`] ? String(row[`${prefix}duration_label`]) : null,
		playbackPolicy: policyValue === 'public' ? 'public' : 'private',
		ingestStatus:
			ingestValue === 'pending_upload' || ingestValue === 'processing' || ingestValue === 'failed'
				? ingestValue
				: 'ready',
		failureReason: row[`${prefix}failure_reason`] ? String(row[`${prefix}failure_reason`]) : null,
		createdByMemberId: row[`${prefix}created_by_member_id`]
			? String(row[`${prefix}created_by_member_id`])
			: null,
		uploadedAt: hasValue(row[`${prefix}uploaded_at`]) ? Number(row[`${prefix}uploaded_at`]) : null,
		playbackReadyAt: hasValue(row[`${prefix}playback_ready_at`])
			? Number(row[`${prefix}playback_ready_at`])
			: null,
		createdAt: toIso(row[`${prefix}created_at`] as number | null),
		updatedAt: toIso(row[`${prefix}updated_at`] as number | null)
	};
}

function mapCourseModuleEpisode(row: Record<string, unknown>): CourseModuleEpisodeRecord {
	return {
		id: String(row.id),
		courseId: String(row.course_id),
		courseSlug: String(row.course_slug || ''),
		courseTitle: String(row.course_title || ''),
		courseAccessTier: mapAudience(row.course_access_tier),
		moduleId: String(row.module_id),
		moduleTitle: String(row.module_title || ''),
		mediaAssetId: row.media_asset_id ? String(row.media_asset_id) : null,
		episodeNumber: Number(row.episode_number || 1),
		title: String(row.title),
		description: row.description ? String(row.description) : null,
		status: row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		accessTier: mapAudience(row.access_tier),
		sortOrder: Number(row.sort_order || 0),
		durationLabel: row.duration_label ? String(row.duration_label) : null,
		media: mapMediaAsset(row, 'media_')
	};
}

function mapMemberModuleProgress(row: Record<string, unknown>): MemberModuleProgressRecord {
	return {
		moduleId: String(row.module_id),
		currentSeconds: Number(row.current_seconds || 0),
		durationSeconds: hasValue(row.duration_seconds) ? Number(row.duration_seconds) : null,
		completedAt: hasValue(row.completed_at) ? Number(row.completed_at) : null,
		updatedAt: Number(row.updated_at || 0)
	};
}

function mapMemberEpisodeProgress(row: Record<string, unknown>): MemberEpisodeProgressRecord {
	return {
		episodeId: String(row.episode_id),
		currentSeconds: Number(row.current_seconds || 0),
		durationSeconds: hasValue(row.duration_seconds) ? Number(row.duration_seconds) : null,
		completedAt: hasValue(row.completed_at) ? Number(row.completed_at) : null,
		updatedAt: Number(row.updated_at || 0)
	};
}

export async function getMemberByClerkId(
	db: D1Compat,
	clerkUserId: string
): Promise<MemberRecord | null> {
	const row = await db
		.prepare('SELECT * FROM members WHERE clerk_user_id = ? LIMIT 1')
		.bind(clerkUserId)
		.first<Record<string, unknown>>();

	return row ? mapMember(row) : null;
}

export async function getMemberByEmail(db: D1Compat, email: string): Promise<MemberRecord | null> {
	const row = await db
		.prepare('SELECT * FROM members WHERE lower(email) = lower(?) LIMIT 1')
		.bind(email)
		.first<Record<string, unknown>>();

	return row ? mapMember(row) : null;
}

export async function listMemberEntitlements(
	db: D1Compat,
	memberId: string
): Promise<MemberEntitlementRecord[]> {
	const rows = await db
		.prepare(
			`SELECT id, tier, source_type, status, created_at, updated_at
			 FROM member_entitlements
			 WHERE member_id = ?
			 ORDER BY created_at DESC, id DESC`
		)
		.bind(memberId)
		.all<Record<string, unknown>>();

	return rows.results.map(mapMemberEntitlement);
}

async function getImportedMemberProvisionByEmail(
	db: D1Compat,
	email: string
): Promise<ImportedMemberProvisionRecord | null> {
	const row = await db
		.prepare('SELECT * FROM member_imports WHERE lower(email) = lower(?) LIMIT 1')
		.bind(email)
		.first<Record<string, unknown>>();

	return row ? mapImportedMemberProvision(row) : null;
}

/** Unclaimed WC import for an email — used by /welcome sync + claim diagnostics. */
export async function getUnclaimedImportForEmail(
	db: D1Compat,
	email: string
): Promise<ImportedMemberProvisionRecord | null> {
	const row = await db
		.prepare(
			`SELECT * FROM member_imports
       WHERE lower(email) = lower(?)
         AND claimed_at IS NULL
         AND access_status = 'active'
       LIMIT 1`
		)
		.bind(email)
		.first<Record<string, unknown>>();

	return row ? mapImportedMemberProvision(row) : null;
}

async function applyClaimAndRefreshMember(
	db: D1Compat,
	data: { clerkUserId: string; email: string; name: string },
	kv?: KVNamespace
): Promise<MemberRecord | null> {
	const claimed = await claimImportedMemberProvision(db, data);
	const member = await getMemberByClerkId(db, data.clerkUserId);

	if (claimed && kv) {
		await bust(kv, `member:${data.clerkUserId}`, `courses:${data.clerkUserId}`);
	}

	if (member && member.role !== 'admin' && !isPaidMemberTier(member.tier)) {
		const pending = await getUnclaimedImportForEmail(db, data.email);
		if (pending) {
			logError('member.claim.pending', new Error('unclaimed import not applied to member'), {
				clerkUserId: data.clerkUserId,
				email: data.email,
				importId: pending.id,
				importTier: pending.tier
			});
		}
	}

	return member;
}

export function resolveRoleAfterImportClaim(
	currentRole: MemberRecord['role'] | null
): 'member' | 'admin' {
	return currentRole === 'admin' ? 'admin' : 'member';
}

export async function claimImportedMemberProvision(
	db: D1Compat,
	data: {
		clerkUserId: string;
		email: string;
		name: string;
	}
): Promise<ImportedMemberProvisionRecord | null> {
	const row = await db
		.prepare(
			`SELECT * FROM member_imports
       WHERE lower(email) = lower(?)
         AND claimed_at IS NULL
         AND access_status = 'active'
       LIMIT 1`
		)
		.bind(data.email)
		.first<Record<string, unknown>>();

	if (!row) {
		return null;
	}

	const provision = mapImportedMemberProvision(row);
	const now = Date.now();
	const resolvedName = data.name.trim() || provision.name || 'Member';
	const currentMember = await getMemberByClerkId(db, data.clerkUserId);
	const safeRole = resolveRoleAfterImportClaim(currentMember?.role ?? null);

	await db
		.prepare(
			`UPDATE members
                         SET email = ?, name = ?, tier = ?, access_status = ?, role = ?, updated_at = ?
                         WHERE clerk_user_id = ?`
		)
		.bind(
			data.email,
			resolvedName,
			provision.tier,
			provision.accessStatus,
			safeRole,
			now,
			data.clerkUserId
		)
		.run();

	if (
		(provision.tier === 'bronze' || provision.tier === 'vip') &&
		provision.accessStatus === 'active'
	) {
		await db
			.prepare(
				`INSERT OR IGNORE INTO member_entitlements (
                                        id,
                                        member_id,
                                        tier,
                                        source_type,
                                        source_ref,
                                        status,
                                        created_at,
                                        updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				crypto.randomUUID(),
				data.clerkUserId,
				provision.tier,
				'import',
				provision.id,
				'active',
				now,
				now
			)
			.run();
	}

	await db
		.prepare(
			`UPDATE member_imports
                         SET claimed_member_id = ?, claimed_at = ?, updated_at = ?
                         WHERE id = ?`
		)
		.bind(data.clerkUserId, now, now, provision.id)
		.run();

	return getImportedMemberProvisionByEmail(db, data.email);
}

export async function getMemberNotificationPreferences(
	db: D1Compat,
	memberId: string
): Promise<StoredMemberNotificationPreferences> {
	const row = await db
		.prepare('SELECT * FROM member_notification_preferences WHERE member_id = ? LIMIT 1')
		.bind(memberId)
		.first<Record<string, unknown>>();

	if (!row) {
		const now = new Date().toISOString();
		return {
			memberId,
			...DEFAULT_MEMBER_NOTIFICATION_PREFERENCES,
			createdAt: now,
			updatedAt: now
		};
	}

	return mapMemberNotificationPreferences(row);
}

export async function upsertMemberNotificationPreferences(
	db: D1Compat,
	memberId: string,
	input: MemberNotificationPreferences
): Promise<StoredMemberNotificationPreferences> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_notification_preferences (
                                member_id,
                                build_updates,
                                content_release_alerts,
                                livestream_reminders,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(member_id) DO UPDATE SET
                                build_updates = excluded.build_updates,
                                content_release_alerts = excluded.content_release_alerts,
                                livestream_reminders = excluded.livestream_reminders,
                                updated_at = excluded.updated_at`
		)
		.bind(
			memberId,
			input.buildUpdates ? 1 : 0,
			input.contentReleaseAlerts ? 1 : 0,
			input.livestreamReminders ? 1 : 0,
			now,
			now
		)
		.run();

	return getMemberNotificationPreferences(db, memberId);
}

export async function ensureMemberIdentity(
	db: D1Compat,
	clerkClient: ClerkClient,
	clerkUserId: string,
	kv?: KVNamespace
): Promise<MemberRecord> {
	const existing = await getMemberByClerkId(db, clerkUserId);
	if (existing) {
		const refreshed = await applyClaimAndRefreshMember(
			db,
			{
				clerkUserId,
				email: existing.email,
				name: existing.name
			},
			kv
		);

		return refreshed || existing;
	}

	const user = await clerkClient.users.getUser(clerkUserId);
	const now = Date.now();

	// A member row may already exist for this email under a different/placeholder
	// clerk_user_id (e.g. a WooCommerce import created before the user signed up
	// through Clerk). A plain INSERT would violate the members.email UNIQUE
	// constraint and throw, leaving event.locals.user null — which bounces the
	// authenticated user back to /login on every request (the login loop).
	// ON CONFLICT(email) re-links the existing row to this Clerk identity instead.
	// We do NOT touch tier/access_status/created_at here so a previously-imported
	// paid entitlement survives the relink (the claim refresh below applies it).
	await db
		.prepare(
			`INSERT INTO members (
                                clerk_user_id,
                                email,
                                name,
                                tier,
                                access_status,
                                role,
                                email_verified,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(email) DO UPDATE SET
                                clerk_user_id = excluded.clerk_user_id,
                                name = excluded.name,
                                email_verified = excluded.email_verified,
                                updated_at = excluded.updated_at`
		)
		.bind(
			user.id,
			getPrimaryEmail(user),
			getDisplayName(user),
			'free',
			'active',
			'member',
			isUserEmailVerified(user) ? 1 : 0,
			now,
			now
		)
		.run();

	const created = await applyClaimAndRefreshMember(
		db,
		{
			clerkUserId: user.id,
			email: getPrimaryEmail(user),
			name: getDisplayName(user)
		},
		kv
	);
	if (!created) {
		throw new Error('Failed to create ShivWorks member record');
	}

	return created;
}

export async function upsertMemberFromWebhook(
	db: D1Compat,
	data: {
		clerkUserId: string;
		email: string;
		name: string;
		emailVerified: boolean;
	}
): Promise<void> {
	const now = Date.now();
	const existingClerkIdentity = await db
		.prepare(
			`UPDATE members
			 SET email = ?, name = ?, email_verified = ?, updated_at = ?
			 WHERE clerk_user_id = ?`
		)
		.bind(data.email, data.name, data.emailVerified ? 1 : 0, now, data.clerkUserId)
		.run();

	if (existingClerkIdentity.meta.changes === 0) {
		await db
			.prepare(
				`INSERT INTO members (
                                clerk_user_id,
                                email,
                                name,
                                tier,
                                access_status,
                                role,
                                email_verified,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(email) DO UPDATE SET
                                clerk_user_id = excluded.clerk_user_id,
                                name = excluded.name,
                                email_verified = excluded.email_verified,
                                updated_at = excluded.updated_at`
			)
			.bind(
				data.clerkUserId,
				data.email,
				data.name,
				'free',
				'active',
				'member',
				data.emailVerified ? 1 : 0,
				now,
				now
			)
			.run();
	}

	await claimImportedMemberProvision(db, {
		clerkUserId: data.clerkUserId,
		email: data.email,
		name: data.name
	});
}

export async function deleteMemberByClerkId(db: D1Compat, clerkUserId: string): Promise<void> {
	await db.prepare('DELETE FROM members WHERE clerk_user_id = ?').bind(clerkUserId).run();
}

export async function activateMemberEntitlement(
	db: D1Compat,
	data: {
		clerkUserId: string;
		tier: MembershipTier;
		sourceType: 'wc' | 'import' | 'admin';
		sourceRef: string;
	}
): Promise<void> {
	const now = Date.now();

	await db
		.prepare(
			`UPDATE members
                         SET tier = ?, access_status = 'active', updated_at = ?
                         WHERE clerk_user_id = ?`
		)
		.bind(data.tier, now, data.clerkUserId)
		.run();

	await db
		.prepare(
			`INSERT INTO member_entitlements (
                                id,
                                member_id,
                                tier,
                                source_type,
                                source_ref,
                                status,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			data.clerkUserId,
			data.tier,
			data.sourceType,
			data.sourceRef,
			now,
			now
		)
		.run();
}

export async function listRecentUpdates(db: D1Compat, member: MemberRecord | null, limit = 6) {
	const results = await db
		.prepare('SELECT * FROM activity_updates ORDER BY published_at DESC')
		.bind()
		.all<Record<string, unknown>>();

	return results.results
		.map((row) => ({
			id: String(row.id),
			title: String(row.title),
			bodyMarkdown: String(row.body_markdown || ''),
			audience: mapAudience(row.audience),
			publishedAt: Number(row.published_at || 0),
			authorName: row.author_name ? String(row.author_name) : null
		}))
		.filter((row) => canAccessAudience(member, row.audience))
		.slice(0, limit) satisfies ActivityUpdateRecord[];
}

export async function listCourses(
	db: D1Compat,
	member?: MemberRecord | null
): Promise<CourseRecord[]> {
	const progressMemberId = member?.clerkUserId || '__none__';
	const results = await db
		.prepare(
			`WITH episode_progress AS (
                                SELECT
                                        course_module_episodes.module_id,
                                        COUNT(CASE
                                                WHEN course_module_episodes.status = 'available'
                                                        AND media_assets.ingest_status = 'ready'
                                                THEN 1
                                        END) AS playable_episode_count,
                                        COUNT(CASE
                                                WHEN course_module_episodes.status = 'available'
                                                        AND media_assets.ingest_status = 'ready'
                                                        AND member_episode_progress.completed_at IS NOT NULL
                                                THEN 1
                                        END) AS completed_episode_count,
                                        MAX(CASE
                                                WHEN member_episode_progress.current_seconds > 0
                                                        OR member_episode_progress.completed_at IS NOT NULL
                                                THEN 1
                                                ELSE 0
                                        END) AS has_started_episode
                                FROM course_module_episodes
                                LEFT JOIN media_assets
                                        ON media_assets.id = course_module_episodes.media_asset_id
                                LEFT JOIN member_episode_progress
                                        ON member_episode_progress.episode_id = course_module_episodes.id
                                        AND member_episode_progress.member_id = ?
                                GROUP BY course_module_episodes.module_id
                        )
                         SELECT
                                courses.*,
                                COUNT(DISTINCT course_modules.id) AS total_module_count,
                                COUNT(DISTINCT CASE
                                        WHEN course_modules.status = 'available' THEN course_modules.id
                                END) AS available_module_count,
                                COUNT(DISTINCT CASE
                                        WHEN course_modules.status = 'coming_soon' THEN course_modules.id
                                END) AS roadmap_module_count,
                                COUNT(DISTINCT CASE
                                        WHEN member_module_progress.completed_at IS NOT NULL
                                                OR (
                                                        episode_progress.playable_episode_count > 0
                                                        AND episode_progress.completed_episode_count =
                                                                episode_progress.playable_episode_count
                                                )
                                        THEN course_modules.id
                                END) AS completed_module_count,
                                COUNT(DISTINCT CASE
                                        WHEN member_module_progress.current_seconds > 0
                                                OR member_module_progress.completed_at IS NOT NULL
                                                OR episode_progress.has_started_episode = 1
                                        THEN course_modules.id
                                END) AS started_module_count
                         FROM courses
                         LEFT JOIN course_modules ON course_modules.course_id = courses.id
                         LEFT JOIN member_module_progress
                                ON member_module_progress.module_id = course_modules.id
                                AND member_module_progress.member_id = ?
                         LEFT JOIN episode_progress
                                ON episode_progress.module_id = course_modules.id
                         GROUP BY courses.id
                         ORDER BY courses.sort_order ASC, courses.title ASC`
		)
		.bind(progressMemberId, progressMemberId)
		.all<Record<string, unknown>>();

	const mapped = results.results.map(mapCourse);

	return member === undefined
		? mapped
		: mapped.filter((course) => canAccessAudience(member, course.accessTier));
}

export async function getCourseBySlug(db: D1Compat, slug: string): Promise<CourseRecord | null> {
	const row = await db
		.prepare('SELECT * FROM courses WHERE slug = ? LIMIT 1')
		.bind(slug)
		.first<Record<string, unknown>>();

	return row ? mapCourse(row) : null;
}

export async function listCourseModules(
	db: D1Compat,
	courseId?: string,
	options: { publishedOnly?: boolean } = {}
): Promise<CourseModuleRecord[]> {
	const conditions: string[] = [];
	const params: string[] = [];

	if (courseId) {
		conditions.push('course_id = ?');
		params.push(courseId);
	}
	if (options.publishedOnly) {
		conditions.push("status = 'available'");
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
	const results = await db
		.prepare(`SELECT * FROM course_modules ${whereClause} ORDER BY sort_order ASC, title ASC`)
		.bind(...params)
		.all<Record<string, unknown>>();

	return results.results.map(mapCourseModule);
}

export async function getCourseModuleById(
	db: D1Compat,
	moduleId: string
): Promise<
	| (CourseModuleRecord & {
			courseSlug: string;
			courseTitle: string;
			courseAccessTier: ContentAudience;
	  })
	| null
> {
	const row = await db
		.prepare(
			`SELECT
                                course_modules.*,
                                courses.slug AS course_slug,
                                courses.title AS course_title,
                                courses.access_tier AS course_access_tier
                         FROM course_modules
                         INNER JOIN courses ON courses.id = course_modules.course_id
                         WHERE course_modules.id = ?
                         LIMIT 1`
		)
		.bind(moduleId)
		.first<Record<string, unknown>>();

	if (!row) {
		return null;
	}

	const module = mapCourseModule(row);

	return {
		...module,
		courseSlug: String(row.course_slug),
		courseTitle: String(row.course_title),
		courseAccessTier: mapAudience(row.course_access_tier)
	};
}

export async function getMediaAssetById(
	db: D1Compat,
	mediaAssetId: string
): Promise<MediaAssetRecord | null> {
	const row = await db
		.prepare('SELECT * FROM media_assets WHERE id = ? LIMIT 1')
		.bind(mediaAssetId)
		.first<Record<string, unknown>>();

	return row ? mapMediaAsset(row) : null;
}

export async function getMediaAssetByProviderAssetId(
	db: D1Compat,
	provider: MediaProvider,
	providerAssetId: string
): Promise<MediaAssetRecord | null> {
	const row = await db
		.prepare('SELECT * FROM media_assets WHERE provider = ? AND provider_asset_id = ? LIMIT 1')
		.bind(provider, providerAssetId)
		.first<Record<string, unknown>>();

	return row ? mapMediaAsset(row) : null;
}

function selectEpisodeSql(whereClause: string): string {
	return `SELECT
                        course_module_episodes.*,
                        courses.slug AS course_slug,
                        courses.title AS course_title,
                        courses.access_tier AS course_access_tier,
                        course_modules.title AS module_title,
                        media_assets.id AS media_id,
                        media_assets.provider AS media_provider,
                        media_assets.provider_asset_id AS media_provider_asset_id,
                        media_assets.title AS media_title,
                        media_assets.file_name AS media_file_name,
                        media_assets.source_url AS media_source_url,
                        media_assets.source_bytes AS media_source_bytes,
                        media_assets.duration_seconds AS media_duration_seconds,
                        media_assets.duration_label AS media_duration_label,
                        media_assets.playback_policy AS media_playback_policy,
                        media_assets.ingest_status AS media_ingest_status,
                        media_assets.failure_reason AS media_failure_reason,
                        media_assets.created_by_member_id AS media_created_by_member_id,
                        media_assets.uploaded_at AS media_uploaded_at,
                        media_assets.playback_ready_at AS media_playback_ready_at,
                        media_assets.created_at AS media_created_at,
                        media_assets.updated_at AS media_updated_at
                 FROM course_module_episodes
                 INNER JOIN courses ON courses.id = course_module_episodes.course_id
                 INNER JOIN course_modules ON course_modules.id = course_module_episodes.module_id
                 LEFT JOIN media_assets ON media_assets.id = course_module_episodes.media_asset_id
                 ${whereClause}`;
}

export async function listCourseModuleEpisodes(
	db: D1Compat,
	input: { courseId?: string; moduleId?: string; publishedOnly?: boolean } = {}
): Promise<CourseModuleEpisodeRecord[]> {
	const conditions: string[] = [];
	const params: string[] = [];

	if (input.courseId) {
		conditions.push('course_module_episodes.course_id = ?');
		params.push(input.courseId);
	}
	if (input.moduleId) {
		conditions.push('course_module_episodes.module_id = ?');
		params.push(input.moduleId);
	}
	if (input.publishedOnly) {
		conditions.push("course_module_episodes.status = 'available'");
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
	const results = await db
		.prepare(
			`${selectEpisodeSql(whereClause)}
                         ORDER BY course_module_episodes.sort_order ASC, course_module_episodes.episode_number ASC`
		)
		.bind(...params)
		.all<Record<string, unknown>>();

	return results.results.map(mapCourseModuleEpisode);
}

export async function getCourseModuleEpisodeById(
	db: D1Compat,
	episodeId: string
): Promise<CourseModuleEpisodeRecord | null> {
	const row = await db
		.prepare(`${selectEpisodeSql('WHERE course_module_episodes.id = ?')} LIMIT 1`)
		.bind(episodeId)
		.first<Record<string, unknown>>();

	return row ? mapCourseModuleEpisode(row) : null;
}

async function getNextEpisodeNumber(db: D1Compat, moduleId: string): Promise<number> {
	const row = await db
		.prepare(
			'SELECT COALESCE(MAX(episode_number), 0) + 1 AS next_episode_number FROM course_module_episodes WHERE module_id = ?'
		)
		.bind(moduleId)
		.first<Record<string, unknown>>();

	return Math.max(1, Number(row?.next_episode_number || 1));
}

export async function createEpisodeUploadReservation(
	db: D1Compat,
	input: {
		moduleId: string;
		title: string;
		description: string | null;
		episodeNumber?: number | null;
		accessTier?: ContentAudience | null;
		sortOrder?: number | null;
		fileName: string | null;
		sourceBytes: number;
		durationSeconds: number | null;
		playbackPolicy: MediaPlaybackPolicy;
		createdByMemberId: string;
	}
): Promise<{ mediaAsset: MediaAssetRecord; episode: CourseModuleEpisodeRecord }> {
	const module = await getCourseModuleById(db, input.moduleId);
	if (!module) {
		throw new Error('Course module not found');
	}

	const now = Date.now();
	const episodeNumber =
		input.episodeNumber && input.episodeNumber > 0
			? Math.floor(input.episodeNumber)
			: await getNextEpisodeNumber(db, input.moduleId);
	const mediaAssetId = crypto.randomUUID();
	const episodeId = crypto.randomUUID();
	const sortOrder = input.sortOrder ?? episodeNumber;

	await db
		.prepare(
			`INSERT INTO media_assets (
                                id,
                                provider,
                                provider_asset_id,
                                title,
                                file_name,
                                source_url,
                                source_bytes,
                                duration_seconds,
                                duration_label,
                                playback_policy,
                                ingest_status,
                                failure_reason,
                                created_by_member_id,
                                uploaded_at,
                                playback_ready_at,
                                created_at,
                                updated_at
                        ) VALUES (?, 'cloudflare_stream', NULL, ?, ?, NULL, ?, ?, NULL, ?, 'pending_upload', NULL, ?, NULL, NULL, ?, ?)`
		)
		.bind(
			mediaAssetId,
			input.title,
			input.fileName,
			Math.max(0, Math.round(input.sourceBytes)),
			input.durationSeconds,
			input.playbackPolicy,
			input.createdByMemberId,
			now,
			now
		)
		.run();

	await db
		.prepare(
			`INSERT INTO course_module_episodes (
                                id,
                                course_id,
                                module_id,
                                media_asset_id,
                                episode_number,
                                title,
                                description,
                                status,
                                access_tier,
                                sort_order,
                                duration_label,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'coming_soon', ?, ?, NULL, ?, ?)`
		)
		.bind(
			episodeId,
			module.courseId,
			input.moduleId,
			mediaAssetId,
			episodeNumber,
			input.title,
			input.description,
			input.accessTier ?? module.courseAccessTier,
			sortOrder,
			now,
			now
		)
		.run();

	const mediaAsset = await getMediaAssetById(db, mediaAssetId);
	const episode = await getCourseModuleEpisodeById(db, episodeId);
	if (!mediaAsset || !episode) {
		throw new Error('Failed to create episode upload reservation');
	}

	return { mediaAsset, episode };
}

/**
 * Creates replacement media for an existing lesson while preserving the
 * lesson ID, editorial status, episode number, and catalog position.
 */
export async function replaceEpisodeUploadReservation(
	db: D1Compat,
	input: {
		episodeId: string;
		moduleId: string;
		title: string;
		description: string | null;
		accessTier?: ContentAudience | null;
		fileName: string | null;
		sourceBytes: number;
		durationSeconds: number | null;
		playbackPolicy: MediaPlaybackPolicy;
		createdByMemberId: string;
	}
): Promise<{ mediaAsset: MediaAssetRecord; episode: CourseModuleEpisodeRecord }> {
	const episode = await getCourseModuleEpisodeById(db, input.episodeId);
	if (!episode || episode.moduleId !== input.moduleId) {
		throw new Error('Lesson upload destination does not match the existing lesson.');
	}
	if (
		episode.media &&
		episode.media.ingestStatus !== 'pending_upload' &&
		episode.media.ingestStatus !== 'failed'
	) {
		throw new Error('Only a failed or interrupted lesson upload can be replaced.');
	}

	const now = Date.now();
	const mediaAssetId = crypto.randomUUID();
	const previousMediaAssetId = episode.mediaAssetId;
	const statements = [
		db
			.prepare(
				`INSERT INTO media_assets (
					id, provider, provider_asset_id, title, file_name, source_url,
					source_bytes, duration_seconds, duration_label, playback_policy,
					ingest_status, failure_reason, created_by_member_id, uploaded_at,
					playback_ready_at, created_at, updated_at
				) VALUES (?, 'cloudflare_stream', NULL, ?, ?, NULL, ?, ?, NULL, ?,
					'pending_upload', NULL, ?, NULL, NULL, ?, ?)`
			)
			.bind(
				mediaAssetId,
				input.title,
				input.fileName,
				Math.max(0, Math.round(input.sourceBytes)),
				input.durationSeconds,
				input.playbackPolicy,
				input.createdByMemberId,
				now,
				now
			),
		db
			.prepare(
				`UPDATE course_module_episodes
				 SET media_asset_id = ?, title = ?, description = ?, access_tier = ?, updated_at = ?
				 WHERE id = ?`
			)
			.bind(
				mediaAssetId,
				input.title,
				input.description,
				input.accessTier ?? episode.accessTier,
				now,
				episode.id
			)
	];
	if (previousMediaAssetId) {
		statements.push(
			db
				.prepare(
					`DELETE FROM media_assets
					 WHERE id = ?
					   AND NOT EXISTS (
					     SELECT 1 FROM course_module_episodes WHERE media_asset_id = ?
					   )`
				)
				.bind(previousMediaAssetId, previousMediaAssetId)
		);
	}
	await db.batch(statements);

	const mediaAsset = await getMediaAssetById(db, mediaAssetId);
	const updatedEpisode = await getCourseModuleEpisodeById(db, episode.id);
	if (!mediaAsset || !updatedEpisode) {
		throw new Error('Failed to replace the lesson upload reservation.');
	}
	return { mediaAsset, episode: updatedEpisode };
}

/**
 * Safely removes an orphaned upload reservation (an episode + media asset that
 * never finished ingesting) so an admin can retry without leaving a stray,
 * never-publishable episode behind. Refuses to touch media that Cloudflare has
 * already reported as ready or is actively processing, so a working or
 * in-flight upload can never be destroyed by mistake.
 */
export async function discardFailedUploadEpisode(
	db: D1Compat,
	episodeId: string
): Promise<{ mediaAssetId: string | null }> {
	const episode = await getCourseModuleEpisodeById(db, episodeId);
	if (!episode) {
		throw new Error('Episode not found.');
	}

	if (
		!episode.media ||
		(episode.media.ingestStatus !== 'pending_upload' && episode.media.ingestStatus !== 'failed')
	) {
		throw new Error(
			'Only a pending or failed upload can be discarded. Ready or processing media is protected.'
		);
	}

	const mediaAssetId = episode.media.id;

	await db.prepare('DELETE FROM course_module_episodes WHERE id = ?').bind(episodeId).run();
	await db.prepare('DELETE FROM media_assets WHERE id = ?').bind(mediaAssetId).run();

	return { mediaAssetId };
}

export async function attachStreamUidToMediaAsset(
	db: D1Compat,
	mediaAssetId: string,
	streamUid: string
): Promise<void> {
	await db
		.prepare('UPDATE media_assets SET provider_asset_id = ?, updated_at = ? WHERE id = ?')
		.bind(streamUid, Date.now(), mediaAssetId)
		.run();
}

export async function markMediaUploadCompleted(
	db: D1Compat,
	mediaAssetId: string
): Promise<MediaAssetRecord | null> {
	await db
		.prepare(
			`UPDATE media_assets
                         SET ingest_status = CASE
                                WHEN ingest_status = 'pending_upload' THEN 'processing'
                                ELSE ingest_status
                         END,
                         uploaded_at = COALESCE(uploaded_at, ?),
                         updated_at = ?
                         WHERE id = ?`
		)
		.bind(Date.now(), Date.now(), mediaAssetId)
		.run();

	return getMediaAssetById(db, mediaAssetId);
}

export async function updateUploadEpisodeMetadata(
	db: D1Compat,
	input: {
		episodeId: string;
		title: string;
		description: string | null;
		accessTier: ContentAudience;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`UPDATE course_module_episodes
       SET title = ?, description = ?, access_tier = ?, updated_at = ?
       WHERE id = ?`
		)
		.bind(input.title, input.description, input.accessTier, now, input.episodeId)
		.run();
	await db
		.prepare(
			`UPDATE media_assets
       SET title = ?, updated_at = ?
       WHERE id = (
         SELECT media_asset_id
         FROM course_module_episodes
         WHERE id = ?
       )`
		)
		.bind(input.title, now, input.episodeId)
		.run();
}

export async function markMediaUploadFailed(
	db: D1Compat,
	mediaAssetId: string,
	failureReason: string
): Promise<MediaAssetRecord | null> {
	await db
		.prepare(
			`UPDATE media_assets
                         SET ingest_status = 'failed',
                                 failure_reason = ?,
                                 updated_at = ?
                         WHERE id = ?`
		)
		.bind(failureReason, Date.now(), mediaAssetId)
		.run();

	return getMediaAssetById(db, mediaAssetId);
}

export async function applyStreamMediaWebhookUpdate(
	db: D1Compat,
	update: {
		streamUid: string;
		state: 'processing' | 'ready' | 'failed';
		durationSeconds: number | null;
		sourceBytes: number | null;
		failureReason: string | null;
		thumbnailUrl?: string | null;
	}
): Promise<MediaAssetRecord | null> {
	const now = Date.now();

	if (update.state === 'ready') {
		await db
			.prepare(
				`UPDATE media_assets
                                 SET ingest_status = 'ready',
                                         duration_seconds = COALESCE(?, duration_seconds),
                                         source_bytes = COALESCE(?, source_bytes),
                                         playback_ready_at = COALESCE(playback_ready_at, ?),
                                         failure_reason = NULL,
                                         updated_at = ?
                                 WHERE provider = 'cloudflare_stream'
                                   AND provider_asset_id = ?`
			)
			.bind(update.durationSeconds, update.sourceBytes, now, now, update.streamUid)
			.run();

		if (update.thumbnailUrl?.startsWith('https://')) {
			await db
				.prepare(
					`UPDATE course_modules
           SET thumbnail_url = COALESCE(thumbnail_url, ?), updated_at = ?
           WHERE id IN (
             SELECT cme.module_id
             FROM course_module_episodes cme
             INNER JOIN media_assets ma ON ma.id = cme.media_asset_id
             WHERE ma.provider = 'cloudflare_stream'
               AND ma.provider_asset_id = ?
           )`
				)
				.bind(update.thumbnailUrl, now, update.streamUid)
				.run();
		}
	}

	if (update.state === 'processing') {
		await db
			.prepare(
				`UPDATE media_assets
                                 SET ingest_status = 'processing',
                                         updated_at = ?
                                 WHERE provider = 'cloudflare_stream'
                                   AND provider_asset_id = ?
                                   AND ingest_status != 'ready'`
			)
			.bind(now, update.streamUid)
			.run();
	}

	if (update.state === 'failed') {
		await db
			.prepare(
				`UPDATE media_assets
                                 SET ingest_status = 'failed',
                                         failure_reason = COALESCE(?, failure_reason),
                                         updated_at = ?
                                 WHERE provider = 'cloudflare_stream'
                                   AND provider_asset_id = ?
                                   AND ingest_status != 'ready'`
			)
			.bind(update.failureReason, now, update.streamUid)
			.run();
	}

	return getMediaAssetByProviderAssetId(db, 'cloudflare_stream', update.streamUid);
}

export async function listMemberModuleProgress(
	db: D1Compat,
	memberId: string
): Promise<MemberModuleProgressRecord[]> {
	const results = await db
		.prepare(
			`SELECT module_id, current_seconds, duration_seconds, completed_at, updated_at
                         FROM member_module_progress
                         WHERE member_id = ?
                         ORDER BY updated_at DESC`
		)
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map(mapMemberModuleProgress);
}

export async function listMemberEpisodeProgress(
	db: D1Compat,
	memberId: string
): Promise<MemberEpisodeProgressRecord[]> {
	const results = await db
		.prepare(
			`SELECT episode_id, current_seconds, duration_seconds, completed_at, updated_at
                         FROM member_episode_progress
                         WHERE member_id = ?
                         ORDER BY updated_at DESC`
		)
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map(mapMemberEpisodeProgress);
}

export async function getLatestModuleProgressForMember(
	db: D1Compat,
	member: MemberRecord
): Promise<ResumeModuleRecord | null> {
	const results = await db
		.prepare(
			`SELECT
                                member_module_progress.module_id,
                                member_module_progress.current_seconds,
                                member_module_progress.duration_seconds,
                                member_module_progress.completed_at,
                                member_module_progress.updated_at,
                                course_modules.title AS module_title,
                                course_modules.status AS module_status,
                                course_modules.thumbnail_url AS module_thumbnail_url,
                                courses.slug AS course_slug,
                                courses.title AS course_title,
                                courses.status AS course_status,
                                courses.artwork_url AS course_artwork_url,
                                courses.access_tier AS course_access_tier
                         FROM member_module_progress
                         INNER JOIN course_modules ON course_modules.id = member_module_progress.module_id
                         INNER JOIN courses ON courses.id = course_modules.course_id
                         WHERE member_module_progress.member_id = ?
                         ORDER BY CASE WHEN member_module_progress.completed_at IS NULL THEN 0 ELSE 1 END ASC,
                                          member_module_progress.updated_at DESC`
		)
		.bind(member.clerkUserId)
		.all<Record<string, unknown>>();

	for (const row of results.results) {
		const courseAccessTier = mapAudience(row.course_access_tier);
		if (!canAccessAudience(member, courseAccessTier)) {
			continue;
		}

		const progress = mapMemberModuleProgress(row);
		return {
			...progress,
			courseSlug: String(row.course_slug),
			courseTitle: String(row.course_title),
			courseAccessTier,
			courseStatus:
				row.course_status === 'available' || row.course_status === 'archived'
					? row.course_status
					: 'coming_soon',
			courseArtworkUrl: row.course_artwork_url ? String(row.course_artwork_url) : null,
			moduleTitle: String(row.module_title),
			moduleStatus:
				row.module_status === 'available' || row.module_status === 'archived'
					? row.module_status
					: 'coming_soon',
			moduleThumbnailUrl: row.module_thumbnail_url ? String(row.module_thumbnail_url) : null
		};
	}

	return null;
}

export async function listSeries(
	db: D1Compat,
	member?: MemberRecord | null
): Promise<SeriesRecord[]> {
	const results = await db
		.prepare('SELECT * FROM series ORDER BY title ASC')
		.all<Record<string, unknown>>();

	const mapped = results.results.map((row) => ({
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		status: row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		artworkUrl: row.artwork_url ? String(row.artwork_url) : null,
		accessTier: mapAudience(row.access_tier)
	})) satisfies SeriesRecord[];

	return member === undefined
		? mapped
		: mapped.filter((series) => canAccessAudience(member, series.accessTier));
}

export async function listEvents(
	db: D1Compat,
	member: MemberRecord | null
): Promise<EventRecord[]> {
	const results = await db
		.prepare('SELECT * FROM events ORDER BY COALESCE(starts_at, created_at) ASC')
		.bind()
		.all<Record<string, unknown>>();

	const mapped = results.results.map((row) => ({
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		eventKind: row.event_kind === 'vip_call' ? 'vip_call' : 'livestream',
		accessTier: mapAudience(row.access_tier),
		status: row.status === 'live' || row.status === 'ended' ? row.status : 'scheduled',
		startsAt: hasValue(row.starts_at) ? Number(row.starts_at) : null,
		endsAt: hasValue(row.ends_at) ? Number(row.ends_at) : null,
		locationType:
			row.location_type === 'zoom' || row.location_type === 'external'
				? row.location_type
				: 'youtube',
		embedUrl: row.embed_url ? String(row.embed_url) : null,
		bookingUrl: row.booking_url ? String(row.booking_url) : null,
		reminderEnabled: Boolean(row.reminder_enabled)
	})) satisfies EventRecord[];

	return mapped.filter((row) => canAccessAudience(member, row.accessTier));
}

export async function listExternalLinks(
	db: D1Compat,
	member: MemberRecord | null
): Promise<ExternalLinkRecord[]> {
	const results = await db
		.prepare('SELECT * FROM external_links ORDER BY sort_order ASC')
		.bind()
		.all<Record<string, unknown>>();

	return results.results
		.map((row) => ({
			id: String(row.id),
			linkKey: String(row.link_key),
			label: String(row.label),
			url: String(row.url),
			audience: mapAudience(row.audience),
			sortOrder: Number(row.sort_order || 0),
			description: row.description ? String(row.description) : null,
			ctaText: row.cta_text ? String(row.cta_text) : null
		}))
		.filter((row) => canAccessAudience(member, row.audience)) satisfies ExternalLinkRecord[];
}

export async function listAdminExternalLinks(db: D1Compat): Promise<ExternalLinkRecord[]> {
	const results = await db
		.prepare('SELECT * FROM external_links ORDER BY sort_order ASC, label ASC')
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		linkKey: String(row.link_key),
		label: String(row.label),
		url: String(row.url),
		audience: mapAudience(row.audience),
		sortOrder: Number(row.sort_order || 0),
		description: row.description ? String(row.description) : null,
		ctaText: row.cta_text ? String(row.cta_text) : null
	}));
}

export async function upsertEventRsvp(
	db: D1Compat,
	memberId: string,
	eventId: string,
	status: 'going' | 'interested' | 'cancelled' = 'going'
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO event_rsvps (
                                id,
                                event_id,
                                member_id,
                                status,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(event_id, member_id) DO UPDATE SET
                                status = excluded.status,
                                updated_at = excluded.updated_at`
		)
		.bind(crypto.randomUUID(), eventId, memberId, status, now, now)
		.run();
}

export async function getRsvpForMember(
	db: D1Compat,
	memberId: string
): Promise<Record<string, string>> {
	const results = await db
		.prepare('SELECT event_id, status FROM event_rsvps WHERE member_id = ?')
		.bind(memberId)
		.all<{ event_id: string; status: string }>();

	return Object.fromEntries((results.results || []).map((row) => [row.event_id, row.status]));
}

export async function listEventReminderRecipients(
	db: D1Compat,
	eventId: string
): Promise<EventReminderRecipient[]> {
	const results = await db
		.prepare(
			`SELECT
                                members.clerk_user_id AS member_id,
                                members.email AS email,
                                members.name AS name
                         FROM event_rsvps
                         INNER JOIN members ON members.clerk_user_id = event_rsvps.member_id
                         LEFT JOIN member_notification_preferences
                                ON member_notification_preferences.member_id = members.clerk_user_id
                         WHERE event_rsvps.event_id = ?
                           AND event_rsvps.status = 'going'
                           AND members.access_status = 'active'
                           AND COALESCE(member_notification_preferences.livestream_reminders, 1) = 1
                           AND members.email <> ''
                         ORDER BY event_rsvps.updated_at DESC`
		)
		.bind(eventId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		memberId: String(row.member_id),
		email: String(row.email || ''),
		name: String(row.name || 'Member')
	}));
}

async function listAudienceNotificationRecipients(
	db: D1Compat,
	audience: ContentAudience,
	preferenceColumn: 'build_updates' | 'content_release_alerts'
): Promise<UpdateNotificationRecipient[]> {
	const preferenceFilter =
		preferenceColumn === 'content_release_alerts'
			? 'COALESCE(member_notification_preferences.content_release_alerts, 1) = 1'
			: 'COALESCE(member_notification_preferences.build_updates, 1) = 1';

	const results = await db
		.prepare(
			`SELECT
                                members.clerk_user_id AS member_id,
                                members.email AS email,
                                members.name AS name,
                                members.tier AS tier,
                                members.role AS role
                         FROM members
                         LEFT JOIN member_notification_preferences
                                ON member_notification_preferences.member_id = members.clerk_user_id
                         WHERE members.access_status = 'active'
                           AND ${preferenceFilter}
                           AND members.email <> ''
                         ORDER BY members.updated_at DESC`
		)
		.all<Record<string, unknown>>();

	return results.results
		.map(
			(row): UpdateNotificationRecipient => ({
				memberId: String(row.member_id),
				email: String(row.email || ''),
				name: String(row.name || 'Member'),
				tier: row.tier === 'free' || row.tier === 'bronze' || row.tier === 'vip' ? row.tier : null,
				role: row.role === 'admin' ? 'admin' : 'member'
			})
		)
		.filter((recipient) => canAccessAudience(recipient, audience));
}

export async function listUpdateNotificationRecipients(
	db: D1Compat,
	audience: ContentAudience
): Promise<UpdateNotificationRecipient[]> {
	return listAudienceNotificationRecipients(db, audience, 'build_updates');
}

export async function listContentReleaseNotificationRecipients(
	db: D1Compat,
	audience: ContentAudience
): Promise<UpdateNotificationRecipient[]> {
	return listAudienceNotificationRecipients(db, audience, 'content_release_alerts');
}

export async function createVipCallRequest(
	db: D1Compat,
	memberId: string,
	goals: string,
	preferredMonth: string | null,
	notes: string | null
): Promise<boolean> {
	const existing = await db
		.prepare(
			`SELECT id FROM vip_call_requests
                         WHERE member_id = ?
                           AND status IN ('requested', 'approved', 'scheduled')
                         LIMIT 1`
		)
		.bind(memberId)
		.first<Record<string, unknown>>();

	if (existing) {
		return false;
	}

	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO vip_call_requests (
                                id,
                                member_id,
                                goals,
                                preferred_month,
                                notes,
                                status,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, 'requested', ?, ?)`
		)
		.bind(crypto.randomUUID(), memberId, goals, preferredMonth, notes, now, now)
		.run();

	return true;
}

export async function listVipCallRequestsForMember(
	db: D1Compat,
	memberId: string
): Promise<VipCallRequestRecord[]> {
	const results = await db
		.prepare('SELECT * FROM vip_call_requests WHERE member_id = ? ORDER BY created_at DESC')
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		memberId: String(row.member_id),
		goals: String(row.goals || ''),
		preferredMonth: row.preferred_month ? String(row.preferred_month) : null,
		notes: row.notes ? String(row.notes) : null,
		status:
			row.status === 'approved' ||
			row.status === 'scheduled' ||
			row.status === 'completed' ||
			row.status === 'declined'
				? row.status
				: 'requested',
		createdAt: Number(row.created_at || 0),
		updatedAt: Number(row.updated_at || 0)
	}));
}

export async function listVipCallBookingsForMember(
	db: D1Compat,
	memberId: string
): Promise<VipCallBookingRecord[]> {
	const results = await db
		.prepare('SELECT * FROM vip_call_bookings WHERE member_id = ? ORDER BY starts_at ASC')
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		requestId: String(row.request_id),
		memberId: String(row.member_id),
		startsAt: Number(row.starts_at || 0),
		endsAt: Number(row.ends_at || 0),
		zoomJoinUrl: row.zoom_join_url ? String(row.zoom_join_url) : null,
		confirmationSentAt: hasValue(row.confirmation_sent_at) ? Number(row.confirmation_sent_at) : null
	}));
}

function mapMemberSession(row: Record<string, unknown>): MemberSessionRecord {
	return {
		sessionId: String(row.session_id),
		memberId: String(row.member_id),
		deviceLabel: String(row.device_label || 'Unknown device'),
		ipAddress: row.ip_address ? String(row.ip_address) : null,
		userAgent: row.user_agent ? String(row.user_agent) : null,
		createdAt: Number(row.created_at || 0),
		lastActiveAt: Number(row.last_active_at || 0),
		revokedAt: hasValue(row.revoked_at) ? Number(row.revoked_at) : null,
		revokeReason: row.revoke_reason ? String(row.revoke_reason) : null
	};
}

export async function getMemberSession(
	db: D1Compat,
	memberId: string,
	sessionId: string
): Promise<MemberSessionRecord | null> {
	const row = await db
		.prepare(
			`SELECT * FROM member_sessions
			 WHERE member_id = ? AND session_id = ?`
		)
		.bind(memberId, sessionId)
		.first<Record<string, unknown>>();

	return row ? mapMemberSession(row) : null;
}

export async function listActiveMemberSessions(
	db: D1Compat,
	memberId: string
): Promise<MemberSessionRecord[]> {
	const results = await db
		.prepare(
			`SELECT * FROM member_sessions
                         WHERE member_id = ? AND revoked_at IS NULL
                         ORDER BY last_active_at DESC`
		)
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map(mapMemberSession);
}

export async function upsertMemberSession(
	db: D1Compat,
	data: {
		memberId: string;
		sessionId: string;
		deviceLabel: string;
		ipAddress: string | null;
		userAgent: string | null;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_sessions (
                                session_id,
                                member_id,
                                device_label,
                                ip_address,
                                user_agent,
                                created_at,
                                last_active_at,
                                revoked_at,
                                revoke_reason
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
                        ON CONFLICT(session_id) DO UPDATE SET
                                member_id = excluded.member_id,
                                device_label = excluded.device_label,
                                ip_address = excluded.ip_address,
                                user_agent = excluded.user_agent,
                                last_active_at = excluded.last_active_at`
		)
		.bind(data.sessionId, data.memberId, data.deviceLabel, data.ipAddress, data.userAgent, now, now)
		.run();
}

export async function revokeMemberSession(
	db: D1Compat,
	memberId: string,
	sessionId: string,
	reason: string
): Promise<void> {
	await db
		.prepare(
			`UPDATE member_sessions
                         SET revoked_at = ?, revoke_reason = ?
                         WHERE member_id = ? AND session_id = ?`
		)
		.bind(Date.now(), reason, memberId, sessionId)
		.run();
}

export async function listAdminMembers(db: D1Compat): Promise<MemberRecord[]> {
	const results = await db
		.prepare('SELECT * FROM members ORDER BY updated_at DESC')
		.all<Record<string, unknown>>();
	return results.results.map(mapMember);
}

export type AdminSummaryCounts = {
	lessonTotal: number;
	lessonPublished: number;
	lessonDraft: number;
	lessonWithVideo: number;
	memberTotal: number;
	courseTotal: number;
	courseLive: number;
};

/**
 * Returns the admin navigation summary without loading every member, course,
 * module, and episode into the Worker just to count them.
 */
export async function getAdminSummaryCounts(db: D1Compat): Promise<AdminSummaryCounts> {
	const row = await db
		.prepare(
			`SELECT
         (SELECT COUNT(*) FROM course_modules) AS lesson_total,
         (SELECT COUNT(*) FROM course_modules WHERE status = 'available') AS lesson_published,
         (SELECT COUNT(*) FROM course_modules WHERE status = 'coming_soon') AS lesson_draft,
         (
           SELECT COUNT(*)
           FROM course_modules cm
           WHERE EXISTS (
             SELECT 1
             FROM course_module_episodes cme
             INNER JOIN media_assets ma ON ma.id = cme.media_asset_id
             WHERE cme.module_id = cm.id
               AND ma.provider_asset_id IS NOT NULL
               AND ma.provider_asset_id != ''
           )
         ) AS lesson_with_video,
         (SELECT COUNT(*) FROM members) AS member_total,
         (SELECT COUNT(*) FROM courses) AS course_total,
         (SELECT COUNT(*) FROM courses WHERE status = 'available') AS course_live`
		)
		.first<Record<string, unknown>>();

	return {
		lessonTotal: Number(row?.lesson_total ?? 0),
		lessonPublished: Number(row?.lesson_published ?? 0),
		lessonDraft: Number(row?.lesson_draft ?? 0),
		lessonWithVideo: Number(row?.lesson_with_video ?? 0),
		memberTotal: Number(row?.member_total ?? 0),
		courseTotal: Number(row?.course_total ?? 0),
		courseLive: Number(row?.course_live ?? 0)
	};
}

export async function updateMemberTier(
	db: D1Compat,
	memberId: string,
	tier: MembershipTier | null,
	accessStatus: AccessStatus
): Promise<void> {
	await db
		.prepare(
			'UPDATE members SET tier = ?, access_status = ?, updated_at = ? WHERE clerk_user_id = ?'
		)
		.bind(tier, accessStatus, Date.now(), memberId)
		.run();
}

export type WcRevokeReason = 'wc_refunded' | 'wc_cancelled';

export type RevokePaidAccessResult = {
	importUpdated: boolean;
	memberId: string | null;
	remainingActiveEntitlements: number;
	accessStatus: AccessStatus | null;
	tier: MembershipTier | null;
};

/**
 * Revokes founding WC purchase access for an order without clearing claim linkage.
 * If other active entitlements remain, keeps the member entitled at the highest remaining tier.
 */
export async function revokePaidAccessFromWcOrder(
	db: D1Compat,
	input: {
		email: string;
		orderId: string | number;
		reason: WcRevokeReason;
	},
	kv?: KVNamespace
): Promise<RevokePaidAccessResult> {
	const email = input.email.trim().toLowerCase();
	const sourceRef = `wc:${input.orderId}`;
	const now = Date.now();
	const existing = await getImportedMemberProvisionByEmail(db, email);

	let importUpdated = false;
	if (existing) {
		const sourceMatches =
			!existing.sourceRef ||
			existing.sourceRef === sourceRef ||
			existing.sourceRef === String(input.orderId);

		if (sourceMatches || existing.accessStatus === 'active') {
			await db
				.prepare(
					`UPDATE member_imports
           SET access_status = 'revoked',
               source_ref = COALESCE(source_ref, ?),
               updated_at = ?
           WHERE id = ?`
				)
				.bind(sourceRef, now, existing.id)
				.run();
			importUpdated = true;
		}
	}

	const refreshedImport = await getImportedMemberProvisionByEmail(db, email);
	const memberId =
		refreshedImport?.claimedMemberId ?? (await getMemberByEmail(db, email))?.clerkUserId ?? null;

	if (!memberId) {
		return {
			importUpdated,
			memberId: null,
			remainingActiveEntitlements: 0,
			accessStatus: refreshedImport?.accessStatus ?? null,
			tier: refreshedImport?.tier ?? null
		};
	}

	const entitlementRefs = new Set<string>([sourceRef, String(input.orderId)]);
	if (refreshedImport?.id) {
		entitlementRefs.add(refreshedImport.id);
	}
	if (existing?.id) {
		entitlementRefs.add(existing.id);
	}

	for (const ref of entitlementRefs) {
		await db
			.prepare(
				`UPDATE member_entitlements
         SET status = 'revoked', updated_at = ?
         WHERE member_id = ? AND status = 'active' AND source_ref = ?`
			)
			.bind(now, memberId, ref)
			.run();
	}

	const remaining = await db
		.prepare(
			`SELECT tier FROM member_entitlements
       WHERE member_id = ? AND status = 'active'
       ORDER BY CASE tier WHEN 'vip' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END DESC`
		)
		.bind(memberId)
		.all<{ tier: string }>();

	const remainingRows = remaining.results ?? [];
	const remainingActiveEntitlements = remainingRows.length;
	const member = await getMemberByClerkId(db, memberId);

	if (remainingActiveEntitlements > 0) {
		const nextTier = (remainingRows[0]?.tier as MembershipTier | undefined) ?? member?.tier ?? null;
		await updateMemberTier(db, memberId, nextTier, 'active');
		await bust(kv, `member:${memberId}`, `courses:${memberId}`);
		return {
			importUpdated,
			memberId,
			remainingActiveEntitlements,
			accessStatus: 'active',
			tier: nextTier
		};
	}

	await updateMemberTier(db, memberId, member?.tier ?? refreshedImport?.tier ?? null, 'revoked');
	await bust(kv, `member:${memberId}`, `courses:${memberId}`);

	return {
		importUpdated,
		memberId,
		remainingActiveEntitlements: 0,
		accessStatus: 'revoked',
		tier: member?.tier ?? refreshedImport?.tier ?? null
	};
}

export type ImportedMemberProvisionInput = {
	email: string;
	name: string;
	tier: MembershipTier;
	accessStatus: AccessStatus;
	role: 'member';
	sourceRef: string | null;
	invitedAt?: number | null;
	lastEmailedAt?: number | null;
};

const MEMBER_IMPORT_UPSERT_SQL = `INSERT INTO member_imports (
  id, email, name, tier, access_status, role, source_ref,
  invited_at, last_emailed_at, claimed_member_id, claimed_at,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, 'member', ?, ?, ?, NULL, NULL, ?, ?)
ON CONFLICT(email) DO UPDATE SET
  claimed_member_id = CASE
    WHEN member_imports.tier != excluded.tier
      OR member_imports.access_status != excluded.access_status
      OR member_imports.role != excluded.role
    THEN NULL
    ELSE member_imports.claimed_member_id
  END,
  claimed_at = CASE
    WHEN member_imports.tier != excluded.tier
      OR member_imports.access_status != excluded.access_status
      OR member_imports.role != excluded.role
    THEN NULL
    ELSE member_imports.claimed_at
  END,
  name = excluded.name,
  tier = excluded.tier,
  access_status = excluded.access_status,
  role = excluded.role,
  source_ref = COALESCE(excluded.source_ref, member_imports.source_ref),
  invited_at = COALESCE(excluded.invited_at, member_imports.invited_at),
  last_emailed_at = COALESCE(excluded.last_emailed_at, member_imports.last_emailed_at),
  updated_at = excluded.updated_at`;

export async function upsertImportedMemberProvisionsBatch(
	db: D1Compat,
	inputs: ImportedMemberProvisionInput[]
): Promise<void> {
	const now = Date.now();
	for (let index = 0; index < inputs.length; index += 50) {
		const statements = inputs
			.slice(index, index + 50)
			.map((input) =>
				db
					.prepare(MEMBER_IMPORT_UPSERT_SQL)
					.bind(
						crypto.randomUUID(),
						input.email,
						input.name,
						input.tier,
						input.accessStatus,
						input.sourceRef,
						input.invitedAt ?? null,
						input.lastEmailedAt ?? null,
						now,
						now
					)
			);
		await db.batch(statements);
	}
}

export async function upsertImportedMemberProvision(
	db: D1Compat,
	input: ImportedMemberProvisionInput
): Promise<ImportedMemberProvisionRecord> {
	const existing = await getImportedMemberProvisionByEmail(db, input.email);
	const now = Date.now();
	const id = existing?.id || crypto.randomUUID();
	const shouldResetClaim =
		Boolean(existing) &&
		(existing!.tier !== input.tier ||
			existing!.accessStatus !== input.accessStatus ||
			existing!.role !== 'member');

	await db
		.prepare(
			`INSERT INTO member_imports (
                                id,
                                email,
                                name,
                                tier,
                                access_status,
                                role,
                                source_ref,
                                invited_at,
                                last_emailed_at,
                                claimed_member_id,
                                claimed_at,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(email) DO UPDATE SET
                                name = excluded.name,
                                tier = excluded.tier,
                                access_status = excluded.access_status,
                                role = excluded.role,
                                source_ref = COALESCE(excluded.source_ref, member_imports.source_ref),
                                invited_at = COALESCE(excluded.invited_at, member_imports.invited_at),
                                last_emailed_at = COALESCE(excluded.last_emailed_at, member_imports.last_emailed_at),
                                updated_at = excluded.updated_at`
		)
		.bind(
			id,
			input.email,
			input.name,
			input.tier,
			input.accessStatus,
			'member',
			input.sourceRef,
			input.invitedAt ?? null,
			input.lastEmailedAt ?? null,
			shouldResetClaim ? null : (existing?.claimedMemberId ?? null),
			shouldResetClaim ? null : (existing?.claimedAt ?? null),
			existing ? Date.parse(existing.createdAt) : now,
			now
		)
		.run();

	const record = await getImportedMemberProvisionByEmail(db, input.email);
	if (!record) {
		throw new Error('Failed to upsert imported member provision');
	}

	return record;
}

export async function listImportedMemberProvisions(
	db: D1Compat
): Promise<ImportedMemberProvisionRecord[]> {
	const results = await db
		.prepare('SELECT * FROM member_imports ORDER BY updated_at DESC, created_at DESC')
		.all<Record<string, unknown>>();

	return results.results.map(mapImportedMemberProvision);
}

export async function updateCourseStatus(
	db: D1Compat,
	courseId: string,
	status: 'coming_soon' | 'available' | 'archived',
	badgeText: string | null,
	accessTier: ContentAudience
): Promise<void> {
	await db
		.prepare(
			'UPDATE courses SET status = ?, badge_text = ?, access_tier = ?, updated_at = ? WHERE id = ?'
		)
		.bind(status, badgeText, accessTier, Date.now(), courseId)
		.run();
}

/**
 * Permanently removes a course only when it has no modules. Content-bearing
 * courses must be archived instead so catalog history and media stay intact.
 */
export async function deleteCourseIfEmpty(db: D1Compat, courseId: string): Promise<void> {
	const course = await db
		.prepare('SELECT id FROM courses WHERE id = ? LIMIT 1')
		.bind(courseId)
		.first<Record<string, unknown>>();
	if (!course) {
		throw new Error('Course not found.');
	}

	const moduleCount = await db
		.prepare('SELECT COUNT(*) AS count FROM course_modules WHERE course_id = ?')
		.bind(courseId)
		.first<Record<string, unknown>>();
	if (Number(moduleCount?.count || 0) > 0) {
		throw new Error('This course still has modules. Archive it, or delete empty modules first.');
	}

	await db.prepare('DELETE FROM courses WHERE id = ?').bind(courseId).run();
}

/**
 * Permanently removes a module only when it has no episodes. Modules with
 * uploads must be cleaned via discard/archive so media records are not orphaned.
 */
export async function deleteCourseModuleIfEmpty(db: D1Compat, moduleId: string): Promise<void> {
	const module = await getCourseModuleById(db, moduleId);
	if (!module) {
		throw new Error('Course module not found.');
	}

	const episodeCount = await db
		.prepare('SELECT COUNT(*) AS count FROM course_module_episodes WHERE module_id = ?')
		.bind(moduleId)
		.first<Record<string, unknown>>();
	if (Number(episodeCount?.count || 0) > 0) {
		throw new Error(
			'This module still has episodes. Discard failed uploads or archive the module instead.'
		);
	}

	await db.prepare('DELETE FROM course_modules WHERE id = ?').bind(moduleId).run();
}

const COURSE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCourseSlug(slug: string): boolean {
	return COURSE_SLUG_PATTERN.test(slug);
}

async function getNextCourseSortOrder(db: D1Compat): Promise<number> {
	const row = await db
		.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM courses')
		.first<Record<string, unknown>>();

	return Math.max(1, Number(row?.next_sort_order || 1));
}

/**
 * Creates a new course or series destination. New destinations always start in
 * a non-public state ('coming_soon' or 'archived') — publishing to members is a
 * separate, explicit step performed once real content is ready.
 */
export async function createCourse(
	db: D1Compat,
	input: {
		title: string;
		slug: string;
		description: string;
		accessTier: ContentAudience;
		courseKind: 'course' | 'series';
		status?: 'coming_soon' | 'archived';
		badgeText?: string | null;
		artworkUrl?: string | null;
		sortOrder?: number | null;
	}
): Promise<CourseRecord> {
	const title = input.title.trim();
	const description = input.description.trim();
	const slug = input.slug.trim().toLowerCase();

	if (!title) {
		throw new Error('Title is required.');
	}
	if (!description) {
		throw new Error('Description is required.');
	}
	if (!isValidCourseSlug(slug)) {
		throw new Error(
			'Slug must use lowercase letters, numbers, and single hyphens (e.g. knife-defense-101).'
		);
	}

	const existingBySlug = await getCourseBySlug(db, slug);
	if (existingBySlug) {
		throw new Error(
			`A course or series with the slug "${slug}" already exists. Choose a different slug.`
		);
	}

	const now = Date.now();
	const id = `course_${slugify(title, 'course')}_${now}`;
	const sortOrder = input.sortOrder ?? (await getNextCourseSortOrder(db));
	const status = input.status === 'archived' ? 'archived' : 'coming_soon';

	await db
		.prepare(
			`INSERT INTO courses (
                                id,
                                slug,
                                title,
                                description,
                                status,
                                sort_order,
                                badge_text,
                                artwork_url,
                                course_kind,
                                access_tier,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			slug,
			title,
			description,
			status,
			sortOrder,
			input.badgeText || null,
			input.artworkUrl || null,
			input.courseKind,
			input.accessTier,
			now,
			now
		)
		.run();

	const created = await getCourseBySlug(db, slug);
	if (!created) {
		throw new Error('Failed to create course');
	}

	return created;
}

export async function updateCourseModule(
	db: D1Compat,
	input: {
		moduleId: string;
		title: string;
		description: string | null;
		status: 'coming_soon' | 'available' | 'archived';
		videoKind: CourseModuleVideoKind;
		videoUrl: string | null;
		durationLabel: string | null;
		thumbnailUrl?: string | null;
		publishedAt?: number | null;
		accessTier?: ContentAudience;
	}
): Promise<void> {
	const now = Date.now();
	const fields = [
		'title = ?',
		'description = ?',
		'status = ?',
		'video_kind = ?',
		'video_url = ?',
		'duration_label = ?',
		'updated_at = ?'
	];
	const values: unknown[] = [
		input.title,
		input.description,
		input.status,
		input.videoKind,
		input.videoUrl,
		input.durationLabel,
		now
	];

	if (input.thumbnailUrl !== undefined) {
		fields.splice(fields.length - 1, 0, 'thumbnail_url = ?');
		values.splice(values.length - 1, 0, input.thumbnailUrl);
	}
	if (input.publishedAt !== undefined) {
		fields.splice(fields.length - 1, 0, 'published_at = ?');
		values.splice(values.length - 1, 0, input.publishedAt);
	}
	if (input.accessTier !== undefined) {
		fields.splice(fields.length - 1, 0, 'access_tier = ?');
		values.splice(values.length - 1, 0, input.accessTier);
	}

	values.push(input.moduleId);

	await db
		.prepare(`UPDATE course_modules SET ${fields.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	if (input.accessTier !== undefined) {
		await db
			.prepare(
				'UPDATE course_module_episodes SET access_tier = ?, updated_at = ? WHERE module_id = ?'
			)
			.bind(input.accessTier, now, input.moduleId)
			.run();
	}
}

async function getNextModuleSortOrder(db: D1Compat, courseId: string): Promise<number> {
	const row = await db
		.prepare(
			'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM course_modules WHERE course_id = ?'
		)
		.bind(courseId)
		.first<Record<string, unknown>>();

	return Math.max(1, Number(row?.next_sort_order || 1));
}

export async function createCourseModule(
	db: D1Compat,
	input: {
		courseId: string;
		title: string;
		description: string | null;
		accessTier: ContentAudience;
		thumbnailUrl: string | null;
		sortOrder?: number | null;
	}
): Promise<CourseModuleRecord> {
	const course = await db
		.prepare('SELECT id FROM courses WHERE id = ? LIMIT 1')
		.bind(input.courseId)
		.first<Record<string, unknown>>();

	if (!course) {
		throw new Error('Course not found');
	}

	const now = Date.now();
	const moduleId = `module_${slugify(input.title, 'lesson')}_${now}`;
	const sortOrder = input.sortOrder ?? (await getNextModuleSortOrder(db, input.courseId));

	await db
		.prepare(
			`INSERT INTO course_modules (
                                id,
                                course_id,
                                title,
                                description,
                                sort_order,
                                status,
                                video_kind,
                                video_url,
                                duration_label,
                                thumbnail_url,
                                published_at,
                                access_tier,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, 'coming_soon', 'none', NULL, NULL, ?, NULL, ?, ?, ?)`
		)
		.bind(
			moduleId,
			input.courseId,
			input.title,
			input.description,
			sortOrder,
			input.thumbnailUrl,
			input.accessTier,
			now,
			now
		)
		.run();

	const created = await db
		.prepare('SELECT * FROM course_modules WHERE id = ? LIMIT 1')
		.bind(moduleId)
		.first<Record<string, unknown>>();

	if (!created) {
		throw new Error('Failed to create course module');
	}

	return mapCourseModule(created);
}

export async function createEpisodeFromStreamReference(
	db: D1Compat,
	input: {
		moduleId: string;
		title: string;
		description: string | null;
		accessTier: ContentAudience;
		streamUid: string;
		ingestStatus: MediaIngestStatus;
		durationSeconds: number | null;
		sourceBytes: number | null;
		playbackPolicy?: MediaPlaybackPolicy;
		createdByMemberId: string;
	}
): Promise<{ mediaAsset: MediaAssetRecord; episode: CourseModuleEpisodeRecord }> {
	const module = await getCourseModuleById(db, input.moduleId);
	if (!module) {
		throw new Error('Course module not found');
	}

	const existingEpisode = (await listCourseModuleEpisodes(db, { moduleId: input.moduleId })).find(
		(episode) => episode.episodeNumber === 1
	);

	if (existingEpisode?.mediaAssetId) {
		const now = Date.now();
		await db
			.prepare(
				`UPDATE media_assets
                                 SET provider = 'cloudflare_stream',
                                         provider_asset_id = ?,
                                         title = ?,
                                         ingest_status = ?,
                                         duration_seconds = ?,
                                         source_bytes = ?,
                                         playback_policy = ?,
                                         uploaded_at = COALESCE(uploaded_at, ?),
                                         playback_ready_at = CASE WHEN ? = 'ready' THEN COALESCE(playback_ready_at, ?) ELSE playback_ready_at END,
                                         updated_at = ?
                                 WHERE id = ?`
			)
			.bind(
				input.streamUid,
				input.title,
				input.ingestStatus,
				input.durationSeconds,
				input.sourceBytes,
				input.playbackPolicy ?? 'private',
				now,
				input.ingestStatus,
				now,
				now,
				existingEpisode.mediaAssetId
			)
			.run();

		await db
			.prepare(
				`UPDATE course_module_episodes
                                 SET title = ?,
                                         description = ?,
                                         access_tier = ?,
                                         updated_at = ?
                                 WHERE id = ?`
			)
			.bind(input.title, input.description, input.accessTier, now, existingEpisode.id)
			.run();

		const mediaAsset = await getMediaAssetById(db, existingEpisode.mediaAssetId);
		const episode = await getCourseModuleEpisodeById(db, existingEpisode.id);
		if (!mediaAsset || !episode) {
			throw new Error('Failed to attach Stream reference to existing episode');
		}

		return { mediaAsset, episode };
	}

	const now = Date.now();
	const episodeNumber = await getNextEpisodeNumber(db, input.moduleId);
	const mediaAssetId = crypto.randomUUID();
	const episodeId = crypto.randomUUID();

	await db
		.prepare(
			`INSERT INTO media_assets (
                                id,
                                provider,
                                provider_asset_id,
                                title,
                                file_name,
                                source_url,
                                source_bytes,
                                duration_seconds,
                                duration_label,
                                playback_policy,
                                ingest_status,
                                failure_reason,
                                created_by_member_id,
                                uploaded_at,
                                playback_ready_at,
                                created_at,
                                updated_at
                        ) VALUES (?, 'cloudflare_stream', ?, ?, NULL, NULL, ?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?)`
		)
		.bind(
			mediaAssetId,
			input.streamUid,
			input.title,
			input.sourceBytes,
			input.durationSeconds,
			input.playbackPolicy ?? 'private',
			input.ingestStatus,
			input.createdByMemberId,
			now,
			input.ingestStatus === 'ready' ? now : null,
			now,
			now
		)
		.run();

	await db
		.prepare(
			`INSERT INTO course_module_episodes (
                                id,
                                course_id,
                                module_id,
                                media_asset_id,
                                episode_number,
                                title,
                                description,
                                status,
                                access_tier,
                                sort_order,
                                duration_label,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'coming_soon', ?, ?, NULL, ?, ?)`
		)
		.bind(
			episodeId,
			module.courseId,
			input.moduleId,
			mediaAssetId,
			episodeNumber,
			input.title,
			input.description,
			input.accessTier,
			episodeNumber,
			now,
			now
		)
		.run();

	const mediaAsset = await getMediaAssetById(db, mediaAssetId);
	const episode = await getCourseModuleEpisodeById(db, episodeId);
	if (!mediaAsset || !episode) {
		throw new Error('Failed to create episode from Stream reference');
	}

	return { mediaAsset, episode };
}

export async function syncLessonEpisodeStatus(
	db: D1Compat,
	moduleId: string,
	status: CourseModuleRecord['status']
): Promise<void> {
	const now = Date.now();
	await db
		.prepare('UPDATE course_module_episodes SET status = ?, updated_at = ? WHERE module_id = ?')
		.bind(status, now, moduleId)
		.run();
}

export async function listAdminLessons(db: D1Compat): Promise<AdminLessonRecord[]> {
	const modules = await db
		.prepare(
			`SELECT
                                course_modules.*,
                                courses.slug AS course_slug,
                                courses.title AS course_title,
                                courses.access_tier AS course_access_tier
                         FROM course_modules
                         INNER JOIN courses ON courses.id = course_modules.course_id
                         ORDER BY courses.sort_order ASC, course_modules.sort_order ASC, course_modules.title ASC`
		)
		.all<Record<string, unknown>>();

	const episodes = await listCourseModuleEpisodes(db);
	const episodesByModule = new Map<string, CourseModuleEpisodeRecord[]>();

	for (const episode of episodes) {
		const existing = episodesByModule.get(episode.moduleId) || [];
		existing.push(episode);
		episodesByModule.set(episode.moduleId, existing);
	}

	return modules.results.map((row) => {
		const module = mapCourseModule(row);
		const moduleEpisodes = episodesByModule.get(module.id) || [];
		const primaryEpisode =
			moduleEpisodes.find((episode) => episode.episodeNumber === 1) || moduleEpisodes[0] || null;

		return {
			...module,
			courseSlug: String(row.course_slug),
			courseTitle: String(row.course_title),
			courseAccessTier: mapAudience(row.course_access_tier),
			primaryEpisode
		};
	});
}

export async function bumpCatalogCacheVersion(kv: KVNamespace | undefined): Promise<void> {
	if (!kv) {
		return;
	}

	await kv.put('courses:catalog:version', String(Date.now()));
}

export async function upsertMemberModuleProgress(
	db: D1Compat,
	input: {
		memberId: string;
		moduleId: string;
		currentSeconds: number;
		durationSeconds: number | null;
		completed: boolean;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_module_progress (
                                id,
                                member_id,
                                module_id,
                                current_seconds,
                                duration_seconds,
                                completed_at,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(member_id, module_id) DO UPDATE SET
                                current_seconds = excluded.current_seconds,
                                duration_seconds = excluded.duration_seconds,
                                completed_at = COALESCE(excluded.completed_at, member_module_progress.completed_at),
                                updated_at = excluded.updated_at`
		)
		.bind(
			crypto.randomUUID(),
			input.memberId,
			input.moduleId,
			Math.max(0, Math.round(input.currentSeconds)),
			input.durationSeconds === null ? null : Math.max(0, Math.round(input.durationSeconds)),
			input.completed ? now : null,
			now,
			now
		)
		.run();
}

export async function upsertMemberEpisodeProgress(
	db: D1Compat,
	input: {
		memberId: string;
		episodeId: string;
		currentSeconds: number;
		durationSeconds: number | null;
		completed: boolean;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_episode_progress (
                                id,
                                member_id,
                                episode_id,
                                current_seconds,
                                duration_seconds,
                                completed_at,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(member_id, episode_id) DO UPDATE SET
                                current_seconds = excluded.current_seconds,
                                duration_seconds = excluded.duration_seconds,
                                completed_at = COALESCE(excluded.completed_at, member_episode_progress.completed_at),
                                updated_at = excluded.updated_at`
		)
		.bind(
			crypto.randomUUID(),
			input.memberId,
			input.episodeId,
			Math.max(0, Math.round(input.currentSeconds)),
			input.durationSeconds === null ? null : Math.max(0, Math.round(input.durationSeconds)),
			input.completed ? now : null,
			now,
			now
		)
		.run();
}

export async function getMemberModuleNote(
	db: D1Compat,
	memberId: string,
	moduleId: string
): Promise<MemberModuleNoteRecord | null> {
	const row = await db
		.prepare(
			`SELECT module_id, body, updated_at
                         FROM member_module_notes
                         WHERE member_id = ? AND module_id = ?
                         LIMIT 1`
		)
		.bind(memberId, moduleId)
		.first<Record<string, unknown>>();

	if (!row) {
		return null;
	}

	return {
		moduleId: String(row.module_id),
		body: String(row.body ?? ''),
		updatedAt: Number(row.updated_at)
	};
}

export async function upsertMemberModuleNote(
	db: D1Compat,
	input: { memberId: string; moduleId: string; body: string }
): Promise<MemberModuleNoteRecord> {
	const now = Date.now();
	const body = input.body.trim();

	await db
		.prepare(
			`INSERT INTO member_module_notes (
                                id,
                                member_id,
                                module_id,
                                body,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(member_id, module_id) DO UPDATE SET
                                body = excluded.body,
                                updated_at = excluded.updated_at`
		)
		.bind(crypto.randomUUID(), input.memberId, input.moduleId, body, now, now)
		.run();

	const saved = await getMemberModuleNote(db, input.memberId, input.moduleId);
	if (!saved) {
		throw new Error('Failed to persist module note');
	}

	return saved;
}

export async function createExternalLink(
	db: D1Compat,
	input: {
		label: string;
		url: string;
		audience: ContentAudience;
		sortOrder: number;
		description: string | null;
		ctaText: string | null;
		linkKey?: string | null;
	}
): Promise<void> {
	const now = Date.now();
	const requestedKey = input.linkKey
		? slugify(input.linkKey, 'link')
		: slugify(input.label, 'link');
	const existing = await db
		.prepare('SELECT id FROM external_links WHERE link_key = ? LIMIT 1')
		.bind(requestedKey)
		.first<Record<string, unknown>>();
	const linkKey = existing ? `${requestedKey}-${now}` : requestedKey;

	await db
		.prepare(
			`INSERT INTO external_links (
                                id,
                                link_key,
                                label,
                                url,
                                audience,
                                sort_order,
                                description,
                                cta_text,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			linkKey,
			input.label,
			input.url,
			input.audience,
			input.sortOrder,
			input.description,
			input.ctaText,
			now,
			now
		)
		.run();
}

export async function updateExternalLink(
	db: D1Compat,
	input: {
		id: string;
		label: string;
		url: string;
		audience: ContentAudience;
		sortOrder: number;
		description: string | null;
		ctaText: string | null;
		linkKey?: string | null;
	}
): Promise<void> {
	const linkKey = input.linkKey ? slugify(input.linkKey, 'link') : slugify(input.label, 'link');

	await db
		.prepare(
			`UPDATE external_links
                         SET link_key = ?,
                                 label = ?,
                                 url = ?,
                                 audience = ?,
                                 sort_order = ?,
                                 description = ?,
                                 cta_text = ?,
                                 updated_at = ?
                         WHERE id = ?`
		)
		.bind(
			linkKey,
			input.label,
			input.url,
			input.audience,
			input.sortOrder,
			input.description,
			input.ctaText,
			Date.now(),
			input.id
		)
		.run();
}

export async function createActivityUpdate(
	db: D1Compat,
	input: {
		title: string;
		bodyMarkdown: string;
		audience: ContentAudience;
		authorName: string | null;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO activity_updates (
                                id,
                                title,
                                body_markdown,
                                audience,
                                author_name,
                                published_at,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			input.title,
			input.bodyMarkdown,
			input.audience,
			input.authorName,
			now,
			now,
			now
		)
		.run();
}

export async function updateCourseModuleEpisodeStatus(
	db: D1Compat,
	episodeId: string,
	status: CourseModuleEpisodeRecord['status']
): Promise<void> {
	await db
		.prepare('UPDATE course_module_episodes SET status = ?, updated_at = ? WHERE id = ?')
		.bind(status, Date.now(), episodeId)
		.run();
}

export async function createEvent(
	db: D1Compat,
	input: {
		title: string;
		description: string;
		eventKind: 'livestream' | 'vip_call';
		accessTier: ContentAudience;
		status: 'scheduled' | 'live' | 'ended';
		startsAt: number | null;
		endsAt: number | null;
		embedUrl: string | null;
		bookingUrl: string | null;
		locationType: 'youtube' | 'zoom' | 'external';
		reminderEnabled: boolean;
	}
): Promise<void> {
	const now = Date.now();
	const slugBase = slugify(input.title, 'event');

	await db
		.prepare(
			`INSERT INTO events (
                                id,
                                slug,
                                title,
                                description,
                                event_kind,
                                access_tier,
                                status,
                                starts_at,
                                ends_at,
                                location_type,
                                embed_url,
                                booking_url,
                                reminder_enabled,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			`${slugBase}-${now}`,
			input.title,
			input.description,
			input.eventKind,
			input.accessTier,
			input.status,
			input.startsAt,
			input.endsAt,
			input.locationType,
			input.embedUrl,
			input.bookingUrl,
			input.reminderEnabled ? 1 : 0,
			now,
			now
		)
		.run();
}

export async function updateEvent(
	db: D1Compat,
	input: {
		id: string;
		title: string;
		description: string;
		eventKind: 'livestream' | 'vip_call';
		accessTier: ContentAudience;
		status: 'scheduled' | 'live' | 'ended';
		startsAt: number | null;
		endsAt: number | null;
		embedUrl: string | null;
		bookingUrl: string | null;
		locationType: 'youtube' | 'zoom' | 'external';
		reminderEnabled: boolean;
	}
): Promise<void> {
	await db
		.prepare(
			`UPDATE events
                         SET title = ?,
                                 description = ?,
                                 event_kind = ?,
                                 access_tier = ?,
                                 status = ?,
                                 starts_at = ?,
                                 ends_at = ?,
                                 location_type = ?,
                                 embed_url = ?,
                                 booking_url = ?,
                                 reminder_enabled = ?,
                                 updated_at = ?
                         WHERE id = ?`
		)
		.bind(
			input.title,
			input.description,
			input.eventKind,
			input.accessTier,
			input.status,
			input.startsAt,
			input.endsAt,
			input.locationType,
			input.embedUrl,
			input.bookingUrl,
			input.reminderEnabled ? 1 : 0,
			Date.now(),
			input.id
		)
		.run();
}

export async function listPendingVipCallRequests(
	db: D1Compat
): Promise<PendingVipCallRequestRecord[]> {
	const results = await db
		.prepare(
			`SELECT
                                vip_call_requests.*,
                                members.email AS member_email,
                                members.name AS member_name,
                                members.tier AS member_tier
                         FROM vip_call_requests
                         LEFT JOIN members ON members.clerk_user_id = vip_call_requests.member_id
                         WHERE vip_call_requests.status = 'requested'
                         ORDER BY created_at DESC`
		)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		memberId: String(row.member_id),
		goals: String(row.goals || ''),
		preferredMonth: row.preferred_month ? String(row.preferred_month) : null,
		notes: row.notes ? String(row.notes) : null,
		status: row.status === 'approved' || row.status === 'scheduled' ? row.status : 'requested',
		createdAt: Number(row.created_at || 0),
		updatedAt: Number(row.updated_at || 0),
		memberEmail: row.member_email ? String(row.member_email) : null,
		memberName: row.member_name ? String(row.member_name) : null,
		memberTier:
			row.member_tier === 'free' || row.member_tier === 'bronze' || row.member_tier === 'vip'
				? row.member_tier
				: null
	}));
}

export async function approveVipCallRequest(
	db: D1Compat,
	input: {
		requestId: string;
		memberId: string;
		startsAt: number;
		endsAt: number;
		zoomJoinUrl: string | null;
	}
): Promise<void> {
	const now = Date.now();

	await db
		.prepare('UPDATE vip_call_requests SET status = ?, updated_at = ? WHERE id = ?')
		.bind('scheduled', now, input.requestId)
		.run();

	await db
		.prepare(
			`INSERT INTO vip_call_bookings (
                                id,
                                request_id,
                                member_id,
                                starts_at,
                                ends_at,
                                zoom_join_url,
                                confirmation_sent_at,
                                created_at,
                                updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			input.requestId,
			input.memberId,
			input.startsAt,
			input.endsAt,
			input.zoomJoinUrl,
			now,
			now
		)
		.run();
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface MemberGamificationRecord {
	memberId: string;
	rank: string | null;
	trainingPoints: number;
	streakDays: number;
	lastActivityDate: string | null;
	updatedAt: string;
}

export async function getGamificationForMember(
	db: D1Compat,
	memberId: string
): Promise<MemberGamificationRecord> {
	const row = await db
		.prepare('SELECT * FROM member_gamification WHERE member_id = ? LIMIT 1')
		.bind(memberId)
		.first<Record<string, unknown>>();

	if (!row) {
		return {
			memberId,
			rank: null,
			trainingPoints: 0,
			streakDays: 0,
			lastActivityDate: null,
			updatedAt: new Date().toISOString()
		};
	}

	return {
		memberId: String(row.member_id),
		rank: row.rank ? String(row.rank) : null,
		trainingPoints: Number(row.training_points) || 0,
		streakDays: Number(row.streak_days) || 0,
		lastActivityDate: row.last_activity_date ? String(row.last_activity_date) : null,
		updatedAt: toIso(row.updated_at as string | null)
	};
}

// ─── Member Profiles ──────────────────────────────────────────────────────────
//
// Per D-1 (2026-05-31): old public-bio schema retired. Aaron's training-profile
// schema (migration 0013_member_profiles_tags) replaces it. The MemberProfileRecord
// interface and CRUD helpers (getMemberProfile, upsertMemberProfile, listFinderCandidates,
// getLeaderboardOptIn, setLeaderboardOptIn) are added below in the Aaron-port block.

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEventById(db: D1Compat, eventId: string): Promise<EventRecord | null> {
	const row = await db
		.prepare('SELECT * FROM events WHERE id = ? LIMIT 1')
		.bind(eventId)
		.first<Record<string, unknown>>();
	if (!row) return null;

	return {
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		eventKind: row.event_kind === 'vip_call' ? 'vip_call' : 'livestream',
		accessTier: mapAudience(row.access_tier),
		status: row.status === 'live' || row.status === 'ended' ? row.status : 'scheduled',
		startsAt: hasValue(row.starts_at) ? Number(row.starts_at) : null,
		endsAt: hasValue(row.ends_at) ? Number(row.ends_at) : null,
		locationType:
			row.location_type === 'zoom' || row.location_type === 'external'
				? row.location_type
				: 'youtube',
		embedUrl: row.embed_url ? String(row.embed_url) : null,
		bookingUrl: row.booking_url ? String(row.booking_url) : null,
		reminderEnabled: Boolean(row.reminder_enabled)
	};
}

// ════════════════════════════════════════════════════════════════════════════
// Aaron-port block — training profile, partner finder, leaderboard opt-in.
// Added 2026-05-31 per D-1 (member_profiles uses Aaron's training-profile
// shape, migration 0013_member_profiles_tags). Consumed by /account, /profile,
// /find-partners. Leaderboard helpers persist preference even though the
// leaderboard surface itself is deferred (D-2). Training stats are stubbed to
// zeros because his member_training_points table isn't ported at launch.
// ════════════════════════════════════════════════════════════════════════════

export interface MemberProfileRecord {
	memberId: string;
	locationCity: string | null;
	locationState: string | null;
	background: {
		civilian: boolean;
		lawEnforcement: boolean;
		military: boolean;
		medical: boolean;
		other: boolean;
	};
	ecqcAlumni: boolean;
	mucAlumni: boolean;
	ewoAlumni: boolean;
	otherCourses: string | null;
	carrySetup: string | null;
	trainingGoal: string | null;
	showInFinder: boolean;
	profileCompletedAt: number | null;
	createdAt: number;
	updatedAt: number;
}

export type FinderBackgroundFilter = 'civilian' | 'le' | 'military' | 'medical' | 'other';

export interface FinderFilters {
	state?: string | null;
	cityQuery?: string | null;
	backgrounds?: FinderBackgroundFilter[];
	ecqcOnly?: boolean;
	goalQuery?: string | null;
	limit?: number;
}

export interface FinderCandidate {
	member: MemberRecord;
	profile: MemberProfileRecord;
}

export interface MemberTrainingStats {
	coursesCompleted: number;
	liveSessionsAttended: number;
}

function _profileBool(v: unknown): boolean {
	return Number(v ?? 0) !== 0;
}
function _profileStr(v: unknown): string | null {
	return v === null || v === undefined || v === '' ? null : String(v);
}
function _profileNum(v: unknown): number | null {
	return v === null || v === undefined ? null : Number(v);
}

function mapMemberProfile(row: Record<string, unknown>): MemberProfileRecord {
	return {
		memberId: String(row.member_id),
		locationCity: _profileStr(row.location_city),
		locationState: _profileStr(row.location_state),
		background: {
			civilian: _profileBool(row.background_civilian),
			lawEnforcement: _profileBool(row.background_le),
			military: _profileBool(row.background_military),
			medical: _profileBool(row.background_medical),
			other: _profileBool(row.background_other)
		},
		ecqcAlumni: _profileBool(row.ecqc_alumni),
		mucAlumni: _profileBool(row.muc_alumni),
		ewoAlumni: _profileBool(row.ewo_alumni),
		otherCourses: _profileStr(row.other_courses),
		carrySetup: _profileStr(row.carry_setup),
		trainingGoal: _profileStr(row.training_goal),
		showInFinder: _profileBool(row.show_in_finder),
		profileCompletedAt: _profileNum(row.profile_completed_at),
		createdAt: Number(row.created_at || 0),
		updatedAt: Number(row.updated_at || 0)
	};
}

export async function getMemberProfile(
	db: D1Compat,
	memberId: string
): Promise<MemberProfileRecord | null> {
	const row = await db
		.prepare('SELECT * FROM member_profiles WHERE member_id = ? LIMIT 1')
		.bind(memberId)
		.first<Record<string, unknown>>();
	return row ? mapMemberProfile(row) : null;
}

export async function upsertMemberProfile(
	db: D1Compat,
	memberId: string,
	input: {
		locationCity?: string | null;
		locationState?: string | null;
		background?: Partial<MemberProfileRecord['background']>;
		ecqcAlumni?: boolean;
		mucAlumni?: boolean;
		ewoAlumni?: boolean;
		otherCourses?: string | null;
		carrySetup?: string | null;
		trainingGoal?: string | null;
		showInFinder?: boolean;
		profileCompletedAt?: number | null;
	}
): Promise<MemberProfileRecord> {
	const existing = await getMemberProfile(db, memberId);
	const merged = {
		locationCity: input.locationCity ?? existing?.locationCity ?? null,
		locationState: input.locationState ?? existing?.locationState ?? null,
		background: {
			civilian: input.background?.civilian ?? existing?.background.civilian ?? false,
			lawEnforcement:
				input.background?.lawEnforcement ?? existing?.background.lawEnforcement ?? false,
			military: input.background?.military ?? existing?.background.military ?? false,
			medical: input.background?.medical ?? existing?.background.medical ?? false,
			other: input.background?.other ?? existing?.background.other ?? false
		},
		ecqcAlumni: input.ecqcAlumni ?? existing?.ecqcAlumni ?? false,
		mucAlumni: input.mucAlumni ?? existing?.mucAlumni ?? false,
		ewoAlumni: input.ewoAlumni ?? existing?.ewoAlumni ?? false,
		otherCourses: input.otherCourses ?? existing?.otherCourses ?? null,
		carrySetup: input.carrySetup ?? existing?.carrySetup ?? null,
		trainingGoal: input.trainingGoal ?? existing?.trainingGoal ?? null,
		showInFinder: input.showInFinder ?? existing?.showInFinder ?? true,
		profileCompletedAt: input.profileCompletedAt ?? existing?.profileCompletedAt ?? null
	};
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_profiles (
                                member_id, location_city, location_state,
                                background_civilian, background_le, background_military,
                                background_medical, background_other,
                                ecqc_alumni, muc_alumni, ewo_alumni, other_courses, carry_setup, training_goal,
                                show_in_finder, profile_completed_at, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(member_id) DO UPDATE SET
                                location_city = excluded.location_city,
                                location_state = excluded.location_state,
                                background_civilian = excluded.background_civilian,
                                background_le = excluded.background_le,
                                background_military = excluded.background_military,
                                background_medical = excluded.background_medical,
                                background_other = excluded.background_other,
                                ecqc_alumni = excluded.ecqc_alumni,
                                muc_alumni = excluded.muc_alumni,
                                ewo_alumni = excluded.ewo_alumni,
                                other_courses = excluded.other_courses,
                                carry_setup = excluded.carry_setup,
                                training_goal = excluded.training_goal,
                                show_in_finder = excluded.show_in_finder,
                                profile_completed_at = excluded.profile_completed_at,
                                updated_at = excluded.updated_at`
		)
		.bind(
			memberId,
			merged.locationCity,
			merged.locationState,
			merged.background.civilian ? 1 : 0,
			merged.background.lawEnforcement ? 1 : 0,
			merged.background.military ? 1 : 0,
			merged.background.medical ? 1 : 0,
			merged.background.other ? 1 : 0,
			merged.ecqcAlumni ? 1 : 0,
			merged.mucAlumni ? 1 : 0,
			merged.ewoAlumni ? 1 : 0,
			merged.otherCourses,
			merged.carrySetup,
			merged.trainingGoal,
			merged.showInFinder ? 1 : 0,
			merged.profileCompletedAt,
			existing ? existing.createdAt : now,
			now
		)
		.run();
	return (await getMemberProfile(db, memberId))!;
}

export async function getLeaderboardOptIn(db: D1Compat, memberId: string): Promise<boolean> {
	const row = await db
		.prepare('SELECT show_on_leaderboard FROM leaderboard_opt_in WHERE member_id = ? LIMIT 1')
		.bind(memberId)
		.first<{ show_on_leaderboard: number | null }>();
	return Number(row?.show_on_leaderboard ?? 0) === 1;
}

export async function setLeaderboardOptIn(
	db: D1Compat,
	memberId: string,
	showOnLeaderboard: boolean
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO leaderboard_opt_in (member_id, show_on_leaderboard, updated_at)
                         VALUES (?, ?, ?)
                         ON CONFLICT(member_id) DO UPDATE SET
                                show_on_leaderboard = excluded.show_on_leaderboard,
                                updated_at = excluded.updated_at`
		)
		.bind(memberId, showOnLeaderboard ? 1 : 0, now)
		.run();
}

export async function getMemberTrainingStats(
	_db: D1Compat,
	_memberId: string
): Promise<MemberTrainingStats> {
	// STUB — real impl reads member_training_points (ships with gamification).
	return { coursesCompleted: 0, liveSessionsAttended: 0 };
}

export async function listFinderCandidates(
	db: D1Compat,
	viewerId: string,
	filters: FinderFilters = {}
): Promise<FinderCandidate[]> {
	const limit = Math.max(1, Math.min(200, filters.limit ?? 60));
	const where: string[] = [
		'p.show_in_finder = 1',
		"m.access_status = 'active'",
		"m.tier IN ('bronze', 'vip')",
		'm.clerk_user_id != ?'
	];
	const params: unknown[] = [viewerId];

	if (filters.state) {
		where.push('UPPER(p.location_state) = UPPER(?)');
		params.push(filters.state);
	}
	if (filters.cityQuery) {
		where.push('LOWER(p.location_city) LIKE LOWER(?)');
		params.push(`%${filters.cityQuery}%`);
	}
	if (filters.ecqcOnly) {
		where.push('p.ecqc_alumni = 1');
	}
	if (filters.goalQuery) {
		where.push('LOWER(p.training_goal) LIKE LOWER(?)');
		params.push(`%${filters.goalQuery}%`);
	}
	if (filters.backgrounds && filters.backgrounds.length > 0) {
		const bgClauses: string[] = [];
		for (const bg of filters.backgrounds) {
			switch (bg) {
				case 'civilian':
					bgClauses.push('p.background_civilian = 1');
					break;
				case 'le':
					bgClauses.push('p.background_le = 1');
					break;
				case 'military':
					bgClauses.push('p.background_military = 1');
					break;
				case 'medical':
					bgClauses.push('p.background_medical = 1');
					break;
				case 'other':
					bgClauses.push('p.background_other = 1');
					break;
			}
		}
		if (bgClauses.length > 0) {
			where.push(`(${bgClauses.join(' OR ')})`);
		}
	}

	const sql = `
                SELECT m.*, p.member_id AS p_member_id,
                       p.location_city, p.location_state,
                       p.background_civilian, p.background_le, p.background_military,
                       p.background_medical, p.background_other,
                       p.ecqc_alumni, p.muc_alumni,
                       p.other_courses, p.carry_setup, p.training_goal,
                       p.show_in_finder, p.profile_completed_at,
                       p.created_at AS p_created_at, p.updated_at AS p_updated_at
                FROM members m
                INNER JOIN member_profiles p ON p.member_id = m.clerk_user_id
                WHERE ${where.join(' AND ')}
                ORDER BY m.name ASC
                LIMIT ?
        `;
	params.push(limit);

	const rows = await db
		.prepare(sql)
		.bind(...params)
		.all<Record<string, unknown>>();

	return rows.results.map((row) => {
		const member = mapMember(row);
		const profile = mapMemberProfile({
			...row,
			member_id: row.p_member_id,
			created_at: row.p_created_at,
			updated_at: row.p_updated_at
		});
		return { member, profile };
	});
}

export async function listMembersByClerkUserIds(
	db: D1Compat,
	clerkUserIds: string[]
): Promise<MemberRecord[]> {
	if (clerkUserIds.length === 0) return [];
	const unique = Array.from(new Set(clerkUserIds));
	const membersById = new Map<string, MemberRecord>();

	// Cloudflare D1 allows at most 100 bound parameters per statement. Keep a
	// little headroom so this helper remains safe if a fixed filter is added.
	for (let index = 0; index < unique.length; index += 90) {
		const ids = unique.slice(index, index + 90);
		const placeholders = ids.map(() => '?').join(',');
		const rows = await db
			.prepare(`SELECT * FROM members WHERE clerk_user_id IN (${placeholders})`)
			.bind(...ids)
			.all<Record<string, unknown>>();
		for (const row of rows.results) {
			const member = mapMember(row);
			membersById.set(member.clerkUserId, member);
		}
	}

	return unique.flatMap((id) => {
		const member = membersById.get(id);
		return member ? [member] : [];
	});
}

export async function listMembersByEmails(db: D1Compat, emails: string[]): Promise<MemberRecord[]> {
	if (emails.length === 0) return [];
	const unique = Array.from(
		new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))
	);
	const members: MemberRecord[] = [];

	for (let index = 0; index < unique.length; index += 90) {
		const chunk = unique.slice(index, index + 90);
		const placeholders = chunk.map(() => '?').join(',');
		const rows = await db
			.prepare(`SELECT * FROM members WHERE LOWER(email) IN (${placeholders})`)
			.bind(...chunk)
			.all<Record<string, unknown>>();
		members.push(...rows.results.map(mapMember));
	}

	return members;
}
