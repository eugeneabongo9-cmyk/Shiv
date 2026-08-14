export function buildProvisionedSignupPath(email: string, redirectTo?: string | null): string {
	const params = new URLSearchParams({
		email,
		provisioned: '1'
	});

	if (redirectTo) {
		params.set('redirect', redirectTo);
	}

	return `/signup?${params.toString()}`;
}
