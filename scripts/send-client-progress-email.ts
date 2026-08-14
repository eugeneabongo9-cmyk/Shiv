#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface SendClientProgressArgs {
	to: string;
	name: string;
	senderName: string;
	isDraft: boolean;
	liveUrl: string;
	walkthroughUrl: string;
}

const DEFAULT_LIVE_URL = 'https://shivworks-network.pages.dev';
const DEFAULT_WALKTHROUGH_URL = 'https://share.descript.com/view/tL82XrniVki';
const DEFAULT_EMAIL_FROM = 'Micah Johnson <micah@createsomething.io>';

function readArg(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadPackageEnv() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const envPath = join(__dirname, '..', '.env');

	if (!existsSync(envPath)) {
		return;
	}

	const envContent = readFileSync(envPath, 'utf-8');
	for (const rawLine of envContent.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) {
			continue;
		}

		const equalsIndex = line.indexOf('=');
		if (equalsIndex <= 0) {
			continue;
		}

		const key = line.slice(0, equalsIndex).trim();
		const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '');

		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

function parseArgs(): SendClientProgressArgs {
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		console.log(`Send ShivWorks client progress update email

Usage:
  pnpm email:client-progress --to <email> --name <name> [options]

Options:
  --to <email>              Recipient email address
  --name <name>             Recipient name
  --sender <name>           Sender display name (default: Micah)
  --draft                   Prefix subject and add internal draft banner
  --live-url <url>          Override live network URL
  --walkthrough-url <url>   Override walkthrough URL

Examples:
  pnpm email:client-progress --draft --to micah@createsomething.io --name Micah
  pnpm email:client-progress --to aaron@outerfields.co --name Aaron
`);
		process.exit(0);
	}

	const to = readArg('--to');
	const name = readArg('--name');

	if (!to) {
		throw new Error('Missing --to <email>');
	}

	if (!name) {
		throw new Error('Missing --name <recipient-name>');
	}

	return {
		to,
		name,
		senderName: readArg('--sender') ?? 'Micah',
		isDraft: process.argv.includes('--draft'),
		liveUrl: readArg('--live-url') ?? process.env.PUBLIC_SITE_URL ?? DEFAULT_LIVE_URL,
		walkthroughUrl: readArg('--walkthrough-url') ?? DEFAULT_WALKTHROUGH_URL
	};
}

async function main() {
	loadPackageEnv();
	const args = parseArgs();

	if (!process.env.RESEND_API_KEY) {
		throw new Error('Missing RESEND_API_KEY in environment');
	}

	if (!process.env.EMAIL_FROM) {
		process.env.EMAIL_FROM = DEFAULT_EMAIL_FROM;
	}

	const [{ resolveRuntimeEnv }, { sendClientProgressUpdateEmail }] = await Promise.all([
		import('../src/lib/server/env.ts'),
		import('../src/lib/email/index.ts')
	]);

	const runtimeEnv = resolveRuntimeEnv();

	await sendClientProgressUpdateEmail(runtimeEnv, {
		email: args.to,
		recipientName: args.name,
		senderName: args.senderName,
		isDraft: args.isDraft,
		liveUrl: args.liveUrl,
		walkthroughUrl: args.walkthroughUrl
	});

	console.log(`Sent ShivWorks progress update to ${args.to}`);
	console.log(`Live URL: ${args.liveUrl}`);
	console.log(`Walkthrough URL: ${args.walkthroughUrl}`);
	console.log(`Draft mode: ${args.isDraft ? 'yes' : 'no'}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
