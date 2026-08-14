<script lang="ts">
	import ClerkMount from '$lib/components/ClerkMount.svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import ProfileChips from '$lib/components/ProfileChips.svelte';
	import { WC_MY_ACCOUNT_URL } from '$lib/constants/site';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	const profile = $derived(form?.profile ?? data.profile);
	const values = $derived(form?.values ?? null);
	const errors = $derived(form?.errors ?? {});

	const tier = $derived(data.user.tier);
	const isFree = $derived(tier === 'free');
	const memberSinceDate = $derived(new Date(data.user.createdAt));
	const memberSinceLabel = $derived(
		memberSinceDate.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	);
	const memberSinceIso = $derived(memberSinceDate.toISOString().slice(0, 10));

	function accessSourceLabel(sourceType: PageData['accessHistory'][number]['sourceType']): string {
		switch (sourceType) {
			case 'wc':
				return 'WooCommerce purchase';
			case 'import':
				return 'Founding member purchase';
			case 'admin':
				return 'ShivWorks staff grant';
			default:
				return 'ShivWorks access grant';
		}
	}

	function bgValue(key: 'civilian' | 'lawEnforcement' | 'military' | 'medical' | 'other'): boolean {
		if (values?.background) return Boolean(values.background[key]);
		return Boolean(profile?.background?.[key]);
	}

	const ecqcChecked = $derived(values?.ecqcAlumni ?? profile?.ecqcAlumni ?? false);
	const mucChecked = $derived(values?.mucAlumni ?? profile?.mucAlumni ?? false);
	const ewoChecked = $derived(values?.ewoAlumni ?? profile?.ewoAlumni ?? false);
	const showInFinderChecked = $derived(values?.showInFinder ?? profile?.showInFinder ?? true);
	const leaderboardOptInChecked = $derived(
		values?.leaderboardOptIn ?? form?.leaderboardOptIn ?? data.leaderboardOptIn ?? false
	);
	const isComplete = $derived(Boolean(profile?.profileCompletedAt));

	const initials = $derived.by(() => {
		const tokens = data.user.name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
		return tokens.length > 0 ? tokens.map((t) => t[0]?.toUpperCase() ?? '').join('') : 'SW';
	});
</script>

<svelte:head>
	<title>Account | ShivWorks Network</title>
</svelte:head>

<section class="section-block account-page">
	<div class="container settings-shell account-shell">
		<div class="account-layout">
			<div class="panel account-hero">
				<div class="account-hero-main">
					<div class="account-hero-id">
						<span class="account-hero-avatar" aria-hidden="true">{initials}</span>
						<div class="account-hero-copy">
							<h1>{data.user.name}</h1>
							<p>{data.user.email}</p>
						</div>
					</div>
					<div class="account-hero-meta">
						<MembershipBadge tier={data.user.tier} />
						<div class="account-hero-stat">
							<span class="account-hero-stat-label">Member since</span>
							<time class="account-hero-stat-value" datetime={memberSinceIso}>
								{memberSinceLabel}
							</time>
						</div>
					</div>
				</div>

				{#if profile}
					<div class="account-hero-chips">
						<ProfileChips {profile} size="sm" />
					</div>
				{/if}

				<div class="settings-actions account-actions account-actions--compact">
					<a class="btn-secondary" href="#account-identity-console">Sign-in & security</a>
					<a class="btn-secondary" href={WC_MY_ACCOUNT_URL} target="_blank" rel="noreferrer">
						Billing portal
					</a>
					{#if isFree}
						<a class="btn-primary" href="/checkout">Upgrade access</a>
					{/if}
				</div>
			</div>

			<div class="panel account-access-panel">
				<p class="eyebrow">Membership access</p>
				<h2>Access history</h2>
				<p class="account-training-lede">
					This is your in-product access record. Receipts and payment details remain in the billing
					portal.
				</p>
				{#if data.accessHistory.length > 0}
					<div class="list-stack">
						{#each data.accessHistory as entitlement (entitlement.id)}
							<div class="list-card">
								<div class="member-import-head">
									<strong>{entitlement.tier.toUpperCase()} membership</strong>
									<span class="detail-pill" class:muted={entitlement.status !== 'active'}>
										{entitlement.status === 'active' ? 'Active' : 'Revoked'}
									</span>
								</div>
								<p>{accessSourceLabel(entitlement.sourceType)}</p>
								<small>
									Access granted
									{new Date(entitlement.createdAt).toLocaleDateString('en-US', {
										month: 'long',
										day: 'numeric',
										year: 'numeric'
									})}
								</small>
							</div>
						{/each}
					</div>
				{:else}
					<div class="status-message subtle">
						Your current {data.user.tier ?? 'member'} access is active, but no historical grant record
						is available yet.
					</div>
				{/if}
			</div>

			<div class="panel account-training-panel">
				<p class="eyebrow">Training profile</p>
				<h2>Partner finder & dossier</h2>
				<p class="account-training-lede">
					Location, background, and goals power the Training Partner Finder and your member card.
				</p>

				{#if data.welcome && !isComplete}
					<div class="status-message">
						Welcome to the ShivWorks Network. Complete your training profile to earn 20 TP and
						appear in the Training Partner Finder.
					</div>
				{/if}

				{#if form?.error}
					<div class="status-message error">{form.error}</div>
				{/if}
				{#if form?.success}
					<div class="status-message">{form.success}</div>
				{/if}

				<form class="account-training-form" method="POST" action="?/save">
					<section class="training-profile-section" aria-labelledby="training-location-heading">
						<header class="training-profile-section-header">
							<p class="eyebrow">Location</p>
							<h3 id="training-location-heading">Training Partner Finder region</h3>
							<p class="training-profile-section-lede">
								City and state are shown to members searching for partners near them.
							</p>
						</header>
						<div class="form-row two-col">
							<label class="form-field">
								<span>City</span>
								<input
									type="text"
									name="locationCity"
									maxlength="80"
									value={values?.locationCity ?? profile?.locationCity ?? ''}
									aria-invalid={errors.locationCity ? 'true' : undefined}
									required
								/>
								{#if errors.locationCity}
									<small class="field-error">{errors.locationCity}</small>
								{/if}
							</label>
							<label class="form-field">
								<span>State (2-letter)</span>
								<input
									type="text"
									name="locationState"
									maxlength="2"
									placeholder="TX"
									value={values?.locationState ?? profile?.locationState ?? ''}
									aria-invalid={errors.locationState ? 'true' : undefined}
									required
								/>
								{#if errors.locationState}
									<small class="field-error">{errors.locationState}</small>
								{/if}
							</label>
						</div>
					</section>

					<section class="training-profile-section" aria-labelledby="training-background-heading">
						<header class="training-profile-section-header">
							<p class="eyebrow">Background</p>
							<h3 id="training-background-heading">Select all that apply</h3>
						</header>
						{#if errors.background}
							<small class="field-error">{errors.background}</small>
						{/if}
						<div class="choice-grid choice-grid--5" role="group" aria-label="Background">
							<label class="choice-tile">
								<input type="checkbox" name="bg_civilian" checked={bgValue('civilian')} />
								<span class="choice-tile-label">Civilian</span>
							</label>
							<label class="choice-tile">
								<input type="checkbox" name="bg_le" checked={bgValue('lawEnforcement')} />
								<span class="choice-tile-label">Law enforcement</span>
							</label>
							<label class="choice-tile">
								<input type="checkbox" name="bg_military" checked={bgValue('military')} />
								<span class="choice-tile-label">Military</span>
							</label>
							<label class="choice-tile">
								<input type="checkbox" name="bg_medical" checked={bgValue('medical')} />
								<span class="choice-tile-label">Medical</span>
							</label>
							<label class="choice-tile">
								<input type="checkbox" name="bg_other" checked={bgValue('other')} />
								<span class="choice-tile-label">Other</span>
							</label>
						</div>
					</section>

					<section class="training-profile-section" aria-labelledby="training-history-heading">
						<header class="training-profile-section-header">
							<p class="eyebrow">ShivWorks history</p>
							<h3 id="training-history-heading">Alumni & course history</h3>
						</header>
						<div
							class="choice-grid choice-grid--3"
							role="group"
							aria-label="ShivWorks alumni status"
						>
							<label class="choice-tile">
								<input type="checkbox" name="ecqcAlumni" checked={ecqcChecked} />
								<span class="choice-tile-label">ECQC alumni</span>
							</label>
							<label class="choice-tile">
								<input type="checkbox" name="mucAlumni" checked={mucChecked} />
								<span class="choice-tile-label">MUC alumni</span>
							</label>
							<label class="choice-tile">
								<input type="checkbox" name="ewoAlumni" checked={ewoChecked} />
								<span class="choice-tile-label">EWO alumni</span>
							</label>
						</div>

						<div class="training-profile-fields">
							<label class="form-field">
								<span>Other ShivWorks courses completed (optional)</span>
								<textarea
									name="otherCourses"
									rows="2"
									maxlength="1000"
									value={values?.otherCourses ?? profile?.otherCourses ?? ''}
								></textarea>
							</label>

							<label class="form-field">
								<span>Primary carry setup (optional)</span>
								<input
									type="text"
									name="carrySetup"
									maxlength="280"
									value={values?.carrySetup ?? profile?.carrySetup ?? ''}
								/>
							</label>
						</div>
					</section>

					<section class="training-profile-section" aria-labelledby="training-goal-heading">
						<header class="training-profile-section-header">
							<p class="eyebrow">Training goal</p>
							<h3 id="training-goal-heading">What you are training for</h3>
						</header>
						<label class="form-field">
							<span>One sentence</span>
							<input
								type="text"
								name="trainingGoal"
								maxlength="280"
								value={values?.trainingGoal ?? profile?.trainingGoal ?? ''}
								aria-invalid={errors.trainingGoal ? 'true' : undefined}
								required
							/>
							{#if errors.trainingGoal}
								<small class="field-error">{errors.trainingGoal}</small>
							{/if}
						</label>
					</section>

					<section
						class="training-profile-section training-profile-section--visibility"
						aria-labelledby="training-visibility-heading"
					>
						<header class="training-profile-section-header">
							<p class="eyebrow">Visibility</p>
							<h3 id="training-visibility-heading">Who can see you in the network</h3>
						</header>
						<div class="preference-list">
							<label class="preference-row">
								<input type="checkbox" name="showInFinder" checked={showInFinderChecked} />
								<span class="preference-copy">
									<strong>Training Partner Finder</strong>
									<small>
										Other members can find you by state, background, and ECQC status. You stay opted
										in by default — turn off if you need operational security.
									</small>
								</span>
							</label>
							<label class="preference-row">
								<input type="checkbox" name="leaderboardOptIn" checked={leaderboardOptInChecked} />
								<span class="preference-copy">
									<strong>Leaderboard</strong>
									<small>
										Off by default. Your first name and last initial appear ranked by Training
										Points. You can change this any time.
									</small>
								</span>
							</label>
						</div>
					</section>

					<div class="training-profile-footer">
						<button class="btn-primary" type="submit">Save training profile</button>
					</div>
				</form>

				{#if data.welcome && !isComplete}
					<form method="POST" action="?/skip" class="skip-form">
						<button class="ghost-link" type="submit">Skip for now</button>
					</form>
				{/if}
			</div>

			<div id="account-identity-console" class="panel settings-embed-panel account-clerk-panel">
				<div class="settings-embed-header account-clerk-header">
					<p class="eyebrow">Sign-in & security</p>
					<h2>Email, password, and connected accounts</h2>
				</div>

				<div class="settings-clerk-shell account-clerk-shell">
					<ClerkMount
						mode="userProfile"
						publishableKey={data.publicConfig.clerkPublishableKey}
						fallbackRedirectUrl="/account"
					/>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-field span {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-secondary, #a3a3a3);
	}

	.form-field input,
	.form-field textarea {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		padding: 0.55rem 0.7rem;
		color: #fff;
		font: inherit;
	}

	.form-field input[aria-invalid='true'] {
		border-color: #bc1313;
	}

	.skip-form {
		margin-top: 0.5rem;
	}

	.form-row.two-col {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 0.75rem;
	}

	.choice-grid {
		display: grid;
		gap: 0.65rem;
	}

	.choice-grid--3 {
		grid-template-columns: repeat(1, minmax(0, 1fr));
	}

	@media (min-width: 640px) {
		.choice-grid--3 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.choice-grid--5 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (min-width: 640px) {
		.choice-grid--5 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 960px) {
		.choice-grid--5 {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}

	.field-error {
		color: #bc1313;
		font-size: 0.75rem;
	}

	.account-training-form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 0.25rem;
	}

	.training-profile-section {
		padding: 1.1rem 1.05rem;
		border-radius: 0.75rem;
		border: 1px solid rgba(188, 19, 19, 0.14);
		background: rgba(255, 255, 255, 0.02);
	}

	.training-profile-section-header {
		margin-bottom: 0.9rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.training-profile-section-header h3 {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.35;
	}

	.training-profile-section-lede {
		margin: 0.45rem 0 0;
		max-width: 52ch;
		color: var(--color-fg-muted);
		font-size: 0.9rem;
		line-height: 1.55;
	}

	.training-profile-fields {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 0.9rem;
		padding-top: 0.9rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.training-profile-section--visibility .preference-list {
		margin-top: 0;
	}

	.training-profile-footer {
		padding: 0.35rem 0.05rem 0;
	}

	.training-profile-footer :global(.btn-primary) {
		width: 100%;
	}

	.account-layout {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.account-hero-main {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem 1.25rem;
	}

	.account-hero-id {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-width: 0;
	}

	.account-hero-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(188, 19, 19, 0.2);
		font-family: var(--font-mono);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		flex-shrink: 0;
	}

	.account-hero-copy h1 {
		margin: 0 0 0.2rem;
		font-size: clamp(1.35rem, 3vw, 1.75rem);
		line-height: 1.15;
	}

	.account-hero-copy p {
		margin: 0;
		color: var(--color-fg-secondary);
		font-size: 0.95rem;
		overflow-wrap: anywhere;
	}

	.account-hero-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		justify-content: flex-end;
		gap: 0.65rem;
	}

	.account-hero-stat {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.2rem;
		min-width: 9.5rem;
		padding: 0.5rem 0.8rem;
		border-radius: 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		text-align: left;
	}

	.account-hero-stat-label {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.account-hero-stat-value {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--color-fg-secondary);
	}

	.account-hero-chips {
		margin-top: 0.85rem;
	}

	.account-actions--compact {
		margin-top: 1rem;
	}

	.account-training-panel h2 {
		margin: 0 0 0.45rem;
		font-size: 1.2rem;
	}

	.account-training-lede {
		margin: 0 0 1rem;
		color: var(--color-fg-muted);
		font-size: 0.98rem;
		line-height: 1.55;
		max-width: 58ch;
	}

	.account-clerk-header {
		margin-bottom: 0.65rem;
		padding-bottom: 0.75rem;
	}

	.account-clerk-header h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	:global(.account-clerk-shell) {
		min-height: 28rem;
	}
</style>
