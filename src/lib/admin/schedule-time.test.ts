import { describe, expect, it } from 'vitest';
import { formatScheduleForEmail, parseDateTimeLocal } from './schedule-time';

describe('admin schedule time helpers', () => {
	it('converts browser-local input using the submitted timezone offset', () => {
		expect(parseDateTimeLocal('2026-08-12T09:30', 120)).toBe(
			Date.parse('2026-08-12T11:30:00.000Z')
		);
		expect(parseDateTimeLocal('2026-08-12T09:30', -300)).toBe(
			Date.parse('2026-08-12T04:30:00.000Z')
		);
	});

	it('rejects malformed values', () => {
		expect(parseDateTimeLocal('not-a-date', 0)).toBeNull();
		expect(parseDateTimeLocal('', 0)).toBeNull();
	});

	it('includes an explicit timezone in email output', () => {
		expect(formatScheduleForEmail(Date.parse('2026-08-12T11:30:00.000Z'))).toContain('UTC');
	});
});
