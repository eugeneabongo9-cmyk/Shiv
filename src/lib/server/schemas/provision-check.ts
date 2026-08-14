import { z } from 'zod';

export const ProvisionCheckSchema = z.object({
	email: z.string().trim().email().max(254)
});

export type ProvisionCheckBody = z.infer<typeof ProvisionCheckSchema>;
