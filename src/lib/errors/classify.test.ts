import { describe, expect, it } from 'vitest';
import { classify } from './classify';
import { ERROR_CODES } from './codes';

describe('classify', () => {
	it('maps HTTP status codes to taxonomy', () => {
		expect(classify(new Error(), 401)).toBe(ERROR_CODES.AUTH_REQUIRED);
		expect(classify(new Error(), 402)).toBe(ERROR_CODES.PAYMENT_REQUIRED);
		expect(classify(new Error(), 403)).toBe(ERROR_CODES.AUTH_FORBIDDEN);
		expect(classify(new Error(), 404)).toBe(ERROR_CODES.NOT_FOUND);
		expect(classify(new Error(), 400)).toBe(ERROR_CODES.INVALID_INPUT);
		expect(classify(new Error(), 422)).toBe(ERROR_CODES.INVALID_INPUT);
		expect(classify(new Error(), 429)).toBe(ERROR_CODES.RATE_LIMITED);
		expect(classify(new Error(), 502)).toBe(ERROR_CODES.UPSTREAM_FAILURE);
		expect(classify(new Error(), 503)).toBe(ERROR_CODES.UPSTREAM_FAILURE);
		expect(classify(new Error(), 504)).toBe(ERROR_CODES.UPSTREAM_FAILURE);
	});

	it('falls back to message sniffing when status is missing', () => {
		expect(classify(new Error('User not found'))).toBe(ERROR_CODES.NOT_FOUND);
		expect(classify(new Error('Rate limit exceeded'))).toBe(ERROR_CODES.RATE_LIMITED);
		expect(classify(new Error('Too many requests'))).toBe(ERROR_CODES.RATE_LIMITED);
		expect(classify(new Error('Unauthorized'))).toBe(ERROR_CODES.AUTH_REQUIRED);
		expect(classify(new Error('Forbidden access'))).toBe(ERROR_CODES.AUTH_FORBIDDEN);
	});

	it('flags upstream-vendor failures as UPSTREAM_FAILURE', () => {
		expect(classify(new Error('WooCommerce API timeout'))).toBe(ERROR_CODES.UPSTREAM_FAILURE);
		expect(classify(new Error('Clerk webhook failed'))).toBe(ERROR_CODES.UPSTREAM_FAILURE);
		expect(classify(new Error('Resend send failure'))).toBe(ERROR_CODES.UPSTREAM_FAILURE);
		expect(classify(new Error('Stream upload failed'))).toBe(ERROR_CODES.UPSTREAM_FAILURE);
	});

	it('falls back to INTERNAL_ERROR for unrecognized errors', () => {
		expect(classify(new Error('something weird'))).toBe(ERROR_CODES.INTERNAL_ERROR);
		expect(classify('a plain string')).toBe(ERROR_CODES.INTERNAL_ERROR);
		expect(classify(null)).toBe(ERROR_CODES.INTERNAL_ERROR);
		expect(classify(undefined)).toBe(ERROR_CODES.INTERNAL_ERROR);
	});

	it('prefers status code over message sniffing', () => {
		// Status 401 wins even though the message would suggest UPSTREAM_FAILURE.
		expect(classify(new Error('WooCommerce error'), 401)).toBe(ERROR_CODES.AUTH_REQUIRED);
	});
});
