/** Maximum concurrent active devices per member account. */
export const MEMBER_ACTIVE_SESSION_LIMIT = 2;

export const SESSION_REVOKE_REASONS = [
	'member_revoked',
	'device_limit_exceeded',
	'admin_revoked',
	'clerk_sync'
] as const;

export type SessionRevokeReason = (typeof SESSION_REVOKE_REASONS)[number];

export function isSessionRevokeReason(value: string): value is SessionRevokeReason {
	return (SESSION_REVOKE_REASONS as readonly string[]).includes(value);
}
