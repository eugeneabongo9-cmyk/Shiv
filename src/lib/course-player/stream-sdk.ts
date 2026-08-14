const STREAM_SDK_SRC = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
const STREAM_SDK_ATTR = 'data-cf-stream-sdk';

export type CloudflareStreamPlayer = {
	addEventListener: (event: string, listener: (...args: unknown[]) => void) => void;
	removeEventListener?: (event: string, listener: (...args: unknown[]) => void) => void;
	currentTime: number;
	duration: number;
	ended?: boolean;
};

type StreamFactory = (iframe: HTMLIFrameElement) => CloudflareStreamPlayer;

declare global {
	interface Window {
		Stream?: StreamFactory;
	}
}

export function isCloudflareStreamEmbedUrl(url: string | null | undefined): boolean {
	if (!url) return false;
	try {
		const host = new URL(url).hostname.toLowerCase();
		return (
			host === 'iframe.cloudflarestream.com' ||
			host === 'embed.cloudflarestream.com' ||
			host.endsWith('.cloudflarestream.com') ||
			host === 'videodelivery.net' ||
			host.endsWith('.videodelivery.net')
		);
	} catch {
		return false;
	}
}

export async function loadCloudflareStreamSdk(): Promise<StreamFactory> {
	if (typeof window === 'undefined') {
		throw new Error('Cloudflare Stream SDK requires a browser environment.');
	}

	if (typeof window.Stream === 'function') {
		return window.Stream;
	}

	const existing = document.querySelector<HTMLScriptElement>(`script[${STREAM_SDK_ATTR}]`);
	if (existing) {
		await new Promise<void>((resolve, reject) => {
			existing.addEventListener('load', () => resolve(), { once: true });
			existing.addEventListener('error', () => reject(new Error('Stream SDK failed to load')), {
				once: true
			});
			if (typeof window.Stream === 'function') {
				resolve();
			}
		});
		if (typeof window.Stream !== 'function') {
			throw new Error('Stream SDK loaded without a Stream factory.');
		}
		return window.Stream;
	}

	await new Promise<void>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = STREAM_SDK_SRC;
		script.async = true;
		script.setAttribute(STREAM_SDK_ATTR, 'true');
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Stream SDK failed to load'));
		document.head.appendChild(script);
	});

	if (typeof window.Stream !== 'function') {
		throw new Error('Stream SDK loaded without a Stream factory.');
	}

	return window.Stream;
}
