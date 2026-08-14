import * as Sentry from '@sentry/sveltekit';
import { CLERK_HANDSHAKE_HEADER, CLERK_HANDSHAKE_VALUE } from '$lib/constants/clerk-handshake';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
		environment: import.meta.env.MODE ?? 'development',
		integrations: [Sentry.browserTracingIntegration()]
	});
}

const fallbackHandleError = ({ error }: { error: unknown }) => {
	console.error('[client]', error);
	return { message: error instanceof Error ? error.message : 'Internal Error' };
};

export const handleError = sentryDsn ? Sentry.handleErrorWithSentry() : fallbackHandleError;

/** Complete Clerk session refresh with a full navigation when SPA data loads cannot handshake. */
export function handleFetch({
	request,
	fetch
}: {
	request: Request;
	fetch: typeof globalThis.fetch;
}) {
	return fetch(request).then((response) => {
		if (
			typeof window !== 'undefined' &&
			response.status === 401 &&
			response.headers.get(CLERK_HANDSHAKE_HEADER) === CLERK_HANDSHAKE_VALUE
		) {
			const location = response.headers.get('location');
			if (location) {
				window.location.assign(location);
				return new Promise<Response>(() => {});
			}
		}

		return response;
	});
}
