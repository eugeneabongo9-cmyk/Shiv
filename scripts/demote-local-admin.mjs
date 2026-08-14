/**
 * Demote a local member from admin → member (Wrangler D1 + optional SQLite).
 *
 * Usage:
 *   node scripts/demote-local-admin.mjs
 *   node scripts/demote-local-admin.mjs fejza.denis@gmail.com
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

d1Execute(`UPDATE members SET role = 'member' WHERE lower(email) = '${escapedEmail}'`);

const members = d1Execute(
	`SELECT clerk_user_id, email, role, tier, access_status FROM members WHERE lower(email) = '${escapedEmail}'`
);

const member = members[0];
if (!member) {
	console.error(`No member found in Wrangler local D1 for ${email}`);
	process.exit(1);
}

bustMemberCache(member.clerk_user_id);

const sqlitePath = join(process.cwd(), 'data', 'shivworks-network.db');
if (existsSync(sqlitePath)) {
	const db = new Database(sqlitePath);
	db.prepare("UPDATE members SET role = 'member' WHERE lower(email) = ?").run(email);
}

console.log('Admin demoted to member for local dev:');
console.log(member);
console.log('Hard-refresh or sign out/in, then open http://localhost:5173/settings');
