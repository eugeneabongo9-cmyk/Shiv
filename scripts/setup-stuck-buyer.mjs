/**
 * Prepare stuck-buyer local state: signed-in member without entitlement,
 * plus an active unclaimed import for the same email.
 *
 * Usage:
 *   node scripts/setup-stuck-buyer.mjs
 *   node scripts/setup-stuck-buyer.mjs fejza.denis@gmail.com
 */
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DB_NAME = 'shivworks-network-db';
const KV_NAMESPACE_ID = 'a6e45e2190b9435f91ac645ebf2b0ea2';
const wranglerBin = join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const email = (process.argv[2] ?? 'fejza.denis@gmail.com').toLowerCase().trim();

function sqlEscape(value) {
	return value.replace(/'/g, "''");
}

function d1Execute(sql) {
	const args = ['d1', 'execute', DB_NAME, '--command', sql, '--json', '--local'];
	const out = execFileSync(process.execPath, [wranglerBin, ...args], {
		encoding: 'utf8',
		env: {
			...process.env,
			CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? 'ce810d489150aad89d66eabff9a0288e'
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});

	const parsed = JSON.parse(out);
	const merged = [];
	for (const block of parsed) {
		if (Array.isArray(block.results)) merged.push(...block.results);
	}
	return merged;
}

function bustMemberCache(clerkUserId) {
	const keys = [
		`member:${clerkUserId}`,
		`courses:${clerkUserId}`,
		`courses:catalog:${clerkUserId}`,
		`progress:${clerkUserId}`,
		`gamification:${clerkUserId}`
	];

	for (const key of keys) {
		try {
			execFileSync(
				process.execPath,
				[wranglerBin, 'kv', 'key', 'delete', key, '--namespace-id', KV_NAMESPACE_ID, '--local'],
				{
					encoding: 'utf8',
					env: {
						...process.env,
						CLOUDFLARE_ACCOUNT_ID:
							process.env.CLOUDFLARE_ACCOUNT_ID ?? 'ce810d489150aad89d66eabff9a0288e'
					},
					stdio: ['ignore', 'pipe', 'pipe']
				}
			);
		} catch {
			// Missing keys are fine.
		}
	}
}

const escapedEmail = sqlEscape(email);
const now = Date.now();

d1Execute(
	`UPDATE members
   SET tier = 'free', access_status = 'none', role = 'member', updated_at = ${now}
   WHERE lower(email) = '${escapedEmail}'`
);

d1Execute(
	`UPDATE member_imports
   SET access_status = 'active',
       tier = 'bronze',
       claimed_at = NULL,
       claimed_member_id = NULL,
       updated_at = ${now}
   WHERE lower(email) = '${escapedEmail}'`
);

const members = d1Execute(
	`SELECT clerk_user_id, email, role, tier, access_status FROM members WHERE lower(email) = '${escapedEmail}'`
);
const imports = d1Execute(
	`SELECT email, tier, access_status, claimed_at, claimed_member_id, source_ref
   FROM member_imports WHERE lower(email) = '${escapedEmail}'`
);

const member = members[0];
if (!member) {
	console.error(`No member found for ${email}`);
	process.exit(1);
}

if (!imports[0]) {
	console.error(
		`No member_imports row for ${email}. Run: pnpm tsx scripts/test-wc-webhook.ts ${email} bronze`
	);
	process.exit(1);
}

bustMemberCache(member.clerk_user_id);

const sqlitePath = join(process.cwd(), 'data', 'shivworks-network.db');
if (existsSync(sqlitePath)) {
	const db = new Database(sqlitePath);
	db.prepare(
		`UPDATE members SET tier = 'free', access_status = 'none', role = 'member', updated_at = ? WHERE lower(email) = ?`
	).run(now, email);
	db.prepare(
		`UPDATE member_imports
     SET access_status = 'active', tier = 'bronze', claimed_at = NULL, claimed_member_id = NULL, updated_at = ?
     WHERE lower(email) = ?`
	).run(now, email);
}

console.log('Stuck-buyer state ready:');
console.log({ member, import: imports[0] });
console.log('');
console.log('Open http://localhost:5173/welcome — it should auto-claim and show Access granted.');
