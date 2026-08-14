<script lang="ts">
	import {
		AlertTriangle,
		ArrowRight,
		Check,
		ChevronDown,
		Crosshair,
		Star,
		Users
	} from 'lucide-svelte';
	import CourseThumbnail from '$lib/components/CourseThumbnail.svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import HeroStreamBanner from '$lib/components/HeroStreamBanner.svelte';
	import TrailerModal from '$lib/components/TrailerModal.svelte';
	import TrailerTile from '$lib/components/TrailerTile.svelte';
	import {
		LANDING_ABOUT_CRAIG,
		LANDING_BETA_DISCLAIMER,
		LANDING_BRONZE_BENEFITS,
		LANDING_BRONZE_WAS_PRICE,
		LANDING_COURSE_COUNT,
		LANDING_CRAIG_PHOTO_SRC,
		LANDING_CURRICULUM,
		LANDING_CURRICULUM_PLACEHOLDER_SRC,
		LANDING_FAQS,
		LANDING_HERO_POSTER_SRC,
		LANDING_HERO_VIDEO_SRC,
		LANDING_OUTCOMES,
		LANDING_ROADSHOW_LIBRARY_HREF,
		LANDING_ROADSHOW_POSTER_SRC,
		LANDING_ROADSHOW_TRAILER_SRC,
		LANDING_TESTIMONIALS,
		LANDING_VIP_BENEFITS,
		LANDING_VIP_WAS_PRICE
	} from '$lib/constants/landing';
	import { getActiveBronzeTier, VIP_TIER } from '$lib/constants/pricing';
	import { SITE_NAME, WC_CHECKOUT_URLS } from '$lib/constants/site';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let polledCounts = $state<{ bronze: number; vip: number; total: number } | null>(null);
	let openFaq = $state<number | null>(null);
	let activeTrailer = $state<{ videoSrc: string; title: string } | null>(null);

	function openTrailer(videoSrc: string, title: string) {
		activeTrailer = { videoSrc, title };
	}

	function closeTrailer() {
		activeTrailer = null;
	}

	const counts = $derived(polledCounts ?? data.memberCounts);
	const bronzeSold = $derived(counts.bronze);
	const vipSold = $derived(counts.vip);
	const activeBronze = $derived(getActiveBronzeTier(bronzeSold));
	const bronzePrice = $derived(activeBronze?.tier.price ?? 249);
	const bronzeCap = $derived(activeBronze?.tier.spotCapCumulative ?? 1000);
	const bronzeProgress = $derived(Math.min(100, Math.round((bronzeSold / bronzeCap) * 100)));
	const vipProgress = $derived(Math.min(100, Math.round((vipSold / VIP_TIER.totalSpots) * 100)));
	const curriculumHref = $derived(data.user?.accessStatus === 'active' ? '/library' : '/signup');
	const roadshowHref = $derived(
		data.user?.accessStatus === 'active' ? LANDING_ROADSHOW_LIBRARY_HREF : '/signup'
	);
	const roadshowEpisodeLabel = $derived(
		data.user?.accessStatus === 'active'
			? 'Watch full episode'
			: 'Watch full episode as a Founding Member'
	);
	const showFoundingCta = $derived(data.user?.tier !== 'bronze' && data.user?.tier !== 'vip');

	const POLL_INTERVAL_MS = 60_000;

	async function fetchCounts() {
		try {
			const res = await fetch('/api/members');
			if (!res.ok) return;
			const json = (await res.json()) as { bronze: number; vip: number; total: number };
			if (typeof json.total === 'number') polledCounts = json;
		} catch {
			// Non-fatal
		}
	}

	function toggleFaq(index: number) {
		openFaq = openFaq === index ? null : index;
	}

	$effect(() => {
		fetchCounts();
		const timer = setInterval(fetchCounts, POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>{SITE_NAME} — Craig Douglas's complete ECQC curriculum, online.</title>
	<meta
		name="description"
		content="Train for the fight that actually happens. Craig Douglas's complete ECQC curriculum on demand — courses, entertainment, live sessions, and a private practitioner community."
	/>
</svelte:head>

<div class="landing-page">
	<section class="hero" id="top">
		<div class="container hero-grid">
			<div class="hero-copy">
				<h1>Train for the fight that <em>actually happens.</em></h1>
				<p class="hero-sub">
					Craig Douglas's complete ECQC curriculum, on demand. Managing unknown contacts, entangled
					shooting, weapon retention — the close-quarter reality the range never prepares you for.
					Courses, entertainment, live sessions with Craig, and a private practitioner community.
				</p>
				<div class="hero-cta">
					{#if data.user?.accessStatus === 'active'}
						<a class="btn-primary" href="/dashboard">
							Go to dashboard
							<ArrowRight size={16} />
						</a>
					{:else}
						<a class="btn-primary" href="#access">
							Become a founding member
							<ArrowRight size={16} />
						</a>
						<a class="btn-secondary" href="#curriculum">Explore the curriculum</a>
					{/if}
				</div>
				<div class="hero-meta">
					<div class="hero-meta-item">
						<span class="v">{LANDING_COURSE_COUNT}</span>
						<span class="l">Course blocks</span>
					</div>
					<div class="hero-meta-item">
						<span class="v">{bronzeSold}+</span>
						<span class="l">Founding members</span>
					</div>
					<div class="hero-meta-item">
						<span class="v">${bronzePrice}</span>
						<span class="l">Lifetime, founding price</span>
					</div>
				</div>
			</div>
			<div class="hero-media">
				{#if LANDING_HERO_VIDEO_SRC}
					<HeroStreamBanner
						videoSrc={LANDING_HERO_VIDEO_SRC}
						posterSrc={LANDING_HERO_POSTER_SRC}
						label="Watch the ShivWorks Network trailer"
						onExpand={() => openTrailer(LANDING_HERO_VIDEO_SRC, 'ShivWorks Network trailer')}
					/>
				{:else}
					<TrailerTile
						posterSrc={LANDING_HERO_POSTER_SRC}
						label="Watch the ShivWorks trailer"
						class="trailer-tile-hero"
						tape="// Watch the trailer"
					/>
				{/if}
			</div>
		</div>
		{#if showFoundingCta}
			<div class="container section-cta hero-section-cta">
				<a class="btn-primary" href="#access">
					Become a founding member
					<ArrowRight size={16} />
				</a>
			</div>
		{/if}
	</section>

	<section class="section-block">
		<div class="container">
			<div class="section-heading">
				<p class="eyebrow">The gap</p>
				<h2>Your training happens at distance. Real violence happens at arm's reach.</h2>
			</div>
			<div class="grid-3">
				<article class="panel feature-card">
					<div class="feature-icon"><Crosshair size={22} /></div>
					<h3>The range-reality gap</h3>
					<p>
						You train square-range fundamentals at seven yards. Predators close the distance, grab,
						and never give you the shot you practiced.
					</p>
				</article>
				<article class="panel feature-card">
					<div class="feature-icon"><AlertTriangle size={22} /></div>
					<h3>The freeze fear</h3>
					<p>
						At 2 AM, you wonder if any of it would actually work — or if you'd lock up the moment it
						got physical.
					</p>
				</article>
				<article class="panel feature-card">
					<div class="feature-icon"><Users size={22} /></div>
					<h3>The entanglement problem</h3>
					<p>
						Most violence involves grappling. If you've never trained your gun, your hands, and your
						base in the clinch, you've never trained for it at all.
					</p>
				</article>
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="padding-top:0;">
		<div class="container">
			<div class="section-heading">
				<p class="eyebrow brass">The outcome</p>
				<h2>Walk out situationally aware, physically prepared, and mentally ready.</h2>
			</div>
			<div class="grid-3">
				{#each LANDING_OUTCOMES as outcome (outcome.key)}
					<article class="panel transform-card">
						<div class="transform-photo">
							<img src={outcome.imageSrc} alt={outcome.imageAlt} loading="lazy" />
						</div>
						<div class="transform-body">
							<p class="l">{outcome.label}</p>
							<p>{outcome.copy}</p>
						</div>
					</article>
				{/each}
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="border-top:1px solid var(--color-border);" id="curriculum">
		<div class="container">
			<div class="row-header">
				<div>
					<p class="eyebrow">The curriculum</p>
					<h2>The complete ShivWorks curriculum — in release order.</h2>
				</div>
				<a class="ghost-link" href={curriculumHref}>
					View full roadmap
					<ArrowRight size={16} />
				</a>
			</div>
			<div class="course-grid">
				{#each LANDING_CURRICULUM as course (course.number)}
					<article class="panel course-card">
						<CourseThumbnail
							posterSrc={course.posterSrc ??
								(course.launchAvailable ? LANDING_CURRICULUM_PLACEHOLDER_SRC : undefined)}
							placeholderSrc={LANDING_CURRICULUM_PLACEHOLDER_SRC}
							label={course.trailerVideoSrc ? `Watch trailer for ${course.title}` : course.title}
							comingSoon={!course.launchAvailable}
							onPlay={course.trailerVideoSrc
								? () => openTrailer(course.trailerVideoSrc!, course.title)
								: undefined}
						/>
						<div class="course-card-body">
							<div class="course-card-top">
								<span class="idx">{course.number}</span>
								{#if course.preview}
									<span class="tag accent">Preview</span>
								{:else if course.launchAvailable}
									<span class="tag accent">Available now</span>
								{:else if course.vip}
									<span class="tag brass">VIP</span>
								{:else}
									<span class="tag muted">Member</span>
								{/if}
							</div>
							<h3>{course.title}</h3>
							<a class="ghost-link" href={curriculumHref}>
								View details
								<ArrowRight size={16} />
							</a>
						</div>
					</article>
				{/each}
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="border-top:1px solid var(--color-border);" id="roadshow">
		<div class="container">
			<div class="section-heading">
				<p class="eyebrow brass">Beyond the curriculum</p>
				<h2>The Roadshow Series</h2>
				<p>
					A docu-series following Craig Douglas and the ShivWorks team on the road — the people,
					places, and training culture behind ECQC.
				</p>
			</div>
			<div class="panel roadshow-trailer-card">
				<TrailerTile
					posterSrc={LANDING_ROADSHOW_POSTER_SRC}
					label="Watch The Roadshow Series trailer"
					class="trailer-tile-roadshow"
					tape="// Watch the trailer"
					onPlay={() => openTrailer(LANDING_ROADSHOW_TRAILER_SRC, 'The Roadshow Series trailer')}
				/>
				<div class="roadshow-trailer-copy">
					<span class="tag brass">Docu-series</span>
					<strong>Included with every founding membership</strong>
					<a class="ghost-link" href={roadshowHref}>
						{roadshowEpisodeLabel}
						<ArrowRight size={16} />
					</a>
				</div>
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="border-top:1px solid var(--color-border);" id="access">
		<div class="container">
			<div class="section-heading">
				<p class="eyebrow">Founding member access</p>
				<h2>The price moves with the spots, not a deadline.</h2>
				<p>
					Each tier fills, then the price steps up. A one-time, lifetime purchase. Once the founding
					window closes, it's gone.
				</p>
			</div>
			<div class="pricing-grid">
				<article class="panel price-card featured">
					<div class="price-head">
						<MembershipBadge tier="bronze" />
						<h3>Founding Member</h3>
					</div>
					<div class="price-amount">
						<span class="now">${bronzePrice}</span>
						<span class="was">${LANDING_BRONZE_WAS_PRICE}</span>
					</div>
					<ul class="price-list">
						{#each LANDING_BRONZE_BENEFITS as benefit (benefit)}
							<li><Check size={16} /> {benefit}</li>
						{/each}
					</ul>
					<div class="spots">
						<div class="spots-row">
							<span>{activeBronze?.tier.label ?? 'Tier 2'} · Founding pricing</span>
							<span>{bronzeSold} / {bronzeCap} sold</span>
						</div>
						<div class="progress-track">
							<div class="progress-fill" style:width="{bronzeProgress}%"></div>
						</div>
					</div>
					<a class="btn btn-primary" style="width:100%;" href={WC_CHECKOUT_URLS.bronze}
						>Claim Bronze access</a
					>
				</article>

				<article class="panel price-card">
					<div class="price-head">
						<MembershipBadge tier="vip" />
						<h3>Founding Member</h3>
					</div>
					<div class="price-amount">
						<span class="now">${VIP_TIER.price}</span>
						<span class="was">${LANDING_VIP_WAS_PRICE}</span>
					</div>
					<ul class="price-list">
						{#each LANDING_VIP_BENEFITS as benefit (benefit)}
							<li><Check size={16} /> {benefit}</li>
						{/each}
					</ul>
					<div class="spots">
						<div class="spots-row">
							<span>{VIP_TIER.totalSpots} VIP seats total</span>
							<span>{vipSold} / {VIP_TIER.totalSpots} sold</span>
						</div>
						<div class="progress-track">
							<div class="progress-fill" style:width="{vipProgress}%"></div>
						</div>
					</div>
					<a class="btn btn-secondary" style="width:100%;" href={WC_CHECKOUT_URLS.vip}
						>Claim VIP access</a
					>
				</article>
			</div>
			<p class="beta-disclaimer">{LANDING_BETA_DISCLAIMER}</p>
		</div>
	</section>

	<section class="section-block" style="border-top:1px solid var(--color-border);" id="about-craig">
		<div class="container">
			<div class="about-craig panel">
				<div class="about-craig-photo">
					<img
						src={LANDING_CRAIG_PHOTO_SRC}
						alt="Craig Douglas, founder of ShivWorks"
						loading="lazy"
						decoding="async"
					/>
				</div>
				<div class="about-craig-copy">
					<p class="eyebrow brass">{LANDING_ABOUT_CRAIG.eyebrow}</p>
					<h2>{LANDING_ABOUT_CRAIG.headline}</h2>
					<p>{LANDING_ABOUT_CRAIG.lede}</p>
					<p>{LANDING_ABOUT_CRAIG.body}</p>
					<ul class="about-craig-credentials">
						{#each LANDING_ABOUT_CRAIG.credentials as credential (credential)}
							<li><Check size={16} /> {credential}</li>
						{/each}
					</ul>
				</div>
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="border-top:1px solid var(--color-border);" id="proof">
		<div class="container">
			<div class="section-heading">
				<p class="eyebrow brass">Proof</p>
				<h2>What ECQC graduates say after the hardest class they've taken.</h2>
			</div>
			<div class="grid-3">
				{#each LANDING_TESTIMONIALS as testimonial (testimonial.name)}
					<article class="panel quote-card">
						<div class="stars" aria-hidden="true">
							{#each Array(5) as _, index (index)}
								<Star size={14} fill="currentColor" />
							{/each}
						</div>
						<blockquote>"{testimonial.quote}"</blockquote>
						<div class="quote-author">
							<span class="n">{testimonial.name}</span>
							<span class="b">{testimonial.badge} · Verified</span>
						</div>
					</article>
				{/each}
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="border-top:1px solid var(--color-border);" id="faq">
		<div class="container">
			<div class="section-heading">
				<p class="eyebrow">Questions</p>
				<h2>Before you claim a spot.</h2>
			</div>
			<div class="faq-list">
				{#each LANDING_FAQS as faq, index (faq.question)}
					<div class="faq-item" class:open={openFaq === index}>
						<button type="button" class="faq-q" onclick={() => toggleFaq(index)}>
							<span>{faq.question}</span>
							<ChevronDown size={18} />
						</button>
						<div class="faq-a">
							<p>{faq.answer}</p>
						</div>
					</div>
				{/each}
			</div>
			{#if showFoundingCta}
				<div class="section-cta">
					<a class="btn-primary" href="#access">
						Become a founding member
						<ArrowRight size={16} />
					</a>
				</div>
			{/if}
		</div>
	</section>

	<section class="section-block" style="padding-top:0;">
		<div class="container">
			<div class="closing">
				<p class="eyebrow" style="justify-content:center;">Founding window open</p>
				<h2>Don't wonder. Train.</h2>
				<p>Lock in lifetime founding member access before the price goes up.</p>
				<a class="btn-primary" href="#access">
					Become a founding member
					<ArrowRight size={16} />
				</a>
			</div>
		</div>
	</section>
</div>

{#if activeTrailer}
	<TrailerModal
		videoSrc={activeTrailer.videoSrc}
		title={activeTrailer.title}
		onClose={closeTrailer}
	/>
{/if}
