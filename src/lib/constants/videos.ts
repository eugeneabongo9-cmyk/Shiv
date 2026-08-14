/**
 * Cloudflare Stream embed URLs for landing page trailers.
 * UIDs from Cloudflare Dashboard → Stream → Video ID.
 */

function streamEmbed(uid: string): string {
	if (!uid) return '';
	return `https://iframe.cloudflarestream.com/${uid}`;
}

const ORIGIN_STORY_TRAILER_STREAM_UID = 'd18c5e8f88b8d64497b4c8b22fd7caf2';
const ORIGIN_STORY_FULL_STREAM_UID = '9d41640818371252d2387bd0fc8a3036';

export const LANDING_VIDEOS = {
	hero: streamEmbed('a6c917be4050c3356df713b33e3e24c3'),
	originStoryTrailer: streamEmbed(ORIGIN_STORY_TRAILER_STREAM_UID),
	originStoryModule: streamEmbed(ORIGIN_STORY_FULL_STREAM_UID),
	capTrailer: streamEmbed('a55b4af68b7e36ae5d2961b38ad86aea'),
	mucTrailer: streamEmbed('bbdd6303ece83add0c3bce8089f1473e'),
	roadshowTrailer: streamEmbed('0495a0d2e4796ada32b5b72c13fb25e5'),
	roadshowEpisode: streamEmbed('9751701a1c41a5112c14994566f990ae')
} as const;

/**
 * MUC chapter Stream UIDs keyed by chapter title.
 * Upload batch ch01–ch11 was mislabeled; these UIDs map each chapter name to the correct footage.
 */
export const MUC_CHAPTER_VIDEOS = [
	{
		number: 1,
		streamUid: '14b1aa4d5c492dc28879747f263dc48a',
		title: 'Chapter 1',
		durationLabel: '01:17'
	},
	{
		number: 2,
		streamUid: 'f81a09d96e3658acc7924b530462a57d',
		title: 'Chapter 2',
		durationLabel: '07:45'
	},
	{
		number: 3,
		streamUid: 'e700eddf0a8953ab34e50e7cd1a8785e',
		title: 'Chapter 3',
		durationLabel: '05:59'
	},
	{
		number: 4,
		streamUid: '3d34eea88881150c3c1586db64e98a57',
		title: 'Chapter 4',
		durationLabel: '03:04'
	},
	{
		number: 5,
		streamUid: 'f135a553bb873a688119b8178828ac21',
		title: 'Chapter 5',
		durationLabel: '14:27'
	},
	{
		number: 6,
		streamUid: '82e6ee2a272a78b22ecb469d1342d257',
		title: 'Chapter 6',
		durationLabel: '08:26'
	},
	{
		number: 7,
		streamUid: 'fe1ab50edcffe26a8b879e2e1ba5eee4',
		title: 'Chapter 7',
		durationLabel: '04:57'
	},
	{
		number: 8,
		streamUid: '73fb8bc39a722f255f898e6f38832094',
		title: 'Chapter 8',
		durationLabel: '04:22'
	},
	{
		number: 9,
		streamUid: 'b41cac7862026e0b326a5540af116075',
		title: 'Chapter 9',
		durationLabel: '08:20'
	},
	{
		number: 10,
		streamUid: 'a0137f0f80123d5860611b07f046a5f7',
		title: 'Chapter 10',
		durationLabel: '04:45'
	},
	{
		number: 11,
		streamUid: '9f92528730574fdfcbbc881d5dc76971',
		title: 'End Summary',
		durationLabel: '02:39'
	}
] as const;
