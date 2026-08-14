/**
 * Sticky completion: incomplete progress saves must not clear a prior completed_at.
 * Used by member_module_progress / member_episode_progress upserts.
 */
export function nextCompletedAt(
	requestedCompleted: boolean,
	existingCompletedAt: number | null,
	now: number
): number | null {
	if (requestedCompleted) {
		return existingCompletedAt ?? now;
	}
	return existingCompletedAt;
}
