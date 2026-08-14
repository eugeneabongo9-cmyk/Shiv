<script lang="ts">
	import { getAudienceLabel } from '$lib/constants/tiers';
	import {
		filterLessons,
		formatPublishedAt,
		lessonStatusLabel,
		lessonStatusPillClass,
		lessonStreamSummary,
		toDateTimeLocal,
		type LessonFilter
	} from '$lib/admin/lesson-display';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let filter = $state<LessonFilter>('all');
	let courseFilter = $state('');

	const filteredLessons = $derived(filterLessons(data.lessons, filter, courseFilter));

	function ingestLabel(status: string | undefined): string {
		if (!status) return 'No video';
		if (status === 'pending_upload') return 'Uploading';
		if (status === 'processing') return 'Processing';
		if (status === 'ready') return 'Ready';
		if (status === 'failed') return 'Error';
		return status.replaceAll('_', ' ');
	}

	function ingestClass(status: string | undefined): string {
		if (status === 'ready') return 'ready';
		if (status === 'processing') return 'processing';
		if (status === 'pending_upload') return 'uploading';
		return 'error';
	}
</script>

<svelte:head>
	<title>Lesson management | ShivWorks Admin</title>
</svelte:head>

<div class="adm-page-head">
	<p class="eyebrow">Content publishing</p>
	<h2>Lesson management</h2>
	<p class="adm-page-copy">
		Upload training videos from your computer, track Cloudflare processing, set tier access, and
		publish to the library. Drafts stay hidden from members until you publish.
	</p>
</div>

{#if form?.error}
	<div class="status-message error">{form.error}</div>
{:else if form?.success}
	<div class="status-message">{form.success}</div>
{/if}

<div class="cm-grid">
	<section class="panel cm-form">
		<h2>New lesson</h2>
		<p class="fhint">
			The normal path uploads a file directly from your computer with resumable progress. The lesson
			is created as a draft while Cloudflare processes it.
		</p>
		<a class="btn-primary" href="/admin#direct-video-upload">Upload a video file</a>
		<details class="advanced-stream-link">
			<summary>Advanced: link an existing Stream video</summary>
			<p class="fhint">
				Use this only when the video is already in Cloudflare Stream. Paste its UID or URL; admins
				uploading a new file never need to see a Stream ID.
			</p>
			<form class="stack-form" method="POST" action="?/createLesson">
				<div class="fld">
					<label for="create-course">Course</label>
					<select id="create-course" name="courseId" required>
						{#each data.courses as course}
							<option value={course.id}>{course.title}</option>
						{/each}
					</select>
				</div>
				<div class="fld">
					<label for="create-title">Title</label>
					<input id="create-title" name="title" required placeholder="Lesson title" />
				</div>
				<div class="fld">
					<label for="create-description">Description</label>
					<textarea
						id="create-description"
						name="description"
						rows="3"
						placeholder="What members will learn"
					></textarea>
				</div>
				<div class="fld-2">
					<div class="fld">
						<label for="create-status">Status</label>
						<select id="create-status" name="status">
							<option value="coming_soon">Draft</option>
							<option value="available">Published</option>
						</select>
					</div>
					<div class="fld">
						<label for="create-tier">Tier access</label>
						<select id="create-tier" name="accessTier">
							<option value="free">Preview</option>
							<option value="member">Paid members</option>
							<option value="vip">VIP</option>
						</select>
					</div>
				</div>
				<div class="fld">
					<label for="create-stream">Cloudflare Stream ID or URL</label>
					<input
						id="create-stream"
						name="streamReference"
						placeholder="UID or videodelivery.net / cloudflarestream.com URL"
					/>
				</div>
				<div class="fld">
					<label for="create-thumbnail">Thumbnail URL</label>
					<input id="create-thumbnail" name="thumbnailUrl" placeholder="https://… or /images/…" />
				</div>
				<div class="fld">
					<label for="create-published">Publish date</label>
					<input id="create-published" name="publishedAt" type="datetime-local" />
				</div>
				<button class="btn-secondary" type="submit">Link existing Stream video</button>
			</form>
		</details>
	</section>

	<section class="cm-tablewrap">
		<div class="cm-tabhead">
			<h2>Catalog ({filteredLessons.length})</h2>
			<div class="cm-secfilter">
				<button type="button" class:on={filter === 'all'} onclick={() => (filter = 'all')}
					>All</button
				>
				<button
					type="button"
					class:on={filter === 'published'}
					onclick={() => (filter = 'published')}>Published</button
				>
				<button type="button" class:on={filter === 'draft'} onclick={() => (filter = 'draft')}
					>Draft</button
				>
				<button type="button" class:on={filter === 'archived'} onclick={() => (filter = 'archived')}
					>Archived</button
				>
			</div>
		</div>

		<div class="cm-filter-row">
			<label class="fld cm-course-filter">
				<span>Course</span>
				<select bind:value={courseFilter}>
					<option value="">All courses</option>
					{#each data.courses as course}
						<option value={course.id}>{course.title}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if filteredLessons.length === 0}
			<div class="cm-empty">
				<strong>No lessons match this filter.</strong>
				<p>Create a lesson on the left or change the filter above.</p>
			</div>
		{:else}
			<table class="cm">
				<thead>
					<tr>
						<th>Lesson</th>
						<th class="col-tier">Access</th>
						<th>Video</th>
						<th>Status</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each filteredLessons as lesson (lesson.id)}
						<tr>
							<td>
								<div class="lesson-title-cell">
									{#if lesson.thumbnailUrl}
										<img src={lesson.thumbnailUrl} alt="" />
									{:else}
										<span class="lesson-video-icon" aria-hidden="true">▶</span>
									{/if}
									<div>
										<div class="ct-title">{lesson.title}</div>
										<div class="ct-sec">{lesson.courseTitle}</div>
										{#if lesson.publishedAt}
											<div class="ct-sec">Published {formatPublishedAt(lesson.publishedAt)}</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="col-tier">{getAudienceLabel(lesson.accessTier)}</td>
							<td>
								<span
									class="ingest-status-chip {ingestClass(
										lesson.primaryEpisode?.media?.ingestStatus
									)}"
								>
									{ingestLabel(lesson.primaryEpisode?.media?.ingestStatus)}
								</span>
								<div class="ct-sec">{lessonStreamSummary(lesson)}</div>
							</td>
							<td>
								<span class={lessonStatusPillClass(lesson.status)}>
									{lessonStatusLabel(lesson.status)}
								</span>
							</td>
							<td class="cm-actions">
								<a
									class="ghost-link"
									href="/library/{lesson.courseSlug}?module={encodeURIComponent(lesson.id)}"
								>
									Preview
								</a>
							</td>
						</tr>
						<tr class="cm-edit-row">
							<td colspan="5">
								<details class="lesson-edit">
									<summary>Edit lesson</summary>
									<form class="stack-form lesson-edit-form" method="POST" action="?/updateLesson">
										<input type="hidden" name="moduleId" value={lesson.id} />
										<div class="fld-2">
											<div class="fld">
												<label for="title-{lesson.id}">Title</label>
												<input id="title-{lesson.id}" name="title" value={lesson.title} required />
											</div>
											<div class="fld">
												<label for="status-{lesson.id}">Status</label>
												<select id="status-{lesson.id}" name="status" value={lesson.status}>
													<option value="coming_soon">Draft</option>
													<option value="available">Published</option>
													<option value="archived">Archived</option>
												</select>
											</div>
										</div>
										<div class="fld">
											<label for="description-{lesson.id}">Description</label>
											<textarea id="description-{lesson.id}" name="description" rows="2"
												>{lesson.description || ''}</textarea
											>
										</div>
										<div class="fld-2">
											<div class="fld">
												<label for="tier-{lesson.id}">Tier access</label>
												<select id="tier-{lesson.id}" name="accessTier" value={lesson.accessTier}>
													<option value="free">Preview</option>
													<option value="member">Paid members</option>
													<option value="vip">VIP</option>
												</select>
											</div>
											<div class="fld">
												<label for="published-{lesson.id}">Publish date</label>
												<input
													id="published-{lesson.id}"
													name="publishedAt"
													type="datetime-local"
													value={toDateTimeLocal(lesson.publishedAt)}
												/>
											</div>
										</div>
										<details class="advanced-stream-link">
											<summary>Advanced: replace video or thumbnail</summary>
											<div class="fld-2">
												<div class="fld">
													<label for="thumb-{lesson.id}">Manual thumbnail override</label>
													<input
														id="thumb-{lesson.id}"
														name="thumbnailUrl"
														value={lesson.thumbnailUrl || ''}
													/>
												</div>
												<div class="fld">
													<label for="stream-{lesson.id}">Stream ID or URL</label>
													<input
														id="stream-{lesson.id}"
														name="streamReference"
														placeholder={lesson.primaryEpisode?.media?.providerAssetId ||
															'Paste to attach or replace video'}
													/>
												</div>
											</div>
										</details>
										<button class="btn-secondary" type="submit">Save changes</button>
									</form>
								</details>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
</div>

<style>
	.adm-page-head {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.65rem;
		margin-bottom: 1.25rem;
	}

	.adm-page-head h2 {
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		text-transform: uppercase;
		font-weight: 800;
		margin: 0;
		line-height: 1.12;
	}

	.adm-page-head .eyebrow {
		margin: 0;
	}

	.adm-page-copy {
		color: var(--color-fg-secondary);
		max-width: 46rem;
		margin: 0;
		line-height: 1.55;
	}

	.cm-filter-row {
		padding: 0.75rem 1.2rem;
		border-bottom: 1px solid var(--color-border);
		background: rgba(255, 255, 255, 0.01);
	}

	.cm-course-filter {
		margin: 0;
		max-width: 320px;
	}

	.cm-empty {
		padding: 2rem 1.2rem;
		color: var(--color-fg-secondary);
	}

	.cm-empty p {
		margin: 0.35rem 0 0;
	}

	.cm-actions {
		text-align: right;
		white-space: nowrap;
	}

	.cm-edit-row td {
		padding-top: 0;
		background: rgba(255, 255, 255, 0.01);
	}

	.lesson-edit summary {
		cursor: pointer;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		padding: 0.35rem 0 0.85rem;
	}

	.lesson-edit-form {
		padding-bottom: 0.5rem;
	}

	.lesson-title-cell {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		min-width: 12rem;
	}

	.lesson-title-cell img,
	.lesson-video-icon {
		width: 4rem;
		aspect-ratio: 16 / 9;
		flex: 0 0 auto;
		border-radius: 5px;
		object-fit: cover;
	}

	.lesson-video-icon {
		display: grid;
		place-items: center;
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-accent);
	}

	@media (max-width: 768px) {
		.lesson-title-cell {
			min-width: 10rem;
		}

		.lesson-title-cell img,
		.lesson-video-icon {
			width: 3.25rem;
		}
	}
</style>
