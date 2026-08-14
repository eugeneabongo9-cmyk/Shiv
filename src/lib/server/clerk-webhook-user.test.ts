import { describe, expect, it } from 'vitest';
import {
	getWebhookDisplayName,
	getWebhookPrimaryEmail,
	isWebhookPrimaryEmailVerified
} from './clerk-webhook-user';

describe('Clerk webhook user helpers', () => {
	it('uses the primary email instead of the first email in the payload', () => {
		const user = {
			id: 'user_123',
			first_name: 'Member',
			last_name: 'Example',
			primary_email_address_id: 'email_primary',
			email_addresses: [
				{
					id: 'email_secondary',
					email_address: 'secondary@example.com',
					verification: { status: 'unverified' }
				},
				{
					id: 'email_primary',
					email_address: 'PRIMARY@EXAMPLE.COM',
					verification: { status: 'verified' }
				}
			]
		};

		expect(getWebhookPrimaryEmail(user)).toBe('primary@example.com');
		expect(isWebhookPrimaryEmailVerified(user)).toBe(true);
		expect(getWebhookDisplayName(user)).toBe('Member Example');
	});

	it('falls back to the first email when Clerk omits the primary id', () => {
		const user = {
			id: 'user_123',
			email_addresses: [
				{
					id: 'email_first',
					email_address: 'first@example.com',
					verification: { status: 'verified' }
				}
			]
		};

		expect(getWebhookPrimaryEmail(user)).toBe('first@example.com');
		expect(isWebhookPrimaryEmailVerified(user)).toBe(true);
		expect(getWebhookDisplayName(user)).toBe('first@example.com');
	});
});
