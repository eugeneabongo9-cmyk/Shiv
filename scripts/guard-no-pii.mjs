#!/usr/bin/env node
/**
 * Pre-commit guard: reject staged files that match customer-data / PII patterns.
 * Invoked from .husky/pre-commit (before lint-staged).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { scanFile } from './lib/pii-patterns.mjs';

function stagedFiles() {
	const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
		encoding: 'utf8'
	});
	return out
		.split(/\r?\n/)
		.map((f) => f.trim())
		.filter(Boolean);
}

const files = stagedFiles();
const errors = [];

for (const file of files) {
	let content = '';
	try {
		content = readFileSync(file, 'utf8');
	} catch {
		// Binary or deleted-only hunks — path rules still apply.
	}

	for (const finding of scanFile(file, content)) {
		if (finding.severity === 'error') {
			errors.push({ file, ...finding });
		}
	}
}

if (errors.length > 0) {
	console.error('\n⛔ PII / customer-data guard blocked this commit:\n');
	for (const err of errors) {
		console.error(`  [${err.code}] ${err.file}`);
		console.error(`         ${err.message}`);
	}
	console.error(
		'\nCustomer imports belong in Cloudflare D1 only. See docs/security/pii-remediation-report.md\n'
	);
	process.exit(1);
}

console.log(`pii-guard: OK (${files.length} staged file(s) checked)`);
