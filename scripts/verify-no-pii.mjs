#!/usr/bin/env node
/**
 * Repository PII verification — run locally and in CI.
 *
 * Usage:
 *   node scripts/verify-no-pii.mjs              # tracked files only (git ls-files)
 *   node scripts/verify-no-pii.mjs --worktree   # include untracked/ignored local artifacts
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { scanFile } from './lib/pii-patterns.mjs';

const includeWorktree = process.argv.includes('--worktree');
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

function trackedFiles() {
	return execSync('git ls-files', { encoding: 'utf8', cwd: repoRoot })
		.split(/\r?\n/)
		.map((f) => f.trim())
		.filter(Boolean);
}

const errors = [];
const warnings = [];

for (const file of trackedFiles()) {
	let content = '';
	try {
		content = readFileSync(join(repoRoot, file), 'utf8');
	} catch {
		// binary
	}
	for (const finding of scanFile(file, content)) {
		if (finding.severity === 'error') errors.push({ file, ...finding });
		else warnings.push({ file, ...finding });
	}
}

if (includeWorktree) {
	const explicit = [
		'founding-members.sql',
		'audit-report.html',
		'data/shivworks-network.db',
		'data/shivworks-network.db-wal',
		'data/shivworks-network.db-shm',
		'buyers.csv',
		'buyers.sql',
		'.wrangler'
	];
	const chunkDir = join(repoRoot, 'd1-paste-chunks');
	if (existsSync(chunkDir)) {
		for (const name of readdirSync(chunkDir)) {
			if (name.endsWith('.sql')) explicit.push(`d1-paste-chunks/${name}`);
		}
	}

	const localArtifacts = explicit.filter((f) => existsSync(join(repoRoot, f)));

	for (const file of localArtifacts) {
		warnings.push({
			file,
			severity: 'warn',
			code: 'local-artifact',
			message: 'Local customer-data artifact present on disk (not tracked — purge recommended)'
		});
	}
}

console.log(`verify-no-pii: scanned ${trackedFiles().length} tracked file(s)`);

if (warnings.length > 0 && includeWorktree) {
	console.log(`\n⚠ Local artifacts (${warnings.length}):`);
	for (const w of warnings) {
		console.log(`  ${w.file}: ${w.message}`);
	}
}

if (errors.length > 0) {
	console.error(`\n✗ FAIL — ${errors.length} tracked finding(s):\n`);
	for (const err of errors) {
		console.error(`  [${err.code}] ${err.file}`);
		console.error(`         ${err.message}`);
	}
	process.exit(1);
}

console.log('✓ PASS — no customer PII patterns in tracked files');
if (!includeWorktree) {
	console.log('  (run with --worktree to list local artifacts)');
}
