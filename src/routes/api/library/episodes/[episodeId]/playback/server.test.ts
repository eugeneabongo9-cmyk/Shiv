import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	buildPublicHlsUrlMock,
	buildSignedHlsUrlMock,
	buildStreamEmbedUrlMock,
	createStreamPlaybackTokenMock,
	getCourseModuleEpisodeByIdMock,
	getDBFromPlatformMock
} = vi.hoisted(() => ({
	buildPublicHlsUrlMock: vi.fn(
		(uid: string) => `https://videodelivery.net/${uid}/manifest/video.m3u8`
	),
	buildSignedHlsUrlMock: vi.fn(
		(token: string) => `https://videodelivery.net/${token}/manifest/video.m3u8`
	),
	buildStreamEmbedUrlMock: vi.fn((uid: string) => `https://iframe.videodelivery.net/${uid}`),
	createStreamPlaybackTokenMock: vi.fn(),
	getCourseModuleEpisodeByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' }))
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getCourseModuleEpisodeById: getCourseModuleEpisodeByIdMock
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: vi.fn(() => ({}))
}));

vi.mock('$lib/server/stream', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/stream')>('$lib/server/stream');
	return {
		...actual,
		buildPublicHlsUrl: buildPublicHlsUrlMock,
		buildSignedHlsUrl: buildSignedHlsUrlMock,
		buildStreamEmbedUrl: buildStreamEmbedUrlMock,
		createStreamPlaybackToken: createStreamPlaybackTokenMock
	};
});

import { GET } from './+server';

function createMember(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'member_1',
		email: 'member@example.com',
		name: 'Member',
		tier: 'bronze',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

function baseEpisode(overrides: Record<string, unknown> = {}) {
	return {
		id: 'episode_1',
		courseId: 'course_spotlight',
		courseSlug: 'spotlight-series',
		courseTitle: 'Spotlight Series',
		courseAccessTier: 'member',
		moduleId: 'module_1',
		moduleTitle: 'Episode 1',
		mediaAssetId: 'media_1',
		episodeNumber: 1,
		title: 'Episode 1',
		description: null,
		status: 'available',
		accessTier: 'member',
		sortOrder: 1,
		durationLabel: '10 min',
		media: {
			id: 'media_1',
			provider: 'cloudflare_stream',
			providerAssetId: 'stream_uid_1',
			title: 'Episode 1',
			fileName: 'episode-1.mp4',
			sourceUrl: null,
			sourceBytes: 5_000_000,
			durationSeconds: 600,
			durationLabel: '10 min',
			playbackPolicy: 'private',
			ingestStatus: 'ready',
			failureReason: null,
			createdByMemberId: 'admin_1',
			uploadedAt: Date.now(),
			playbackReadyAt: Date.now(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		},
		...overrides
	};
}

function buildEvent(user: NonNullable<App.Locals['user']> | null, episodeId = 'episode_1') {
	return {
		locals: { auth: { isAuthenticated: Boolean(user) }, user },
		params: { episodeId },
		platform: { env: {} }
	} as never;
}

describe('GET /api/library/episodes/[episodeId]/playback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		buildPublicHlsUrlMock.mockImplementation(
			(uid: string) => `https://videodelivery.net/${uid}/manifest/video.m3u8`
		);
		buildSignedHlsUrlMock.mockImplementation(
			(token: string) => `https://videodelivery.net/${token}/manifest/video.m3u8`
		);
		buildStreamEmbedUrlMock.mockImplementation(
			(uid: string) => `https://iframe.videodelivery.net/${uid}`
		);
	});

	it('rejects unauthenticated requests', async () => {
		const response = await GET(buildEvent(null));

		expect(response.status).toBe(401);
		expect(getCourseModuleEpisodeByIdMock).not.toHaveBeenCalled();
	});

	it('returns 404 when the episode does not exist', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(null);

		const response = await GET(buildEvent(createMember()));

		expect(response.status).toBe(404);
	});

	it('returns 409 when the episode is not published yet', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(baseEpisode({ status: 'coming_soon' }));

		const response = await GET(buildEvent(createMember()));

		expect(response.status).toBe(409);
	});

	it('lets an admin preview a ready episode before it is published', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(baseEpisode({ status: 'coming_soon' }));
		createStreamPlaybackTokenMock.mockResolvedValue({
			token: 'signed_token_1',
			expiresAt: 1_700_000_000
		});

		const response = await GET(buildEvent(createMember({ role: 'admin' })));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
	});

	it('still blocks an admin preview when the media is not ready yet', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({
				status: 'coming_soon',
				media: { ...baseEpisode().media, ingestStatus: 'processing' }
			})
		);

		const response = await GET(buildEvent(createMember({ role: 'admin' })));

		expect(response.status).toBe(409);
		expect(createStreamPlaybackTokenMock).not.toHaveBeenCalled();
	});

	it('blocks a free-tier member from a member-tier episode (upgrade required)', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(baseEpisode());

		const response = await GET(buildEvent(createMember({ tier: 'free' })));
		const result = await response.json();

		expect(response.status).toBe(403);
		expect(result.error).toContain('Upgrade required');
		expect(createStreamPlaybackTokenMock).not.toHaveBeenCalled();
	});

	it('blocks a free-tier member from a vip-tagged episode', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({ accessTier: 'vip', courseAccessTier: 'vip' })
		);

		const response = await GET(buildEvent(createMember({ tier: 'free' })));

		expect(response.status).toBe(403);
	});

	it('allows a bronze member to play a vip-tagged episode (vip audience = bronze or vip)', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({ accessTier: 'vip', courseAccessTier: 'vip' })
		);
		createStreamPlaybackTokenMock.mockResolvedValue({
			token: 'signed_token_1',
			expiresAt: 1_700_000_000
		});

		const response = await GET(buildEvent(createMember({ tier: 'bronze' })));

		expect(response.status).toBe(200);
	});

	it('allows a vip member to play a vip-only episode', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({ accessTier: 'vip', courseAccessTier: 'vip' })
		);
		createStreamPlaybackTokenMock.mockResolvedValue({
			token: 'signed_token_1',
			expiresAt: 1_700_000_000
		});

		const response = await GET(buildEvent(createMember({ tier: 'vip' })));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
	});

	it('lets an admin bypass the tier gate regardless of their own tier', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({ accessTier: 'vip', courseAccessTier: 'vip' })
		);
		createStreamPlaybackTokenMock.mockResolvedValue({
			token: 'signed_token_1',
			expiresAt: 1_700_000_000
		});

		const response = await GET(buildEvent(createMember({ tier: 'free', role: 'admin' })));

		expect(response.status).toBe(200);
	});

	it('reports still-processing media as not ready instead of exposing a broken player', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({ media: { ...baseEpisode().media, ingestStatus: 'processing' } })
		);

		const response = await GET(buildEvent(createMember()));
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.ingestStatus).toBe('processing');
		expect(createStreamPlaybackTokenMock).not.toHaveBeenCalled();
	});

	it('mints a signed private playback URL for a ready Stream episode', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(baseEpisode());
		createStreamPlaybackTokenMock.mockResolvedValue({
			token: 'signed_token_1',
			expiresAt: 1_700_000_500
		});

		const response = await GET(buildEvent(createMember()));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(createStreamPlaybackTokenMock).toHaveBeenCalledWith(
			{},
			'stream_uid_1',
			expect.any(Number)
		);
		expect(result).toMatchObject({
			success: true,
			data: {
				episodeId: 'episode_1',
				playbackType: 'hls',
				url: 'https://videodelivery.net/signed_token_1/manifest/video.m3u8',
				expiresAt: 1_700_000_500
			}
		});
	});

	it('returns a public HLS URL without minting a token when the policy is public', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({ media: { ...baseEpisode().media, playbackPolicy: 'public' } })
		);

		const response = await GET(buildEvent(createMember()));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(createStreamPlaybackTokenMock).not.toHaveBeenCalled();
		expect(result.data.url).toBe('https://videodelivery.net/stream_uid_1/manifest/video.m3u8');
	});

	it('returns the raw source URL for an externally hosted episode', async () => {
		getCourseModuleEpisodeByIdMock.mockResolvedValue(
			baseEpisode({
				media: {
					...baseEpisode().media,
					provider: 'external',
					providerAssetId: null,
					sourceUrl: 'https://cdn.example.com/videos/episode-1.mp4'
				}
			})
		);

		const response = await GET(buildEvent(createMember()));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(createStreamPlaybackTokenMock).not.toHaveBeenCalled();
		expect(result.data).toMatchObject({
			provider: 'external',
			playbackType: 'external',
			url: 'https://cdn.example.com/videos/episode-1.mp4'
		});
	});
});
