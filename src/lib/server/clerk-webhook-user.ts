export type ClerkWebhookUser = {
	id: string;
	first_name?: string | null;
	last_name?: string | null;
	primary_email_address_id?: string | null;
	email_addresses?: Array<{
		id?: string | null;
		email_address?: string | null;
		verification?: {
			status?: string | null;
		} | null;
	}>;
};

function getPrimaryEmailEntry(user: ClerkWebhookUser) {
	const primaryId = user.primary_email_address_id;
	return user.email_addresses?.find((entry) => entry.id === primaryId) ?? user.email_addresses?.[0];
}

export function getWebhookPrimaryEmail(user: ClerkWebhookUser): string {
	return getPrimaryEmailEntry(user)?.email_address?.trim().toLowerCase() ?? '';
}

export function getWebhookDisplayName(user: ClerkWebhookUser): string {
	return (
		[user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
		getWebhookPrimaryEmail(user) ||
		'Member'
	);
}

export function isWebhookPrimaryEmailVerified(user: ClerkWebhookUser): boolean {
	return getPrimaryEmailEntry(user)?.verification?.status === 'verified';
}
