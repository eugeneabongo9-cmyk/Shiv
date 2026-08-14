import { z } from 'zod';

const WcBillingSchema = z.object({
	email: z.string().trim().email().max(254),
	first_name: z.string().trim().max(120).optional(),
	last_name: z.string().trim().max(120).optional()
});

const WcLineItemSchema = z.object({
	product_id: z.coerce.number().int().positive(),
	name: z.string().trim().max(255).optional(),
	quantity: z.coerce.number().int().positive().max(100).optional().default(1)
});

export const WcOrderSchema = z.object({
	id: z.coerce.number().int().positive(),
	status: z
		.string()
		.trim()
		.toLowerCase()
		.refine((value) =>
			['pending', 'processing', 'completed', 'refunded', 'cancelled', 'failed', 'on-hold'].includes(
				value
			)
		),
	billing: WcBillingSchema,
	line_items: z.array(WcLineItemSchema).min(1).max(100)
});

export type WcOrderBody = z.infer<typeof WcOrderSchema>;
