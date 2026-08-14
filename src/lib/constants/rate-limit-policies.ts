/** Named rate-limit policies for member-facing and auth-sensitive endpoints. */
export const RATE_LIMIT_POLICIES = {
	rsvp: { limit: 10, windowSeconds: 3600, keyPrefix: 'rl:rsvp' },
	vipCall: { limit: 5, windowSeconds: 3600, keyPrefix: 'rl:vip-call' },
	provisionCheck: { limit: 20, windowSeconds: 300, keyPrefix: 'rl:provision-check' },
	moduleProgress: { limit: 120, windowSeconds: 60, keyPrefix: 'rl:module-progress' },
	episodeProgress: { limit: 120, windowSeconds: 60, keyPrefix: 'rl:episode-progress' },
	moduleNotes: { limit: 30, windowSeconds: 3600, keyPrefix: 'rl:module-notes' }
} as const;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

export function buildRateLimitKey(prefix: string, subject: string): string {
	return `${prefix}:${subject}`;
}
