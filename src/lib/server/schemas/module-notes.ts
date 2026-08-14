import { z } from 'zod';
import { sanitizeMultilineText } from '$lib/server/text-sanitize';

export const ModuleNotesSchema = z.object({
	body: z.string().max(8000).transform(sanitizeMultilineText)
});
