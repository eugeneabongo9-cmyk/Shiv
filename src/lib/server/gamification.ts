// Gamification — launch-time stub.
//
// Per D-2 (2026-05-31): the leaderboard / training-points surface is deferred
// post-launch. The /account route still calls awardPoints when a member first
// completes their training profile; this stub lets that call resolve safely
// (returns awarded:0) so the form submission succeeds. When gamification ships,
// replace this file with the real implementation that writes to
// member_training_points and recomputes ranks.

import type { D1Compat } from '$lib/server/d1-compat';

export type AwardAction =
	| 'profile_complete'
	| 'course_complete'
	| 'live_session_attend'
	| 'community_post';

export interface AwardPointsInput {
	memberId: string;
	action: AwardAction;
	referenceType?: string | null;
	referenceId?: string | null;
}

export type AwardResult =
	| { reason: 'awarded'; awarded: number }
	| { reason: 'already_awarded'; awarded: 0 }
	| { reason: 'disabled'; awarded: 0 };

export async function awardPoints(_db: D1Compat, _input: AwardPointsInput): Promise<AwardResult> {
	// Gamification deferred — log only, award nothing.
	return { reason: 'disabled', awarded: 0 };
}

// Minimal dossier shape used by /profile. Returns empty placeholder so the
// page renders without erroring while gamification UI is hidden by D-2.
export interface MemberDossier {
	trainingPoints: number;
	rank: string | null;
	streakDays: number;
	milestones: Array<{ key: string; earnedAt: number }>;
}

export async function getMemberDossier(_db: D1Compat, _memberId: string): Promise<MemberDossier> {
	return { trainingPoints: 0, rank: null, streakDays: 0, milestones: [] };
}
