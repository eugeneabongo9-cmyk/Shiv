import { z } from 'zod';

export const ClerkWebhookEventSchema = z.object({
	type: z.string().min(1),
	data: z.record(z.string(), z.unknown())
});

export type ClerkWebhookEvent = z.infer<typeof ClerkWebhookEventSchema>;
