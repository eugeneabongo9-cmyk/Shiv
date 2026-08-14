import { z } from 'zod';

export const AdminUploadInitSchema = z.object({
	episodeId: z.string().trim().min(1).max(120).optional(),
	moduleId: z.string().trim().min(1, 'moduleId is required').max(120),
	title: z.string().trim().min(1, 'Title is required').max(180),
	description: z.string().trim().max(2000).optional(),
	episodeNumber: z.number().int().positive().optional(),
	accessTier: z.string().optional(),
	fileName: z.string().trim().max(255).optional(),
	fileType: z.string().trim().max(120).optional(),
	fileSizeBytes: z.number().positive('fileSizeBytes must be a positive number'),
	maxDurationSeconds: z.number().positive().optional(),
	playbackPolicy: z.enum(['private', 'public']).optional()
});

export const AdminUploadCompleteSchema = z.object({
	mediaAssetId: z.string().trim().min(1, 'mediaAssetId is required').max(120),
	episodeId: z.string().trim().min(1).max(120).optional(),
	title: z.string().trim().min(1).max(180).optional(),
	description: z.string().trim().max(2000).nullable().optional(),
	accessTier: z.enum(['free', 'member', 'vip']).optional()
});

export const AdminUploadSyncSchema = z.object({
	mediaAssetId: z.string().trim().min(1, 'mediaAssetId is required').max(120)
});

export type AdminUploadInitBody = z.infer<typeof AdminUploadInitSchema>;
export type AdminUploadCompleteBody = z.infer<typeof AdminUploadCompleteSchema>;
export type AdminUploadSyncBody = z.infer<typeof AdminUploadSyncSchema>;
