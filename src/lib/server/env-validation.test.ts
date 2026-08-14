import { describe, expect, it } from 'vitest';
import {
	assertProductionSecrets,
	EnvValidationError,
	isProductionRuntime,
	requireWcWebhookSecret,
	validateProductionSecrets,
	validateWcWebhookSecret
} from './env-validation';

const STRONG_SECRET = 'a7f3c9e2b1d84f6a0e5c8b2d9f1a4e7c';

describe('isProductionRuntime', () => {
	it('detects ENVIRONMENT=production', () => {
		expect(isProductionRuntime({ ENVIRONMENT: 'production' })).toBe(true);
	});

	it('detects NODE_ENV=production', () => {
		expect(isProductionRuntime({ NODE_ENV: 'production' })).toBe(true);
	});

	it('returns false for preview and staging', () => {
		expect(isProductionRuntime({ ENVIRONMENT: 'preview' })).toBe(false);
		expect(isProductionRuntime({ ENVIRONMENT: 'staging' })).toBe(false);
	});

	it('returns false in CI so smoke and unit jobs can run without production secrets', () => {
		expect(isProductionRuntime({ ENVIRONMENT: 'production', CI: 'true' })).toBe(false);
		expect(isProductionRuntime({ ENVIRONMENT: 'production', GITHUB_ACTIONS: 'true' })).toBe(false);
	});
});

describe('validateWcWebhookSecret', () => {
	it('rejects empty, null, and undefined', () => {
		for (const value of ['', '   ', null, undefined]) {
			const result = validateWcWebhookSecret(value, { production: true });
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.issues[0]).toMatch(/missing or empty/i);
			}
		}
	});

	it.each([
		'changeme',
		'placeholder',
		'test',
		'development',
		'example',
		'sample',
		'replace_me',
		'xxx'
	])('rejects blocked exact placeholder %s', (value) => {
		const result = validateWcWebhookSecret(value, { production: true });
		expect(result.ok).toBe(false);
	});

	it('rejects placeholder substrings', () => {
		const result = validateWcWebhookSecret('my-changeme-secret-value-here', { production: true });
		expect(result.ok).toBe(false);
	});

	it('rejects development/test prefixes', () => {
		expect(validateWcWebhookSecret('test-webhook-secret-value', { production: true }).ok).toBe(
			false
		);
		expect(validateWcWebhookSecret('sample-hook-secret-123456', { production: true }).ok).toBe(
			false
		);
	});

	it('rejects short secrets in production', () => {
		const result = validateWcWebhookSecret('goodlocalsecret', { production: true });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues.some((issue) => /at least 16 characters/i.test(issue))).toBe(true);
		}
	});

	it('accepts a strong production secret', () => {
		const result = validateWcWebhookSecret(STRONG_SECRET, { production: true });
		expect(result).toEqual({ ok: true, value: STRONG_SECRET });
	});

	it('allows a short non-placeholder secret outside production mode', () => {
		const result = validateWcWebhookSecret('local-only-secret!', { production: false });
		expect(result.ok).toBe(true);
	});
});

describe('validateProductionSecrets', () => {
	it('fails when WC secret is missing in production env', () => {
		const result = validateProductionSecrets({ WC_WEBHOOK_SECRET: undefined });
		expect(result.ok).toBe(false);
	});

	it('passes with a strong WC secret', () => {
		const result = validateProductionSecrets({ WC_WEBHOOK_SECRET: STRONG_SECRET });
		expect(result.ok).toBe(true);
	});
});

describe('assertProductionSecrets', () => {
	it('does not throw outside production', () => {
		expect(() =>
			assertProductionSecrets({ ENVIRONMENT: 'development', WC_WEBHOOK_SECRET: 'test' })
		).not.toThrow();
	});

	it('throws EnvValidationError in production with weak secret', () => {
		expect(() =>
			assertProductionSecrets({ ENVIRONMENT: 'production', WC_WEBHOOK_SECRET: 'changeme' })
		).toThrow(EnvValidationError);
	});

	it('passes in production with strong secret', () => {
		expect(() =>
			assertProductionSecrets({ ENVIRONMENT: 'production', WC_WEBHOOK_SECRET: STRONG_SECRET })
		).not.toThrow();
	});
});

describe('requireWcWebhookSecret', () => {
	it('uses production rules when ENVIRONMENT=production', () => {
		const result = requireWcWebhookSecret({
			ENVIRONMENT: 'production',
			WC_WEBHOOK_SECRET: 'test'
		});
		expect(result.ok).toBe(false);
	});
});
