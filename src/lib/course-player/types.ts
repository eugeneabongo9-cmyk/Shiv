export type CoursePlayback = {
	title: string;
	playbackType: 'mp4' | 'hls' | 'embed' | 'external';
	url: string;
	embedUrl?: string | null;
	durationSeconds?: number | null;
	captionUrl?: string | null;
	/** Unix seconds when a private Stream token expires (HLS only). */
	expiresAt?: number | null;
};

export type PlaybackProgress = {
	currentSeconds: number;
	durationSeconds: number | null;
	completedAt: number | null;
};
