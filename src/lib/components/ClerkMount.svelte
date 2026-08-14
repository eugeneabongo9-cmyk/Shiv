<script lang="ts">
	import { browser } from '$app/environment';

	import { onMount } from 'svelte';

	import { loadBrowserClerk } from '$lib/client/clerk';

	import { SUPPORT_EMAIL } from '$lib/constants/site';

	interface Props {
		mode: 'signIn' | 'signUp' | 'userProfile';

		publishableKey?: string | null;

		fallbackRedirectUrl?: string;

		forceRedirectUrl?: string;

		initialEmail?: string | null;
	}

	let {
		mode,

		publishableKey = null,

		fallbackRedirectUrl = '/dashboard',

		forceRedirectUrl,

		initialEmail = null
	}: Props = $props();

	let host = $state<HTMLDivElement | null>(null);

	const missingConfigurationMessage =
		'Authentication is not configured for this environment yet. Add the Clerk public key to the ShivWorks Pages environment and refresh.';

	function getInitialMountError() {
		return publishableKey ? null : missingConfigurationMessage;
	}

	let mountError = $state<string | null>(getInitialMountError());

	const sharedVariables = {
		colorPrimary: '#bc1313',

		colorPrimaryForeground: '#ffffff',

		colorBackground: '#0e0e0e',

		colorNeutral: 'rgba(255, 255, 255, 0.12)',

		colorForeground: '#f0f0f0',

		colorMuted: 'rgba(255, 255, 255, 0.04)',

		colorMutedForeground: '#909090',

		colorInput: '#0a0a0a',

		colorInputForeground: '#f0f0f0',

		colorBorder: 'rgba(188, 19, 19, 0.18)',

		colorRing: 'rgba(188, 19, 19, 0.32)',

		fontFamily: "'Industry', 'Inter', 'Helvetica Neue', Arial, sans-serif",

		fontFamilyButtons: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",

		borderRadius: '4px'
	} as const;

	const sharedElements = {
		rootBox: {
			width: '100%'
		},

		card: {
			background: 'linear-gradient(180deg, rgba(16, 16, 16, 0.98), rgba(10, 10, 10, 0.98))',

			border: '1px solid rgba(188, 19, 19, 0.14)',

			boxShadow: '0 24px 56px rgba(0, 0, 0, 0.42)'
		},

		headerTitle: {
			color: '#f0f0f0'
		},

		headerSubtitle: {
			color: '#909090'
		},

		formFieldInput: {
			background: '#0a0a0a',

			color: '#f0f0f0',

			border: '1px solid rgba(188, 19, 19, 0.12)'
		},

		formFieldLabel: {
			color: '#c0c0c0'
		},

		dividerText: {
			color: '#787878'
		},

		footerActionText: {
			color: '#787878'
		},

		footerActionLink: {
			color: '#f0f0f0'
		},

		formButtonPrimary: {
			background: 'linear-gradient(180deg, #bc1313, #8b0e0e)',

			color: '#ffffff',

			fontWeight: '700'
		},

		identityPreviewText: {
			color: '#f0f0f0'
		},

		identityPreviewEditButton: {
			color: '#e85a5a',

			fontWeight: '600'
		}
	} as const;

	const authAppearance = {
		layout: {
			socialButtonsVariant: 'blockButton'
		},

		variables: sharedVariables,

		elements: {
			...sharedElements,

			cardBox: {
				width: '100%',

				maxWidth: '26rem',

				marginInline: 'auto'
			},

			socialButtonsBlockButton: {
				background: 'rgba(255, 255, 255, 0.04)',

				border: '1px solid rgba(255, 255, 255, 0.1)',

				color: '#f0f0f0'
			},

			socialButtonsBlockButtonText: {
				color: '#f0f0f0',

				fontWeight: '600'
			},

			socialButtonsProviderIcon: {
				color: '#f0f0f0'
			}
		}
	} as const;

	const profileVariables = {
		...sharedVariables,

		fontFamilyButtons: sharedVariables.fontFamily
	} as const;

	const profileAppearance = {
		variables: profileVariables,

		elements: {
			...sharedElements,

			rootBox: {
				width: '100%',

				alignSelf: 'stretch'
			},

			cardBox: {
				width: '100%',

				maxWidth: '100%',

				marginInline: '0'
			},

			card: {
				...sharedElements.card,

				width: '100%',

				boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)'
			},

			navbar: {
				width: 'auto',

				flexShrink: '0'
			},

			page: {
				flex: '1 1 auto',

				minWidth: '16rem',

				width: '100%'
			},

			pageScrollBox: {
				width: '100%'
			},

			profileSection: {
				width: '100%'
			},

			profileSectionContent: {
				width: '100%'
			},

			profileSectionItemList: {
				width: '100%'
			},

			profileSectionItem: {
				display: 'flex',

				flexWrap: 'wrap',

				alignItems: 'center',

				justifyContent: 'space-between',

				gap: '0.75rem 1rem',

				width: '100%'
			},

			identityPreview: {
				display: 'flex',

				flexWrap: 'wrap',

				alignItems: 'center',

				gap: '0.75rem 1rem',

				width: '100%'
			},

			identityPreviewEditButton: {
				textTransform: 'none',

				letterSpacing: 'normal',

				whiteSpace: 'nowrap',

				marginLeft: 'auto',

				flexShrink: '0',

				position: 'static'
			},

			profileSectionPrimaryButton: {
				textTransform: 'none',

				letterSpacing: 'normal',

				whiteSpace: 'nowrap',

				flexShrink: '0',

				alignSelf: 'center'
			},

			menuButton: {
				textTransform: 'none',

				letterSpacing: 'normal',

				whiteSpace: 'nowrap'
			},

			badge: {
				color: '#f0c8c8',

				backgroundColor: 'rgba(188, 19, 19, 0.22)'
			}
		}
	} as const;

	const appearance = $derived(mode === 'userProfile' ? profileAppearance : authAppearance);

	onMount(() => {
		if (!browser || !host || !publishableKey) return;

		let active = true;
		const mountNode = host;
		let mountedClerk: Awaited<ReturnType<typeof loadBrowserClerk>> | null = null;

		void (async () => {
			try {
				const clerk = await loadBrowserClerk(publishableKey);
				if (!active || !mountNode) return;

				mountedClerk = clerk;
				const initialValues = initialEmail ? { emailAddress: initialEmail } : undefined;

				if (mode === 'signIn') {
					clerk.mountSignIn(mountNode, {
						routing: 'virtual',
						signUpUrl: '/signup',
						fallbackRedirectUrl,
						forceRedirectUrl,
						initialValues,
						appearance
					});
				} else if (mode === 'signUp') {
					clerk.mountSignUp(mountNode, {
						routing: 'virtual',
						signInUrl: '/login',
						fallbackRedirectUrl,
						forceRedirectUrl,
						initialValues,
						appearance
					});
				} else {
					// Virtual routing: no `path` prop (Clerk rejects path + virtual together).
					clerk.mountUserProfile(mountNode, {
						routing: 'virtual',
						appearance
					});
				}
			} catch (error) {
				console.error('Failed to mount Clerk component', error);
				mountError = missingConfigurationMessage;
			}
		})();

		return () => {
			active = false;
			if (mountNode && mountedClerk) {
				if (mode === 'signIn') {
					mountedClerk.unmountSignIn(mountNode);
				} else if (mode === 'signUp') {
					mountedClerk.unmountSignUp(mountNode);
				} else {
					mountedClerk.unmountUserProfile(mountNode);
				}
			} else if (mountNode) {
				mountNode.innerHTML = '';
			}
		};
	});
</script>

{#if mountError}
	<div class="mount-error" role="status" aria-live="polite">
		<p>{mountError}</p>

		<p class="mount-help">
			Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you need access before this environment
			is fully configured.
		</p>
	</div>
{:else}
	<div class:profile-mode={mode === 'userProfile'} class="mount-host" bind:this={host}></div>
{/if}

<style>
	.mount-host {
		width: 100%;
	}

	.mount-error {
		padding: 1rem 1.1rem;

		border-radius: 1rem;

		border: 1px solid rgba(165, 95, 42, 0.35);

		background: rgba(165, 95, 42, 0.08);

		color: var(--color-fg-primary);
	}

	.mount-error p {
		margin: 0;
	}

	.mount-help {
		margin-top: 0.65rem !important;

		color: var(--color-fg-secondary);

		font-size: 0.95rem;
	}

	.mount-help a {
		color: var(--color-accent);
	}

	.mount-host.profile-mode {
		display: block;
	}

	:global(.mount-host.profile-mode .cl-rootBox),
	:global(.mount-host.profile-mode .cl-cardBox),
	:global(.mount-host.profile-mode .cl-card) {
		width: 100%;

		max-width: 100%;
	}

	/*

	 * Site CSS sets `input { width: 100% }`. Inside Clerk rows that collapses content and

	 * stacks action labels letter-by-letter when paired with `max-width: 100%` on buttons.

	 */

	:global(
		.mount-host.profile-mode input:not([type='checkbox']):not([type='radio']):not([type='hidden'])
	) {
		width: auto;

		max-width: none;
	}

	:global(.mount-host.profile-mode button) {
		width: auto;

		max-width: none;
	}
</style>
