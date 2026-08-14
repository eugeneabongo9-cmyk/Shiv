import { describe, expect, it } from 'vitest';
import { sanitizeMultilineText } from './text-sanitize';

describe('sanitizeMultilineText', () => {
	it('removes null bytes and control characters', () => {
		expect(sanitizeMultilineText(' hello\u0000world\u0007 ')).toBe('helloworld');
	});

	it('preserves normal whitespace and newlines', () => {
		expect(sanitizeMultilineText('  line one\nline two  ')).toBe('line one\nline two');
	});
});
