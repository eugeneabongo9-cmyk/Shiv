import { describe, expect, it } from 'vitest';
import {
	buildCatalogSummaryCounts,
	courseMatchesCatalogFilter,
	courseMatchesSearch,
	filterCatalogCourses,
	getCatalogEmptyBody,
	getCatalogEmptyTitle,
	getCatalogFilterStatusCopy,
	getCourseProgressBadge,
	getCourseProgressDetail,
	isCourseAccessible,
	isCourseReadyForRelease,
	buildCourseReleaseCounts,
	mergeCatalogCourses,
	shouldShowUpgradeCta
} from './catalog';
import type { CourseRecord } from '$lib/server/db/shivworks';
import type { MemberRecord } from '$lib/server/db/shivworks';

const baseCourse = (overrides: Partial<CourseRecord> = {}): CourseRecord => ({
	id: 'course-1',
	slug: 'origin-story',
	title: 'Origin Story',
	description: 'Foundations of the ShivWorks method.',
	status: 'available',
	sortOrder: 1,
	badgeText: null,
	artworkUrl: null,
	courseKind: 'course',
	accessTier: 'member',
	totalModuleCount: 4,
	availableModuleCount: 2,
	roadmapModuleCount: 2,
	completedModuleCount: 0,
	startedModuleCount: 0,
	...overrides
});

const member = (overrides: Partial<MemberRecord> = {}): MemberRecord => ({
	clerkUserId: 'user_1',
	email: 'member@example.com',
	name: 'Member',
	tier: 'free',
	accessStatus: 'active',
	role: 'member',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides
});

describe('mergeCatalogCourses', () => {
	it('preserves member progress for accessible courses', () => {
		const merged = mergeCatalogCourses(
			[baseCourse()],
			[baseCourse({ startedModuleCount: 1, completedModuleCount: 0 })]
		);
		expect(merged[0]?.startedModuleCount).toBe(1);
	});

	it('zeros progress for courses outside the member-scoped list', () => {
		const merged = mergeCatalogCourses([baseCourse({ id: 'locked', accessTier: 'vip' })], []);
		expect(merged[0]?.startedModuleCount).toBe(0);
	});
});

describe('tier gating helpers', () => {
	it('marks curriculum content inaccessible for free members only', () => {
		expect(isCourseAccessible(member(), baseCourse({ accessTier: 'vip' }))).toBe(false);
		expect(isCourseAccessible(member({ tier: 'bronze' }), baseCourse({ accessTier: 'vip' }))).toBe(
			true
		);
	});

	it('shows upgrade CTA only for free members on paid curriculum', () => {
		expect(shouldShowUpgradeCta(member(), 'member')).toBe(true);
		expect(shouldShowUpgradeCta(member({ tier: 'bronze' }), 'vip')).toBe(false);
		expect(shouldShowUpgradeCta(member({ tier: 'vip' }), 'vip')).toBe(false);
	});
});

describe('progress badges', () => {
	it('returns completed when all live modules are done', () => {
		expect(
			getCourseProgressBadge(baseCourse({ completedModuleCount: 2, availableModuleCount: 2 }))
		).toBe('completed');
	});

	it('returns in-progress when any module has started', () => {
		expect(getCourseProgressBadge(baseCourse({ startedModuleCount: 1 }))).toBe('in-progress');
	});

	it('does not advertise staged modules as ready before their course opens', () => {
		expect(
			getCourseProgressDetail(baseCourse({ status: 'coming_soon', availableModuleCount: 1 }))
		).toBe('Opens with the next curriculum release');
	});
});

describe('search and filters', () => {
	it('matches title and description terms', () => {
		expect(courseMatchesSearch(baseCourse(), 'origin foundations')).toBe(true);
		expect(courseMatchesSearch(baseCourse(), 'missing topic')).toBe(false);
	});

	it('filters by tier and status', () => {
		expect(courseMatchesCatalogFilter(baseCourse({ accessTier: 'free' }), 'free')).toBe(true);
		expect(courseMatchesCatalogFilter(baseCourse({ status: 'coming_soon' }), 'available')).toBe(
			false
		);
	});

	it('combines search and filter', () => {
		const results = filterCatalogCourses(
			[
				baseCourse(),
				baseCourse({ id: 'vip', title: 'VIP Lab', accessTier: 'vip', status: 'coming_soon' })
			],
			{ query: 'vip', filter: 'vip' }
		);
		expect(results).toHaveLength(1);
		expect(results[0]?.title).toBe('VIP Lab');
	});

	it('uses tag-specific copy and counts only visible filtered results', () => {
		const visible = [
			baseCourse({ id: 'vip-1', accessTier: 'vip', status: 'coming_soon' }),
			baseCourse({ id: 'vip-2', accessTier: 'vip', status: 'coming_soon' })
		];

		expect(getCatalogFilterStatusCopy('vip')).toBe('Showing VIP-tagged curriculum blocks.');
		expect(buildCatalogSummaryCounts(visible, member({ tier: 'vip' }))).toEqual({
			showing: 2,
			availableNow: 0,
			membershipRequired: 0
		});
	});
});

describe('lane empty copy', () => {
	it('names the empty roadshow and spotlights lanes explicitly', () => {
		expect(
			getCatalogEmptyTitle({
				hasCourses: false,
				hasAccessibleCourses: false,
				hasFilteredResults: false,
				filter: 'all',
				query: '',
				lane: 'roadshow'
			})
		).toContain('Roadshow');
		expect(
			getCatalogEmptyTitle({
				hasCourses: false,
				hasAccessibleCourses: false,
				hasFilteredResults: false,
				filter: 'all',
				query: '',
				lane: 'spotlights'
			})
		).toContain('Spotlights');
		expect(
			getCatalogEmptyBody({
				hasCourses: false,
				hasAccessibleCourses: false,
				hasFilteredResults: false,
				filter: 'all',
				query: '',
				memberTier: 'bronze',
				lane: 'roadshow'
			})
		).toContain('Road episodes');
	});

	it('prioritizes a search miss over tier-access copy', () => {
		const shared = {
			hasCourses: true,
			hasAccessibleCourses: false,
			hasFilteredResults: false,
			filter: 'all' as const,
			query: 'zzzz no such course'
		};

		expect(getCatalogEmptyTitle(shared)).toBe('No courses match your search.');
		expect(getCatalogEmptyBody({ ...shared, memberTier: 'free' })).toContain(
			'Try a different search term'
		);
	});

	it('retains tier-access copy when no search or filter is active', () => {
		expect(
			getCatalogEmptyTitle({
				hasCourses: true,
				hasAccessibleCourses: false,
				hasFilteredResults: false,
				filter: 'all',
				query: ''
			})
		).toBe('Your current tier has no unlocked courses yet.');
	});
});

describe('buildCourseReleaseCounts', () => {
	it('counts only the three launch curriculum blocks as ready', () => {
		const counts = buildCourseReleaseCounts([
			baseCourse({ id: 'course_foundations', availableModuleCount: 1 }),
			baseCourse({ id: 'course_cap', availableModuleCount: 1 }),
			baseCourse({ id: 'course_muc', availableModuleCount: 2 }),
			baseCourse({
				id: 'course_core_skills',
				status: 'available',
				availableModuleCount: 1
			}),
			baseCourse({
				id: 'series_roadshow',
				courseKind: 'series',
				status: 'available',
				availableModuleCount: 1
			}),
			baseCourse({ id: 'course_pcc', status: 'coming_soon', availableModuleCount: 0 })
		]);

		expect(counts.available).toBe(3);
		expect(counts.roadmap).toBe(2);
		expect(counts.visible).toBe(6);
	});

	it('excludes launch courses without playable modules', () => {
		expect(
			isCourseReadyForRelease(
				baseCourse({ id: 'course_cap', status: 'available', availableModuleCount: 0 })
			)
		).toBe(false);
	});
});
