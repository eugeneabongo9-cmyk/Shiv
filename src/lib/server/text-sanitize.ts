/** Strip null bytes and other disallowed control characters from user text. */
export function sanitizeMultilineText(value: string): string {
	let output = '';
	for (const char of value) {
		const code = char.charCodeAt(0);
		const isAllowed =
			code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f);
		if (isAllowed) output += char;
	}
	return output.trim();
}
