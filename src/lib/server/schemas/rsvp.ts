import { z } from 'zod';

export const RsvpBodySchema = z.object({
	status: z.enum(['going', 'interested', 'cancelled']).default('going')
});

export type RsvpBody = z.infer<typeof RsvpBodySchema>;
