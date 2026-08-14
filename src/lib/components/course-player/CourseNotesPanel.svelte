<script lang="ts">
	interface Props {
		moduleId: string | null;
		initialBody?: string;
		initialUpdatedAt?: number | null;
		disabled?: boolean;
	}

	let {
		moduleId = null,
		initialBody = '',
		initialUpdatedAt = null,
		disabled = false
	}: Props = $props();

	let noteBody = $state('');
	let lastSavedAt = $state<number | null>(null);
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveMessage = $state<string | null>(null);

	$effect(() => {
		noteBody = initialBody;
		lastSavedAt = initialUpdatedAt;
		saveState = 'idle';
		saveMessage = null;
	});

	function formatSavedAt(timestamp: number | null): string {
		if (!timestamp) {
			return 'Not saved yet';
		}

		return `Last saved ${new Date(timestamp).toLocaleString()}`;
	}

	async function saveNotes() {
		if (!moduleId || disabled) {
			return;
		}

		saveState = 'saving';
		saveMessage = null;

		try {
			const response = await fetch(`/api/library/modules/${moduleId}/notes`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: noteBody })
			});
			const result = await response.json().catch(() => null);
			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Unable to save notes.');
			}

			lastSavedAt = result.data.updatedAt;
			saveState = 'saved';
			saveMessage = 'Notes saved.';
		} catch (error) {
			saveState = 'error';
			saveMessage = error instanceof Error ? error.message : 'Unable to save notes.';
		}
	}
</script>

<div class="panel course-notes-panel">
	<div class="section-heading compact">
		<p class="eyebrow">Private notes</p>
		<h3>Your module notes</h3>
		<p>Only visible on this account. Saved per module.</p>
	</div>

	{#if !moduleId}
		<p class="course-notes-empty">Select a module to write notes.</p>
	{:else if disabled}
		<p class="course-notes-empty">Upgrade access to save private notes for this course.</p>
	{:else}
		<label class="course-notes-field" for="course-module-notes">
			<textarea
				id="course-module-notes"
				rows="6"
				placeholder="Capture drills, reminders, or questions for this module."
				bind:value={noteBody}
			></textarea>
		</label>
		<div class="course-notes-actions">
			<button
				class="btn-secondary"
				type="button"
				disabled={saveState === 'saving'}
				onclick={saveNotes}
			>
				{saveState === 'saving' ? 'Saving…' : 'Save notes'}
			</button>
			<span class="course-notes-meta">{formatSavedAt(lastSavedAt)}</span>
		</div>
		{#if saveMessage}
			<p class:error={saveState === 'error'} class="course-notes-feedback">{saveMessage}</p>
		{/if}
	{/if}
</div>

<style>
	.course-notes-panel {
		padding: 1.2rem;
	}

	.course-notes-field textarea {
		width: 100%;
		min-height: 9rem;
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(209, 178, 122, 0.18);
		background: rgba(255, 255, 255, 0.03);
		color: var(--color-fg-primary);
		font: inherit;
		line-height: 1.55;
		resize: vertical;
	}

	.course-notes-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.85rem;
	}

	.course-notes-meta {
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.course-notes-empty,
	.course-notes-feedback {
		margin: 0;
		color: var(--color-fg-secondary);
	}

	.course-notes-feedback.error {
		color: #f0a6a6;
	}
</style>
