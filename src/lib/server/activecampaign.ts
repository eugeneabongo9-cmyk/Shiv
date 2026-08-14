// ActiveCampaign tagging — env-gated.
// If ACTIVECAMPAIGN_API_URL + ACTIVECAMPAIGN_API_KEY are unset, calls no-op
// so dev/staging without AC creds doesn't break the webhook path.
//
// Ledger entry: 2026-05-29 · w358 / w462.

import { logError } from './log';

export interface ActiveCampaignEnv {
	ACTIVECAMPAIGN_API_URL?: string;
	ACTIVECAMPAIGN_API_KEY?: string;
}

// Resolve the contact (by email) — create if missing — and apply the tag name.
// Returns true if the request fired (regardless of AC's response code), false
// if AC is not configured for this env.
export async function applyActiveCampaignTag(
	env: ActiveCampaignEnv,
	input: { email: string; firstName?: string; lastName?: string; tagName: string },
	options?: { strict?: boolean }
): Promise<boolean> {
	const url = env.ACTIVECAMPAIGN_API_URL;
	const key = env.ACTIVECAMPAIGN_API_KEY;
	if (!url || !key) return false; // no-op when not configured

	const fail = (code: string, error: Error) => {
		logError(code, error, { email: input.email, tag: input.tagName });
		if (options?.strict) {
			throw error;
		}
		return true;
	};

	try {
		// 1. Sync the contact (idempotent create-or-update).
		const syncRes = await fetch(`${url.replace(/\/$/, '')}/api/3/contact/sync`, {
			method: 'POST',
			headers: { 'Api-Token': key, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contact: {
					email: input.email,
					firstName: input.firstName,
					lastName: input.lastName
				}
			})
		});
		if (!syncRes.ok) {
			return fail('activecampaign.sync', new Error(`status=${syncRes.status}`));
		}
		const synced = (await syncRes.json()) as { contact?: { id?: string } };
		const contactId = synced.contact?.id;
		if (!contactId) {
			return fail('activecampaign.sync.no-id', new Error('missing contact id'));
		}

		// 2. Look up the tag by name to get its id.
		const tagSearch = await fetch(
			`${url.replace(/\/$/, '')}/api/3/tags?search=${encodeURIComponent(input.tagName)}`,
			{ headers: { 'Api-Token': key } }
		);
		if (!tagSearch.ok) {
			return fail('activecampaign.tag.search', new Error(`status=${tagSearch.status}`));
		}
		const tagJson = (await tagSearch.json()) as { tags?: Array<{ id?: string; tag?: string }> };
		const tag = tagJson.tags?.find((t) => t.tag?.toLowerCase() === input.tagName.toLowerCase());
		if (!tag?.id) {
			return fail('activecampaign.tag.missing', new Error(`tag not found in AC: ${input.tagName}`));
		}

		// 3. Apply the tag to the contact.
		const apply = await fetch(`${url.replace(/\/$/, '')}/api/3/contactTags`, {
			method: 'POST',
			headers: { 'Api-Token': key, 'Content-Type': 'application/json' },
			body: JSON.stringify({ contactTag: { contact: contactId, tag: tag.id } })
		});
		if (!apply.ok) {
			return fail('activecampaign.tag.apply', new Error(`status=${apply.status}`));
		}
		return true;
	} catch (error) {
		logError('activecampaign.fetch', error, { email: input.email, tag: input.tagName });
		if (options?.strict) {
			throw error;
		}
		return true;
	}
}

export function tagNameForTier(tier: 'bronze' | 'vip'): string {
	return tier === 'vip' ? 'VIP_Founding' : 'Jujitsu_Course_Member';
}
