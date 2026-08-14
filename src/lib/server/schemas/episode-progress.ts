import { z } from 'zod';

const MAX_VIDEO_SECONDS = 60 * 60 * 12;

export const EpisodeProgressSchema = z.object({
	currentSeconds: z.number().min(0).max(MAX_VIDEO_SECONDS).default(0),
	durationSeconds: z.number().min(0).max(MAX_VIDEO_SECONDS).nullable().optional(),
	completed: z.boolean().default(false)
});

export type EpisodeProgressBody = z.infer<typeof EpisodeProgressSchema>;
