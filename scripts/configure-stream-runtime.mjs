#!/usr/bin/env node

import { spawn } from 'node:child_process';

const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'shivworks-network';
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const streamApiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const webhookUrl =
	process.env.CLOUDFLARE_STREAM_WEBHOOK_URL ||
	(process.env.PUBLIC_SITE_URL ? `${process.env.PUBLIC_SITE_URL.replace(/\/$/, '')}/api/webhooks/stream` : '');

function requireEnv(name, value) {
	if (!value) {
		throw new Error(`Missing ${name}`);
	}
	return value;
}

async function readCloudflareJson(response) {
	const body = await response.json().catch(() => null);
	if (!response.ok || !body?.success) {
		const message =
			body?.errors?.map((entry) => entry.message).join('; ') ||
			`Cloudflare API request failed with status ${response.status}`;
		throw new Error(message);
	}
	return body.result;
}

async function putPagesSecret(name, value) {
	await new Promise((resolve, reject) => {
		const child = spawn(
			'pnpm',
			['exec', 'wrangler', 'pages', 'secret', 'put', name, '--project-name', projectName],
			{
				env: {
					...process.env,
					CLOUDFLARE_ACCOUNT_ID: accountId
				},
				stdio: ['pipe', 'inherit', 'inherit']
			}
		);

		child.stdin.end(value);
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(`wrangler pages secret put ${name} exited with ${code}`));
		});
	});
}

async function main() {
	requireEnv('CLOUDFLARE_ACCOUNT_ID', accountId);
	requireEnv('CLOUDFLARE_STREAM_API_TOKEN', streamApiToken);
	requireEnv('CLOUDFLARE_STREAM_WEBHOOK_URL or PUBLIC_SITE_URL', webhookUrl);

	const streamBaseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
	await readCloudflareJson(
		await fetch(`${streamBaseUrl}?per_page=1`, {
			headers: {
				Authorization: `Bearer ${streamApiToken}`
			}
		})
	);

	const webhook = await readCloudflareJson(
		await fetch(`${streamBaseUrl}/webhook`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${streamApiToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				notificationUrl: webhookUrl
			})
		})
	);

	if (!webhook.secret) {
		throw new Error('Cloudflare Stream webhook response did not include a signing secret');
	}

	await putPagesSecret('CLOUDFLARE_STREAM_API_TOKEN', streamApiToken);
	await putPagesSecret('CLOUDFLARE_STREAM_WEBHOOK_SECRET', webhook.secret);

	if (process.env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS) {
		await putPagesSecret('CLOUDFLARE_STREAM_ALLOWED_ORIGINS', process.env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS);
	}

	console.log(`Configured Cloudflare Stream runtime for ${projectName}.`);
	console.log(`Webhook URL: ${webhook.notificationUrl || webhook.notification_url || webhookUrl}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
