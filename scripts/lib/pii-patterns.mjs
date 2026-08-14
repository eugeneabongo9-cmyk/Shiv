/**
 * Shared PII / customer-data detection patterns for pre-commit and CI scans.
 * See docs/security/pii-remediation-report.md for inventory and rationale.
 */

/** Paths always blocked when staged (basename or path segment match). */
export const BLOCKED_PATH_PATTERNS = [
	/\.db$/i,
	/\.db-wal$/i,
	/\.db-shm$/i,
	/\.sqlite3?$/i,
	/^data\//i,
	/^d1-paste-chunks\//i,
	/^founding-members\.sql$/i,
	/^buyers\.(csv|sql)$/i,
	/-purchasers.*\.csv$/i,
	/^exports\//i,
	/^wc-export\//i,
	/^audit-report\.html$/i
];

/** Staged CSV files outside these prefixes are blocked. */
export const ALLOWED_CSV_PREFIXES = ['tests/fixtures/', 'migrations/'];

/** Repo-relative paths exempt from INSERT INTO member_imports content scan. */
export const MEMBER_IMPORTS_INSERT_ALLOWLIST = [
	/^migrations\//,
	/^docs\//,
	/^scripts\/wc-build-sql\.ts$/,
	/^scripts\/csv_to_member_imports\.py$/,
	/^src\/lib\/server\/db\/shivworks\.ts$/,
	/^src\/lib\/server\/member-imports\.ts$/,
	/\.test\.ts$/,
	/\.server\.test\.ts$/
];

/** Repo-relative path prefixes skipped for deep email content scan. */
export const DEEP_SCAN_SKIP_PREFIXES = [
	'.planning/',
	'docs/',
	'src/',
	'static/',
	'store/',
	'scripts/grant-local-admin.mjs',
	'scripts/test-wc-webhook.ts',
	'scripts/set-member-tier.ts',
	'scripts/send-client-progress-email.ts'
];

/** Email domains safe for fixtures, docs, and synthetic test data. */
export const ALLOWED_EMAIL_DOMAINS = new Set([
	'example.com',
	'example.org',
	'example.dev',
	'shivworks.example',
	'outerfields.example',
	'outerfields.co',
	'clerk.example.dev',
	'email.com',
	'shivworks.local',
	'shivworks.com',
	'network.shivworks.com',
	'shivworkspg.com',
	'createsomething.io'
]);

export const MEMBER_IMPORTS_INSERT_RE =
	/INSERT\s+INTO\s+member_imports\s*\([^)]*\)\s*VALUES\s*\([^)]*'[^']*@[^']+'/i;

export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function normalizeRepoPath(filePath) {
	return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function isBlockedPath(filePath) {
	const norm = normalizeRepoPath(filePath);
	return BLOCKED_PATH_PATTERNS.some((re) => re.test(norm));
}

export function isAllowedCsv(filePath) {
	const norm = normalizeRepoPath(filePath);
	if (!norm.endsWith('.csv')) return true;
	return ALLOWED_CSV_PREFIXES.some((prefix) => norm.startsWith(prefix));
}

export function isMemberImportsInsertAllowed(filePath) {
	const norm = normalizeRepoPath(filePath);
	return MEMBER_IMPORTS_INSERT_ALLOWLIST.some((re) => re.test(norm));
}

export function isAllowedEmail(email) {
	const domain = email.split('@')[1]?.toLowerCase();
	if (!domain) return false;
	if (ALLOWED_EMAIL_DOMAINS.has(domain)) return true;
	return false;
}

export function shouldDeepScan(filePath) {
	const norm = normalizeRepoPath(filePath);
	if (DEEP_SCAN_SKIP_PREFIXES.some((prefix) => norm.startsWith(prefix) || norm === prefix)) {
		return false;
	}
	// Customer-data risk is highest in bulk SQL/CSV exports.
	return /\.(sql|csv)$/i.test(norm) && !norm.startsWith('migrations/');
}

/**
 * @returns {{ line: number, email: string, reason: string }[]}
 */
export function findDisallowedEmails(content) {
	const findings = [];
	const lines = content.split(/\r?\n/);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const matches = line.match(EMAIL_RE) ?? [];
		for (const email of matches) {
			if (!isAllowedEmail(email)) {
				findings.push({
					line: i + 1,
					email,
					reason: 'non-allowlisted email domain (possible customer/operator PII)'
				});
			}
		}
	}

	return findings;
}

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {{ severity: 'error' | 'warn', code: string, message: string, line?: number }[]}
 */
export function scanFile(filePath, content) {
	const norm = normalizeRepoPath(filePath);
	const findings = [];

	if (isBlockedPath(norm)) {
		findings.push({
			severity: 'error',
			code: 'blocked-path',
			message: `Path matches blocked customer-data artifact pattern: ${norm}`
		});
		return findings;
	}

	if (norm.endsWith('.csv') && !isAllowedCsv(norm)) {
		findings.push({
			severity: 'error',
			code: 'blocked-csv',
			message: `CSV export path is not allowlisted: ${norm}`
		});
	}

	if (MEMBER_IMPORTS_INSERT_RE.test(content) && !isMemberImportsInsertAllowed(norm)) {
		findings.push({
			severity: 'error',
			code: 'member-imports-insert',
			message: `File contains INSERT INTO member_imports with email values: ${norm}`
		});
	}

	// Deep email scan for bulk export file types only.
	if (shouldDeepScan(norm)) {
		for (const hit of findDisallowedEmails(content)) {
			findings.push({
				severity: 'error',
				code: 'disallowed-email',
				message: `Line ${hit.line}: ${hit.email} — ${hit.reason}`,
				line: hit.line
			});
		}
	}

	return findings;
}
