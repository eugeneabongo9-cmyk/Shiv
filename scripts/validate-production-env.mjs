#!/usr/bin/env node
/**
 * Pre-deploy production secret validation.
 * Usage: ENVIRONMENT=production WC_WEBHOOK_SECRET=... node scripts/validate-production-env.mjs
 */
import { validateProductionSecrets } from '../src/lib/server/env-validation.ts';

const env = { ...process.env };
const result = validateProductionSecrets(env);

if (!result.ok) {
	console.error('Production environment validation failed:');
	for (const issue of result.issues) {
		console.error(`  - ${issue}`);
	}
	process.exit(1);
}

console.log('Production environment validation passed.');
