import { z } from 'zod';
import { sanitizeMultilineText } from '$lib/server/text-sanitize';

export const VipCallRequestSchema = z.object({
	goals: z.string().trim().min(1, 'Goals are required').max(2000).transform(sanitizeMultilineText),
	preferredMonth: z.string().trim().max(100).nullable().optional(),
	notes: z
		.string()
		.trim()
		.max(2000)
		.nullable()
		.optional()
		.transform((value) => (value ? sanitizeMultilineText(value) : value))
});

export type VipCallRequestBody = z.infer<typeof VipCallRequestSchema>;
