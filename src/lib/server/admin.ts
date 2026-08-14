export interface AdminEnv extends Record<string, string | undefined> {
	SHIVWORKS_ADMIN_EMAILS?: string;
}

function normalizeEmailList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean);
}

export function isAdminUser(
	user: App.Locals['user'] | null | undefined,
	env: AdminEnv | null | undefined = process.env
): boolean {
	if (!user?.email) return false;
	if (user.role === 'admin') return true;

	const configured = env?.SHIVWORKS_ADMIN_EMAILS;
	if (!configured) return false;

	return normalizeEmailList(configured).includes(user.email.toLowerCase());
}
