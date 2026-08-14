import { z } from 'zod';

const MAX_VIDEO_SECONDS = 60 * 60 * 12;

export const ModuleProgressSchema = z.object({
	currentSeconds: z.number().min(0).max(MAX_VIDEO_SECONDS),
	durationSeconds: z.number().min(0).max(MAX_VIDEO_SECONDS).nullable().optional(),
	completed: z.boolean().default(false)
});

export type ModuleProgressBody = z.infer<typeof ModuleProgressSchema>;
