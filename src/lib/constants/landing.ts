import { LANDING_VIDEOS } from '$lib/constants/videos';

export interface LandingCurriculumItem {
	number: string;
	title: string;
	preview?: boolean;
	vip?: boolean;
	/** Self-hosted MP4 — plays in the landing page video modal. */
	trailerVideoSrc?: string;
	/** Static poster image shown on the landing page trailer tile. */
	posterSrc?: string;
	/** Shown on launch tiles for the first curriculum blocks that ship with content. */
	launchAvailable?: boolean;
}

export interface LandingTestimonial {
	quote: string;
	name: string;
	badge: string;
}

export interface LandingFaqItem {
	question: string;
	answer: string;
}

export interface LandingOutcomeItem {
	key: 'aware' | 'physical' | 'mental';
	label: string;
	title: string;
	copy: string;
	imageSrc: string;
	imageAlt: string;
}

/** Target course block count — curriculum list updates when Aaron shares final order. */
export const LANDING_COURSE_COUNT = 12;

/** Shared placeholder for curriculum blocks 4–12 until Aaron delivers the asset. */
export const LANDING_CURRICULUM_PLACEHOLDER_SRC = '/landing/course-placeholder.jpg';

export const LANDING_CRAIG_PHOTO_SRC = '/landing/craig-portrait.png';

/** Cloudflare Stream embed URLs for landing page trailers (set once videos are uploaded). */
export const LANDING_HERO_VIDEO_SRC = LANDING_VIDEOS.hero;
export const LANDING_HERO_POSTER_SRC = '/landing/trailers/hero.jpg';
export const LANDING_ROADSHOW_TRAILER_SRC = LANDING_VIDEOS.roadshowTrailer;
/** @deprecated Use LANDING_ROADSHOW_TRAILER_SRC */
export const LANDING_ROADSHOW_VIDEO_SRC = LANDING_ROADSHOW_TRAILER_SRC;
export const LANDING_ROADSHOW_POSTER_SRC = '/landing/trailers/roadshow.jpg';
export const LANDING_ROADSHOW_LIBRARY_HREF =
	'/library/the-roadshow?module=module_roadshow_episode_1';

export const LANDING_BRONZE_BENEFITS = [
	'10+ complete training courses',
	'Bi-monthly livestreams with Craig',
	'Private community access',
	'Training knife',
	'20% off in-person courses',
	'25% off ShivWorks cutlery',
	'All future content included'
] as const;

export const LANDING_VIP_BENEFITS = [
	'Everything in Bronze, plus:',
	'Ticket to ShivWorks Games',
	'4-hour in-person MUC block',
	'4 Zoom calls with Craig over 2 years',
	'Clinch Pick Knife ($180 value)',
	'Priority in-person booking',
	'VIP community badge'
] as const;

export const LANDING_BETA_DISCLAIMER =
	'The ShivWorks Network is currently in beta. Founding Members are joining during an early build phase — the full curriculum, community features, and platform continue to ship on a rolling basis. Your lifetime access includes everything as it releases.';

export const LANDING_ABOUT_CRAIG = {
	eyebrow: 'About Craig',
	headline: 'Built by the instructor who defined close-quarters training.',
	lede: 'Craig Douglas (SouthNarc) founded ShivWorks after 21 years in law enforcement — most of it in narcotics and SWAT. Since 2003 he has taught entangled shooting and contact management globally: nearly every U.S. state, nine foreign countries, federal and local agencies, and special-operations units.',
	body: 'Extreme Close Quarters Concepts is the hardest class most students have taken — and the one they say changed how they train. The Network brings that same curriculum online: structured, on demand, and built for practitioners who need more than square-range repetition.',
	credentials: [
		'21 years law enforcement (narcotics & SWAT)',
		'ShivWorks founder since 2003',
		'ECQC taught in 49 states and 9 countries'
	] as const
} as const;

export const LANDING_OUTCOMES: LandingOutcomeItem[] = [
	{
		key: 'aware',
		label: 'Situationally aware',
		title: 'Aware',
		copy: 'Recognize pre-assault indicators and manage unknown contacts before violence ever begins.',
		imageSrc: '/landing/outcome/aware.png',
		imageAlt: 'Instructors demonstrating contact management during outdoor ShivWorks training'
	},
	{
		key: 'physical',
		label: 'Physically prepared',
		title: 'Physical',
		copy: 'Train weapon access, retention, and empty-hand skills under real, resisting pressure.',
		imageSrc: '/landing/outcome/physical.png',
		imageAlt: 'Students training grounded grappling while instructors observe on an outdoor range'
	},
	{
		key: 'mental',
		label: 'Mentally ready',
		title: 'Mental',
		copy: "Know exactly what you'd do. No more 2 AM doubt about whether you could protect what matters.",
		imageSrc: '/landing/outcome/mental.png',
		imageAlt: 'ShivWorks student recovering after an intense training evolution outdoors'
	}
];

/** Release order from orderofcourses.pdf — first three ship at launch. */
export const LANDING_CURRICULUM: LandingCurriculumItem[] = [
	{
		number: '01',
		title: 'ShivWorks Origin Story',
		launchAvailable: true,
		trailerVideoSrc: LANDING_VIDEOS.originStoryTrailer || undefined,
		posterSrc: '/landing/trailers/origin-story.jpg'
	},
	{
		number: '02',
		title: 'Criminal Assault Paradigm (CAP)',
		launchAvailable: true,
		trailerVideoSrc: LANDING_VIDEOS.capTrailer || undefined,
		posterSrc: '/landing/trailers/cap.jpg'
	},
	{
		number: '03',
		title: 'Managing Unknown Contacts (MUC)',
		preview: true,
		launchAvailable: true,
		trailerVideoSrc: LANDING_VIDEOS.mucTrailer || undefined,
		posterSrc: '/landing/trailers/muc.jpg'
	},
	{ number: '04', title: 'Seizing Initiative' },
	{ number: '05', title: 'Lost Initiative and the Default Position' },
	{
		number: '06',
		title: 'The Base of and Strategy For Wrestling in a Weapons Based Environment'
	},
	{
		number: '07',
		title: 'ShivWorks Handgun In-Fight Weapons Access (IFWA) — Standing and Grounded',
		vip: true
	},
	{ number: '08', title: 'ShivWorks Entangled Shooting — Live Fire Module', vip: true },
	{ number: '09', title: 'ShivWorks Edged Weapons Overview' },
	{ number: '10', title: 'Grounded Strategy for a Weapons Based Environment' },
	{
		number: '11',
		title: 'ShivWorks Handgun Retention, Recovery, and Disarming',
		vip: true
	},
	{ number: '12', title: 'ShivWorks Product-Specific Training' }
];

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
	{
		quote:
			'This ENTIRE class was phenomenal. Craig and Brian teach to the level of the student. Best class I have ever taken.',
		name: 'Heather H.',
		badge: 'ECQC Graduate, Idaho'
	},
	{
		quote:
			'In 18+ years in law enforcement, I have never taken a better class. It focuses on challenges few other classes address realistically.',
		name: 'Chip T.',
		badge: '18-Year LE Professional'
	},
	{
		quote:
			'One of the best courses in my 27-year Army career, majority in Special Forces. No wasted time. I am retraining my pistol draw from this.',
		name: 'Paul F.',
		badge: '27-Year Army, Special Forces'
	},
	{
		quote:
			'Taking this course was one of the best decisions I have ever made. You leave with invaluable knowledge and confidence.',
		name: 'Alice M.',
		badge: 'ECQC Graduate, Florida'
	},
	{
		quote:
			'After 30+ self-defense classes in two years, ECQC stands out. I know of none better than ECQC with Craig and Brian.',
		name: 'Nikolaus T.',
		badge: '30+ Tactical Classes'
	},
	{
		quote:
			'The program attracts really great people. Thank you for sharing your knowledge so skillfully.',
		name: 'Jenn L.',
		badge: 'BJJ Instructor, Washington'
	}
];

export const LANDING_FAQS: LandingFaqItem[] = [
	{
		question: 'What is the ShivWorks Network?',
		answer:
			"Craig Douglas's complete ECQC curriculum, on demand. Courses, entertainment, live sessions with Craig, and a private practitioner community."
	},
	{
		question: 'When do I get access?',
		answer:
			'Founding Members receive access as the platform ships. Curriculum modules, live sessions, and community features roll out on a continuous release schedule — your dashboard shows what is live today.'
	},
	{
		question: "I've already taken ECQC in person. Is this for me?",
		answer:
			'Yes. The Network deepens and structures what you trained live. Many alumni use it to revisit specific concepts between courses.'
	},
	{
		question: 'Is this beginner-friendly?',
		answer:
			'Yes. The curriculum builds from foundations to advanced application. No prior martial arts or shooting background required.'
	},
	{
		question: 'How does Founding Member pricing work?',
		answer:
			'The price moves with spots, not a deadline. Each tier fills, then the price moves up. Once the founding window closes, founding pricing is gone.'
	},
	{
		question: 'Are purchases refundable?',
		answer: `Founding Member access is a one-time lifetime purchase. Purchases are final. Questions before buying: network@shivworks.com.`
	}
];

export const LANDING_BRONZE_WAS_PRICE = 499;
export const LANDING_VIP_WAS_PRICE = 999;
