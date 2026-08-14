<!--
  SendMessageButton — launch placeholder.
  Per D-2 (2026-05-31): DM system deferred post-launch. This stub renders a
  disabled-looking button with a "coming soon" hint so /find-partners and
  /profile cards still surface the intent without breaking when clicked. When
  messages ship, swap implementation for Aaron's real link version
  (href = `/messages/${recipientClerkUserId}`).
-->
<script lang="ts">
	import { MessageSquare } from 'lucide-svelte';

	interface Props {
		recipientClerkUserId: string;
		label?: string;
		variant?: 'primary' | 'ghost';
	}

	// recipientClerkUserId accepted for API compatibility with the real component
	// but unused while messaging is a placeholder.
	let {
		recipientClerkUserId: _recipient,
		label = 'Send Message',
		variant = 'ghost'
	}: Props = $props();
</script>

<button
	type="button"
	class="sm-btn"
	class:sm-btn--primary={variant === 'primary'}
	disabled
	title="Direct messages coming soon"
	aria-label="{label} (coming soon)"
>
	<MessageSquare size={14} />
	<span>{label}</span>
	<span class="sm-hint">soon</span>
</button>

<style>
	.sm-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		background: transparent;
		color: rgba(255, 255, 255, 0.5);
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-weight: 600;
		cursor: not-allowed;
	}
	.sm-hint {
		margin-left: 0.2rem;
		padding: 0 0.35rem;
		border-radius: 8px;
		background: rgba(227, 179, 65, 0.15);
		color: #e3b341;
		font-size: 0.6rem;
		font-weight: 700;
	}
</style>
