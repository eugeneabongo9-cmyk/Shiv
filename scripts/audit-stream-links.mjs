#!/usr/bin/env node
/**
 * Audit every media_asset against Cloudflare Stream.
 *
 * The platform records a Stream UID at upload time and never re-checks it. If the
 * Cloudflare video is never created, fails after the record is written, or is deleted
 * later, the database still reports `ingest_status = 'ready'` and the episode still
 * reports `status = 'available'` — every dashboard shows green while members get an
 * error. This script is the missing check.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/audit-stream-links.mjs
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/audit-stream-links.mjs --json
 *
 * The token needs, on the ShivWorks account:
 *   - Stream : Read
 *   - D1     : Read
 *
 * Read-only. Changes nothing.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ce810d489150aad89d66eabff9a0288e';
const DATABASE_ID = process.env.SHIVWORKS_D1_ID || '77c0198a-378e-4eb7-aa56-801dc0fa6c3d';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const AS_JSON = process.argv.includes('--json');
const API = 'https://api.cloudflare.com/client/v4';

if (!TOKEN) {
	console.error('Missing CLOUDFLARE_API_TOKEN.');
	console.error('Create one at: Cloudflare dashboard -> My Profile -> API Tokens -> Create Token');
	console.error('Permissions needed: Account | Stream | Read   and   Account | D1 | Read');
	process.exit(1);
}

const auth = { Authorization: `Bearer ${TOKEN}` };

async function cf(path, init) {
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: { ...auth, ...(init?.headers || {}) }
	});
	const body = await res.json().catch(() => null);
	if (!res.ok || !body?.success) {
		const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ') || res.statusText;
		throw new Error(`${path} -> ${res.status} ${detail}`);
	}
	return body.result;
}

/** Every video that actually exists in Stream, paged. */
async function listStreamVideos() {
	const found = new Map();
	let before;
	for (let page = 0; page < 50; page++) {
		const qs = new URLSearchParams({ limit: '1000' });
		if (before) qs.set('before', before);
		const batch = await cf(`/accounts/${ACCOUNT_ID}/stream?${qs}`);
		if (!batch.length) break;
		for (const v of batch) {
			found.set(v.uid, {
				uid: v.uid,
				name: v.meta?.name ?? null,
				state: v.status?.state ?? null,
				ready: Boolean(v.readyToStream),
				signed: Boolean(v.requireSignedURLs),
				origins: v.allowedOrigins ?? [],
				duration: v.duration ?? null,
				created: v.created ?? null
			});
		}
		if (batch.length < 1000) break;
		before = batch[batch.length - 1].created;
	}
	return found;
}

/** What the platform believes it has. */
async function listPlatformAssets() {
	const sql = `
		SELECT m.id            AS media_id,
		       m.provider_asset_id AS uid,
		       m.title         AS media_title,
		       m.ingest_status,
		       m.playback_policy,
		       e.id            AS episode_id,
		       e.title         AS episode_title,
		       e.status        AS episode_status,
		       c.title         AS course_title
		FROM media_assets m
		LEFT JOIN course_module_episodes e ON e.media_asset_id = m.id
		LEFT JOIN courses c ON c.id = e.course_id
		WHERE m.provider = 'cloudflare_stream'
		ORDER BY c.title, e.episode_number`;
	const result = await cf(`/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sql })
	});
	return result?.[0]?.results ?? [];
}

/**
 * Second linkage path: a module can embed a Stream video directly via
 * course_modules.video_url, bypassing media_assets entirely (see migration
 * 0024). Those videos are live on the platform but have no media_asset row, so
 * a media_assets-only audit reports them as orphaned — and acting on that would
 * delete content members are watching.
 */
async function listModuleEmbeds() {
	const sql = `
		SELECT mo.id AS module_id, mo.title AS module_title, mo.video_kind, mo.video_url,
		       c.title AS course_title
		FROM course_modules mo
		LEFT JOIN courses c ON c.id = mo.course_id
		WHERE mo.video_url IS NOT NULL AND mo.video_url <> ''`;
	const result = await cf(`/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sql })
	});
	return result?.[0]?.results ?? [];
}

/** Pull a Stream UID out of an embed/manifest URL, if there is one. */
function uidFromUrl(url) {
	const match = String(url).match(
		/(?:iframe\.cloudflarestream\.com|videodelivery\.net|customer-[a-z0-9]+\.cloudflarestream\.com)\/([a-f0-9]{32})/i
	);
	return match?.[1] ?? null;
}

const label = (r) =>
	`${r.course_title ?? '(no course)'} / ${r.episode_title ?? r.media_title ?? r.media_id}`;

const [videos, assets, moduleEmbeds] = await Promise.all([
	listStreamVideos(),
	listPlatformAssets(),
	listModuleEmbeds()
]);

const broken = [];
const notReady = [];
const healthy = [];

for (const row of assets) {
	if (!row.uid) {
		broken.push({ ...row, reason: 'no Stream UID recorded' });
		continue;
	}
	const video = videos.get(row.uid);
	if (!video) {
		broken.push({ ...row, reason: 'UID does not exist in Cloudflare Stream' });
		continue;
	}
	if (!video.ready) {
		notReady.push({ ...row, reason: `Stream state = ${video.state ?? 'unknown'}` });
		continue;
	}
	healthy.push({ ...row, video });
}

// Module-level embeds count as linked, and a broken one is just as fatal as a
// broken episode — it is simply invisible to a media_assets-only query.
const embedded = [];
for (const mo of moduleEmbeds) {
	const uid = uidFromUrl(mo.video_url);
	if (!uid) continue; // non-Stream URL (local mp4, external host) — not our concern here
	const video = videos.get(uid);
	if (!video) {
		broken.push({
			media_id: mo.module_id,
			media_title: mo.module_title,
			uid,
			course_title: mo.course_title,
			episode_title: `${mo.module_title} (module embed)`,
			episode_status: 'module video_url',
			ingest_status: 'n/a',
			reason: 'UID does not exist in Cloudflare Stream'
		});
		continue;
	}
	embedded.push({ ...mo, uid, video });
}

const linked = new Set([
	...assets.map((a) => a.uid).filter(Boolean),
	...embedded.map((e) => e.uid)
]);
const orphans = [...videos.values()].filter((v) => !linked.has(v.uid));

if (AS_JSON) {
	console.log(
		JSON.stringify(
			{ broken, notReady, healthy: healthy.length, embedded: embedded.length, orphans },
			null,
			2
		)
	);
	process.exit(broken.length ? 1 : 0);
}

console.log(`\nStream videos: ${videos.size}   platform assets: ${assets.length}\n`);

if (broken.length) {
	console.log(`BROKEN — ${broken.length} episode(s) point at a video that is not playable:\n`);
	for (const r of broken) {
		console.log(`  ${label(r)}`);
		console.log(`    uid            ${r.uid ?? '(none)'}`);
		console.log(`    reason         ${r.reason}`);
		console.log(`    db says        ingest=${r.ingest_status}  episode=${r.episode_status ?? '-'}`);
		console.log(`    episode id     ${r.episode_id ?? '-'}`);
		console.log(`    media id       ${r.media_id}\n`);
	}
} else {
	console.log('BROKEN — none. Every episode points at a real, ready Stream video.\n');
}

if (notReady.length) {
	console.log(`STILL ENCODING — ${notReady.length}:\n`);
	for (const r of notReady) console.log(`  ${label(r)}  (${r.reason})`);
	console.log('');
}

console.log(`HEALTHY — ${healthy.length} episode(s) + ${embedded.length} module embed(s)\n`);

if (orphans.length) {
	console.log(`ORPHANED IN CLOUDFLARE — ${orphans.length} video(s) with no episode linked.`);
	console.log('These are billed for storage but invisible to members.\n');
	for (const v of orphans) {
		console.log(`  ${v.uid}  ${v.name ?? '(no name)'}  ${v.ready ? 'ready' : v.state}`);
	}
	console.log('');
}

process.exit(broken.length ? 1 : 0);
