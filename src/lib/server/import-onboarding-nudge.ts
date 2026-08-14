import { sendImportedMemberOnboardingEmail } from '$lib/email';
import type { D1Compat } from '$lib/server/d1-compat';
import {
	listImportedMemberProvisions,
	upsertImportedMemberProvision,
	type ImportedMemberProvisionRecord
} from '$lib/server/db/shivworks';

/** Minimum gap between onboarding re-nudge emails for the same purchaser. */
export const IMPORT_ONBOARDING_NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type ImportOnboardingNudgeResult = {
	sent: number;
	skippedClaimed: number;
	skippedCooldown: number;
	skippedInactive: number;
	failed: number;
	failures: string[];
};

function isAwaitingPaidSignup(row: ImportedMemberProvisionRecord): boolean {
	return (
		(row.tier === 'bronze' || row.tier === 'vip') &&
		row.claimedAt == null &&
		row.accessStatus === 'active'
	);
}

function isWithinCooldown(row: ImportedMemberProvisionRecord, now: number): boolean {
	return row.lastEmailedAt != null && now - row.lastEmailedAt < IMPORT_ONBOARDING_NUDGE_COOLDOWN_MS;
}

async function sendNudge(
	db: D1Compat,
	runtimeEnv: Record<string, string | undefined>,
	row: ImportedMemberProvisionRecord,
	now: number
): Promise<void> {
	await sendImportedMemberOnboardingEmail(runtimeEnv, {
		email: row.email,
		name: row.name,
		tier: row.tier
	});
	await upsertImportedMemberProvision(db, {
		email: row.email,
		name: row.name,
		tier: row.tier,
		accessStatus: row.accessStatus,
		role: 'member',
		sourceRef: row.sourceRef,
		invitedAt: row.invitedAt ?? now,
		lastEmailedAt: now
	});
}

export async function nudgeImportedMemberOnboarding(
	db: D1Compat,
	runtimeEnv: Record<string, string | undefined>,
	email: string,
	now = Date.now()
): Promise<{ ok: true; status: 'sent' | 'cooldown' } | { ok: false; error: string }> {
	const target = email.trim().toLowerCase();
	const imports = await listImportedMemberProvisions(db);
	const row = imports.find((entry) => entry.email.toLowerCase() === target);
	if (!row) {
		return { ok: false, error: 'Import record not found.' };
	}
	if (row.claimedAt != null) {
		return { ok: false, error: 'This purchaser already signed up.' };
	}
	if (row.accessStatus !== 'active' || (row.tier !== 'bronze' && row.tier !== 'vip')) {
		return { ok: false, error: 'Only active Bronze/VIP awaiting-signup purchases can be nudged.' };
	}
	if (isWithinCooldown(row, now)) {
		return { ok: true, status: 'cooldown' };
	}

	try {
		await sendNudge(db, runtimeEnv, row, now);
		return { ok: true, status: 'sent' };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to send onboarding email.';
		return { ok: false, error: message };
	}
}

export async function nudgeAwaitingSignupImports(
	db: D1Compat,
	runtimeEnv: Record<string, string | undefined>,
	now = Date.now()
): Promise<ImportOnboardingNudgeResult> {
	const imports = await listImportedMemberProvisions(db);
	const result: ImportOnboardingNudgeResult = {
		sent: 0,
		skippedClaimed: 0,
		skippedCooldown: 0,
		skippedInactive: 0,
		failed: 0,
		failures: []
	};

	for (const row of imports) {
		if (row.claimedAt != null) {
			result.skippedClaimed += 1;
			continue;
		}
		if (!isAwaitingPaidSignup(row)) {
			result.skippedInactive += 1;
			continue;
		}
		if (isWithinCooldown(row, now)) {
			result.skippedCooldown += 1;
			continue;
		}

		try {
			await sendNudge(db, runtimeEnv, row, now);
			result.sent += 1;
		} catch (error) {
			result.failed += 1;
			const message = error instanceof Error ? error.message : String(error);
			result.failures.push(`${row.email}: ${message}`);
		}
	}

	return result;
}
