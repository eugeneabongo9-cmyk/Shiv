import { describe, expect, it } from 'vitest';
import { nextCompletedAt } from './completion';

describe('nextCompletedAt', () => {
	it('sets completion on first completed save', () => {
		expect(nextCompletedAt(true, null, 1_000)).toBe(1_000);
	});

	it('keeps the original completed_at when completed again', () => {
		expect(nextCompletedAt(true, 500, 1_000)).toBe(500);
	});

	it('does not clear completed_at on incomplete progress saves', () => {
		expect(nextCompletedAt(false, 500, 1_000)).toBe(500);
		expect(nextCompletedAt(false, null, 1_000)).toBeNull();
	});
});
