import { z } from 'zod';

export const SessionRevokeParamsSchema = z.object({
	sessionId: z.string().trim().min(1, 'sessionId is required')
});

export type SessionRevokeParams = z.infer<typeof SessionRevokeParamsSchema>;
