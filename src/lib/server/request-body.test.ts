import { describe, expect, it } from 'vitest';
import { readJsonBody, readTextBody, RequestBodyError } from './request-body';

describe('readTextBody', () => {
	it('rejects bodies larger than the configured limit', async () => {
		const body = 'x'.repeat(20);
		const request = new Request('https://example.com', {
			method: 'POST',
			body,
			headers: { 'content-length': String(body.length) }
		});

		await expect(readTextBody(request, 10)).rejects.toMatchObject({
			status: 413
		});
	});

	it('returns the raw text when within limits', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: 'hello'
		});
		await expect(readTextBody(request, 100)).resolves.toBe('hello');
	});
});

describe('readJsonBody', () => {
	it('requires application/json', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: '{"ok":true}',
			headers: { 'content-type': 'text/plain' }
		});

		await expect(readJsonBody(request, 100)).rejects.toMatchObject({
			status: 415
		});
	});

	it('rejects invalid JSON', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: '{not-json',
			headers: { 'content-type': 'application/json' }
		});

		await expect(readJsonBody(request, 100)).rejects.toBeInstanceOf(RequestBodyError);
	});

	it('parses valid JSON payloads', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: '{"email":"member@example.com"}',
			headers: { 'content-type': 'application/json' }
		});

		await expect(readJsonBody(request, 100)).resolves.toEqual({
			email: 'member@example.com'
		});
	});
});
