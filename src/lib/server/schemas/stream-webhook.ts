import { z } from 'zod';

const StreamStatusSchema = z
	.object({
		state: z.string().trim().max(80).optional(),
		errorReasonCode: z.string().trim().max(120).optional(),
		errorReasonText: z.string().trim().max(1000).optional()
	})
	.optional();

export const StreamWebhookPayloadSchema = z.object({
	uid: z
		.string()
		.trim()
		.regex(/^[a-f0-9]{32}$/i),
	readyToStream: z.boolean().optional(),
	status: StreamStatusSchema,
	duration: z.number().finite().nonnegative().optional(),
	size: z.number().finite().nonnegative().optional(),
	thumbnail: z.string().url().max(2000).optional(),
	meta: z.record(z.string(), z.string().max(1000)).optional()
});

export type StreamWebhookPayloadBody = z.infer<typeof StreamWebhookPayloadSchema>;
