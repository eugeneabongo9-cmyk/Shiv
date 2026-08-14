/**
 * Centralized production environment validation.
 * Fails loudly when required secrets are missing, weak, or placeholder values.
 */

export class EnvValidationError extends Error {
	readonly issues: string[];

	constructor(message: string, issues: string[]) {
		super(message);
		this.name = 'EnvValidationError';
		this.issues = issues;
	}
}

const BLOCKED_SECRET_EXACT = new Set([
	'',
	'changeme',
	'change-me',
	'change_me',
	'placeholder',
	'test',
	'testing',
	'development',
	'dev',
	'example',
	'sample',
	'replace_me',
	'replace-me',
	'replaceme',
	'your-secret',
	'your_secret',
	'secret',
	'password',
	'wc_webhook_secret',
	'xxx',
	'null',
	'undefined',
	'todo',
	'fixme',
	'set-me',
	'setme'
]);

const BLOCKED_SECRET_SUBSTRINGS = [
	'changeme',
	'placeholder',
	'replace_me',
	'replace-me',
	'your-secret',
	'your_secret',
	'lorem ipsum',
	'insert secret',
	'add-your-secret'
] as const;

const MIN_WC_WEBHOOK_SECRET_LENGTH = 16;

export function isProductionRuntime(env: Record<string, string | undefined>): boolean {
	if (env.CI === 'true' || env.GITHUB_ACTIONS === 'true') {
		return false;
	}
	const environment = env.ENVIRONMENT?.trim().toLowerCase();
	if (environment === 'preview' || environment === 'staging' || environment === 'development') {
		return false;
	}
	if (environment === 'production') return true;
	if (env.NODE_ENV?.trim().toLowerCase() === 'production') return true;
	return false;
}

export type SecretValidationResult = { ok: true; value: string } | { ok: false; issues: string[] };

function normalizeSecretInput(value: string | null | undefined): string {
	if (value == null) return '';
	return value.trim();
}

function isRepeatedCharacterSecret(value: string): boolean {
	if (value.length < 3) return false;
	return value.split('').every((char) => char === value[0]);
}

/**
 * Validate a WooCommerce webhook shared secret for strength and placeholder rejection.
 */
export function validateWcWebhookSecret(
	value: string | null | undefined,
	options: { production?: boolean } = {}
): SecretValidationResult {
	const normalized = normalizeSecretInput(value);
	const issues: string[] = [];
	const production = options.production ?? false;
	const lowered = normalized.toLowerCase();

	if (!normalized) {
		issues.push('WC_WEBHOOK_SECRET is missing or empty');
		return { ok: false, issues };
	}

	if (BLOCKED_SECRET_EXACT.has(lowered)) {
		issues.push(`WC_WEBHOOK_SECRET is a blocked placeholder value (${describeBlocked(lowered)})`);
	}

	for (const fragment of BLOCKED_SECRET_SUBSTRINGS) {
		if (lowered.includes(fragment)) {
			issues.push(`WC_WEBHOOK_SECRET contains blocked placeholder fragment "${fragment}"`);
		}
	}

	if (/^(test|sample|example|dev|development)[-_]/.test(lowered)) {
		issues.push('WC_WEBHOOK_SECRET uses a blocked development/test prefix');
	}

	if (/[-_](test|sample|example|dev|development)$/.test(lowered)) {
		issues.push('WC_WEBHOOK_SECRET uses a blocked development/test suffix');
	}

	if (isRepeatedCharacterSecret(lowered)) {
		issues.push('WC_WEBHOOK_SECRET is too weak (repeated characters)');
	}

	if (production && normalized.length < MIN_WC_WEBHOOK_SECRET_LENGTH) {
		issues.push(
			`WC_WEBHOOK_SECRET must be at least ${MIN_WC_WEBHOOK_SECRET_LENGTH} characters in production`
		);
	}

	if (issues.length > 0) {
		return { ok: false, issues };
	}

	return { ok: true, value: normalized };
}

function describeBlocked(value: string): string {
	if (!value) return 'empty';
	return value;
}

export type ProductionEnvValidationResult = { ok: true } | { ok: false; issues: string[] };

/**
 * Validate secrets required for a production deployment.
 */
export function validateProductionSecrets(
	env: Record<string, string | undefined>
): ProductionEnvValidationResult {
	const issues: string[] = [];

	const wc = validateWcWebhookSecret(env.WC_WEBHOOK_SECRET, { production: true });
	if (!wc.ok) {
		issues.push(...wc.issues);
	}

	if (issues.length > 0) {
		return { ok: false, issues };
	}

	return { ok: true };
}

export function assertProductionSecrets(env: Record<string, string | undefined>): void {
	if (!isProductionRuntime(env)) {
		return;
	}

	const result = validateProductionSecrets(env);
	if (!result.ok) {
		throw new EnvValidationError(
			`Production startup blocked: invalid environment configuration (${result.issues.join('; ')})`,
			result.issues
		);
	}
}

/**
 * Runtime helper for the WC webhook handler — strict in production, lenient in dev.
 */
export function requireWcWebhookSecret(
	env: Record<string, string | undefined>
): SecretValidationResult {
	return validateWcWebhookSecret(env.WC_WEBHOOK_SECRET, {
		production: isProductionRuntime(env)
	});
}

export const WC_WEBHOOK_SECRET_ENV_KEY = 'WC_WEBHOOK_SECRET' as const;
