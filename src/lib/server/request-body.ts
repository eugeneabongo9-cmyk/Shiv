export class RequestBodyError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
	}
}

function contentLengthExceeds(request: Request, maxBytes: number): boolean {
	const rawLength = request.headers.get('content-length');
	if (!rawLength) return false;
	const parsed = Number.parseInt(rawLength, 10);
	return Number.isFinite(parsed) && parsed > maxBytes;
}

export async function readTextBody(request: Request, maxBytes: number): Promise<string> {
	if (contentLengthExceeds(request, maxBytes)) {
		throw new RequestBodyError('Request body is too large', 413);
	}

	const body = await request.text();
	const bytes = new TextEncoder().encode(body).byteLength;
	if (bytes > maxBytes) {
		throw new RequestBodyError('Request body is too large', 413);
	}

	return body;
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
	const contentType = request.headers.get('content-type') || '';
	if (!contentType.toLowerCase().includes('application/json')) {
		throw new RequestBodyError('Content-Type must be application/json', 415);
	}

	const body = await readTextBody(request, maxBytes);
	try {
		return JSON.parse(body) as unknown;
	} catch {
		throw new RequestBodyError('Invalid JSON body', 400);
	}
}
