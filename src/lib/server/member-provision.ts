import { isPaidMemberTier, type PaidMembershipTier } from '$lib/constants/tiers';
import type { D1Compat } from '$lib/server/d1-compat';
import { getUnclaimedImportForEmail } from '$lib/server/db/shivworks';
import { buildProvisionedSignupPath } from '$lib/utils/provision-auth';

export { buildProvisionedSignupPath };

export type AuthEmailRoute =
	| { kind: 'signup'; tier: PaidMembershipTier; name: string }
	| { kind: 'signin' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeProvisionEmail(email: string): string | null {
	const normalized = email.trim().toLowerCase();
	return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

/** Routes imported purchasers without a Clerk account to signup instead of sign-in. */
export async function resolveAuthRouteForEmail(
	db: D1Compat,
	email: string
): Promise<AuthEmailRoute> {
	const normalized = normalizeProvisionEmail(email);
	if (!normalized) {
		return { kind: 'signin' };
	}

	const unclaimed = await getUnclaimedImportForEmail(db, normalized);
	if (unclaimed && isPaidMemberTier(unclaimed.tier)) {
		return {
			kind: 'signup',
			tier: unclaimed.tier,
			name: unclaimed.name
		};
	}

	return { kind: 'signin' };
}
