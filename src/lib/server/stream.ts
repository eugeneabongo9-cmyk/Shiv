import { createHmac } from 'node:crypto';

interface StreamConfig {
	accountId: string;
	apiToken: string;
}

export interface StreamConfigEnv extends Record<string, string | undefined> {
	CLOUDFLARE_ACCOUNT_ID?: string;
	CF_ACCOUNT_ID?: string;
	CLOUDFLARE_STREAM_ACCOUNT_ID?: string;
	CLOUDFLARE_STREAM_API_TOKEN?: string;
	STREAM_API_TOKEN?: string;
	CLOUDFLARE_STREAM_WEBHOOK_SECRET?: string;
	CLOUDFLARE_STREAM_ALLOWED_ORIGINS?: string;
	STREAM_ALLOWED_ORIGINS?: string;
	VIDEO_STREAM_TOKEN_TTL_SECONDS?: string;
}

interface CloudflareApiMessage {
	code?: number;
	message?: string;
}

interface CloudflareApiEnvelope<T> {
	success: boolean;
	errors?: CloudflareApiMessage[];
	messages?: CloudflareApiMessage[];
	result: T;
}

export interface CreateTusDirectUploadInput {
	uploadLength: number;
	fileName?: string;
	creatorId?: string;
	maxDurationSeconds?: number;
	playbackPolicy?: 'private' | 'public';
	meta?: Record<string, string>;
}

export interface CreateTusDirectUploadResult {
	streamUid: string;
	uploadUrl: string;
	expiresAt: number;
}

export interface StreamPlaybackTokenResult {
	token: string;
	expiresAt: number;
}

export interface StreamWebhookPayload {
	uid: string;
	readyToStream?: boolean;
	status?: {
		state?: string;
		errorReasonCode?: string;
		errorReasonText?: string;
	};
	duration?: number;
	size?: number;
	thumbnail?: string;
	meta?: Record<string, string>;
}

export type StreamVideoDetails = StreamWebhookPayload;

const DIRECT_UPLOAD_MAX_BYTES = 30 * 1024 * 1024 * 1024;
/** Default private playback token lifetime — long enough for multi-hour courses. */
const DEFAULT_TOKEN_TTL_SECONDS = 14_400;
const MIN_TOKEN_TTL_SECONDS = 900;
const MAX_TOKEN_TTL_SECONDS = 86_400;
const WEBHOOK_TIME_TOLERANCE_SECONDS = 5 * 60;

export function getMaxDirectUploadBytes(): number {
	return DIRECT_UPLOAD_MAX_BYTES;
}

const SUPPORTED_VIDEO_MIME_TYPES = new Set([
	'video/mp4',
	'video/quicktime',
	'video/x-msvideo',
	'video/x-matroska',
	'video/webm',
	'video/mpeg',
	'video/3gpp',
	'video/3gpp2',
	'video/x-flv',
	'video/ogg'
]);

const SUPPORTED_VIDEO_EXTENSIONS = new Set([
	'mp4',
	'mov',
	'm4v',
	'avi',
	'mkv',
	'webm',
	'mpeg',
	'mpg',
	'3gp',
	'3g2',
	'flv',
	'ogv',
	'ogg'
]);

function getFileExtension(fileName: string | null | undefined): string | null {
	const match = (fileName || '').trim().match(/\.([a-z0-9]+)$/i);
	return match ? match[1].toLowerCase() : null;
}

/**
 * Validates that an upload declares itself as a supported video file before any
 * Cloudflare Stream reservation is created. Accepts the request if either the
 * declared MIME type or the file extension matches a known video format —
 * browsers do not always populate `File.type` consistently.
 */
export function isSupportedVideoFile(input: {
	fileName?: string | null;
	fileType?: string | null;
}): boolean {
	const mimeType = (input.fileType || '').trim().toLowerCase();
	if (mimeType.startsWith('video/') || SUPPORTED_VIDEO_MIME_TYPES.has(mimeType)) {
		return true;
	}

	const extension = getFileExtension(input.fileName);
	return Boolean(extension && SUPPORTED_VIDEO_EXTENSIONS.has(extension));
}

/**
 * Checks Cloudflare Stream configuration readiness without throwing, so admin
 * UI and API routes can validate configuration before starting an upload
 * instead of failing mid-reservation.
 */
export function getStreamConfigStatus(env: StreamConfigEnv): {
	ready: boolean;
	missingKeys: string[];
} {
	const accountConfigured = Boolean(
		env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || env.CLOUDFLARE_STREAM_ACCOUNT_ID
	);
	const tokenConfigured = Boolean(env.CLOUDFLARE_STREAM_API_TOKEN || env.STREAM_API_TOKEN);
	const webhookConfigured = Boolean(env.CLOUDFLARE_STREAM_WEBHOOK_SECRET);

	const missingKeys: string[] = [];
	if (!accountConfigured) missingKeys.push('CLOUDFLARE_ACCOUNT_ID');
	if (!tokenConfigured) missingKeys.push('CLOUDFLARE_STREAM_API_TOKEN');
	if (!webhookConfigured) missingKeys.push('CLOUDFLARE_STREAM_WEBHOOK_SECRET');

	return { ready: missingKeys.length === 0, missingKeys };
}

function requireConfig(env: StreamConfigEnv): StreamConfig {
	const accountId =
		env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || env.CLOUDFLARE_STREAM_ACCOUNT_ID;
	const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN || env.STREAM_API_TOKEN;

	if (!accountId) {
		throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
	}
	if (!apiToken) {
		throw new Error('Missing CLOUDFLARE_STREAM_API_TOKEN');
	}

	return { accountId, apiToken };
}

function base64Encode(value: string): string {
	return Buffer.from(value, 'utf8').toString('base64');
}

function normalizeUploadMetadata(input: Record<string, string>): string {
	return Object.entries(input)
		.filter(([, value]) => value.length > 0)
		.map(([key, value]) => `${key} ${base64Encode(value)}`)
		.join(',');
}

function normalizeUploadLocation(location: string): string {
	if (location.startsWith('http://') || location.startsWith('https://')) {
		return location;
	}

	return `https://upload.videodelivery.net${location.startsWith('/') ? '' : '/'}${location}`;
}

/**
 * Cloudflare Stream API failure that preserves the HTTP status.
 *
 * Callers must be able to tell "this video does not exist" apart from
 * "Cloudflare was unreachable". Those need opposite handling: a bad UID should
 * be rejected at the point of entry, while a transient outage should leave the
 * record alone for the webhook or a later sync to resolve. Collapsing both into
 * a bare Error is how an episode ends up pointing at a video that was never
 * there while the UI reports it as merely "still processing".
 */
export class StreamApiError extends Error {
	readonly status: number;
	/** Cloudflare returns 404 for an unknown UID, and 10005/10006 for a bad one. */
	readonly notFound: boolean;

	constructor(message: string, status: number, codes: number[] = []) {
		super(message);
		this.name = 'StreamApiError';
		this.status = status;
		this.notFound = status === 404 || codes.includes(10005) || codes.includes(10006);
	}
}

async function parseApiJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as CloudflareApiEnvelope<T> | null;
	if (!response.ok || !payload?.success) {
		const messages = payload ? formatCloudflareMessages(payload) : '';
		const codes = (payload?.errors || [])
			.map((entry) => entry.code)
			.filter((code): code is number => typeof code === 'number');
		throw new StreamApiError(messages || 'Cloudflare API error', response.status, codes);
	}
	return payload.result;
}

/**
 * Does this UID correspond to a real video in Cloudflare Stream?
 *
 * `exists: false` is a definitive no — safe to reject the input. `unknown` means
 * Cloudflare could not be reached or is misconfigured, so the caller should stay
 * lenient rather than reject a UID that may well be valid.
 */
export async function checkStreamVideoExists(
	env: StreamConfigEnv,
	streamUid: string
): Promise<
	{ exists: true; details: StreamVideoDetails } | { exists: false } | { exists: 'unknown' }
> {
	try {
		const details = await getStreamVideoDetails(env, streamUid);
		return { exists: true, details };
	} catch (error) {
		if (error instanceof StreamApiError && error.notFound) {
			return { exists: false };
		}
		return { exists: 'unknown' };
	}
}

function formatCloudflareMessages(payload: Partial<CloudflareApiEnvelope<unknown>>): string {
	const messages = [...(payload.errors || []), ...(payload.messages || [])]
		.map((entry) => entry.message?.trim())
		.filter((message): message is string => Boolean(message));

	return [...new Set(messages)].join(' ');
}

async function readCloudflareApiError(response: Response): Promise<string> {
	const body = await response.text();
	if (!body) {
		return 'Cloudflare API error';
	}

	try {
		const payload = JSON.parse(body) as Partial<CloudflareApiEnvelope<unknown>>;
		return formatCloudflareMessages(payload) || body;
	} catch {
		return body;
	}
}

export function getPlaybackTokenTtlSeconds(env: StreamConfigEnv): number {
	const parsed = Number.parseInt(env.VIDEO_STREAM_TOKEN_TTL_SECONDS || '', 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return DEFAULT_TOKEN_TTL_SECONDS;
	}
	return Math.min(MAX_TOKEN_TTL_SECONDS, Math.max(MIN_TOKEN_TTL_SECONDS, parsed));
}

export async function createTusDirectUpload(
	env: StreamConfigEnv,
	input: CreateTusDirectUploadInput
): Promise<CreateTusDirectUploadResult> {
	if (!Number.isFinite(input.uploadLength) || input.uploadLength <= 0) {
		throw new Error('Upload length must be a positive integer');
	}
	if (input.uploadLength > DIRECT_UPLOAD_MAX_BYTES) {
		throw new Error(`Upload exceeds max supported size (${DIRECT_UPLOAD_MAX_BYTES} bytes)`);
	}

	const config = requireConfig(env);
	const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream?direct_user=true`;
	const allowedOrigins = env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS
		? env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
		: env.STREAM_ALLOWED_ORIGINS
			? env.STREAM_ALLOWED_ORIGINS.split(',')
					.map((value) => value.trim())
					.filter(Boolean)
			: [];

	const metadata: Record<string, string> = {
		name: input.fileName || 'ShivWorks Upload',
		...(input.maxDurationSeconds ? { maxdurationseconds: String(input.maxDurationSeconds) } : {}),
		...(input.playbackPolicy === 'private' ? { requiresignedurls: 'true' } : {}),
		...(allowedOrigins.length > 0 ? { allowedorigins: JSON.stringify(allowedOrigins) } : {}),
		...(input.meta || {})
	};

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiToken}`,
			'Tus-Resumable': '1.0.0',
			'Upload-Length': String(input.uploadLength),
			'Upload-Metadata': normalizeUploadMetadata(metadata),
			...(input.creatorId ? { 'Upload-Creator': input.creatorId } : {})
		}
	});

	if (!response.ok) {
		const message = await readCloudflareApiError(response);
		if (response.status === 413 && message.toLowerCase().includes('storage capacity exceeded')) {
			throw new Error(`Cloudflare Stream storage capacity exceeded: ${message}`);
		}

		throw new Error(`Failed to initialize Stream direct upload (${response.status}): ${message}`);
	}

	const location = response.headers.get('Location');
	const streamUid = response.headers.get('stream-media-id');
	const expiryHeader = response.headers.get('stream-media-expiry');

	if (!location || !streamUid) {
		throw new Error('Missing Location or stream-media-id in Stream direct upload response');
	}

	const expiresAt = expiryHeader
		? Math.floor(new Date(expiryHeader).getTime() / 1000)
		: Math.floor(Date.now() / 1000) + 60 * 60;

	return {
		streamUid,
		uploadUrl: normalizeUploadLocation(location),
		expiresAt
	};
}

export async function createStreamPlaybackToken(
	env: StreamConfigEnv,
	streamUid: string,
	expiresAt: number
): Promise<StreamPlaybackTokenResult> {
	const config = requireConfig(env);
	const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/${streamUid}/token`;
	const result = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ exp: expiresAt })
	});

	const parsed = await parseApiJson<{ token: string }>(result);
	if (!parsed.token) {
		throw new Error('Cloudflare Stream token response was missing token');
	}

	return { token: parsed.token, expiresAt };
}

export async function getStreamVideoDetails(
	env: StreamConfigEnv,
	streamUid: string
): Promise<StreamVideoDetails> {
	const trimmedUid = streamUid.trim();
	if (!trimmedUid) {
		throw new Error('Stream UID is required');
	}

	const config = requireConfig(env);
	const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/${encodeURIComponent(trimmedUid)}`;
	const result = await fetch(url, {
		headers: {
			Authorization: `Bearer ${config.apiToken}`
		}
	});

	return parseApiJson<StreamVideoDetails>(result);
}

export function buildSignedHlsUrl(token: string): string {
	return `https://videodelivery.net/${token}/manifest/video.m3u8`;
}

export function buildPublicHlsUrl(streamUid: string): string {
	return `https://videodelivery.net/${streamUid}/manifest/video.m3u8`;
}

export function extractStreamPlaybackId(playbackUrl: string): string | null {
	const match = playbackUrl.match(/videodelivery\.net\/([^/]+)\//);
	return match?.[1] || null;
}

const STREAM_UID_PATTERN = /^[a-f0-9]{32}$/i;

export function parseStreamUidFromReference(reference: string): string | null {
	const trimmed = reference.trim();
	if (!trimmed) {
		return null;
	}

	if (STREAM_UID_PATTERN.test(trimmed)) {
		return trimmed;
	}

	try {
		const parsed = new URL(trimmed);
		const pathnameMatch = parsed.pathname.match(/\/([a-f0-9]{32})(?:\/|$)/i);
		if (pathnameMatch?.[1]) {
			return pathnameMatch[1];
		}
	} catch {
		// Fall through to pattern matching on raw strings.
	}

	const embeddedMatch = trimmed.match(
		/(?:videodelivery\.net|cloudflarestream\.com)\/([a-f0-9]{32})/i
	);
	if (embeddedMatch?.[1]) {
		return embeddedMatch[1];
	}

	const watchMatch = trimmed.match(/\/([a-f0-9]{32})\/watch(?:\/|$|\?)/i);
	if (watchMatch?.[1]) {
		return watchMatch[1];
	}

	return null;
}

export function buildStreamEmbedUrl(playbackId: string, startSeconds = 0): string {
	const base = `https://iframe.cloudflarestream.com/${playbackId}`;
	if (startSeconds <= 0) {
		return base;
	}

	return `${base}?time=${Math.max(0, Math.floor(startSeconds))}`;
}

function parseWebhookSignatureHeader(
	signatureHeader: string
): { timestamp: number; signature: string } | null {
	const parts = signatureHeader
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	let timestamp = 0;
	let signature = '';

	for (const part of parts) {
		const [key, value] = part.split('=', 2);
		if (key === 'time') timestamp = Number.parseInt(value, 10);
		if (key === 'sig1') signature = value || '';
	}

	return timestamp && signature ? { timestamp, signature } : null;
}

function signHmacSha256Hex(secret: string, payload: string): string {
	return createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;

	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

export async function verifyStreamWebhookSignature(
	signatureHeader: string | null,
	body: string,
	secret: string | undefined
): Promise<boolean> {
	if (!signatureHeader || !secret) return false;

	const parsed = parseWebhookSignatureHeader(signatureHeader);
	if (!parsed) return false;

	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - parsed.timestamp) > WEBHOOK_TIME_TOLERANCE_SECONDS) {
		return false;
	}

	const expected = signHmacSha256Hex(secret, `${parsed.timestamp}.${body}`);
	return timingSafeEqualHex(expected, parsed.signature.toLowerCase());
}
