<script lang="ts">
	interface Summary {
		lessonTotal: number;
		lessonPublished: number;
		lessonDraft: number;
		lessonWithVideo: number;
		memberTotal: number;
		courseLive: number;
	}

	interface Props {
		summary: Summary;
	}

	let { summary }: Props = $props();
</script>

<div class="stat-grid">
	<div class="stat">
		<div class="sv">{summary.lessonPublished}</div>
		<div class="sl">Published lessons</div>
		<div class="sd up">
			{summary.lessonDraft} draft{summary.lessonDraft === 1 ? '' : 's'} remaining
		</div>
	</div>
	<div class="stat">
		<div class="sv">{summary.lessonWithVideo}</div>
		<div class="sl">With video</div>
		<div class="sd">Stream or legacy playback linked</div>
	</div>
	<div class="stat">
		<div class="sv">{summary.courseLive}</div>
		<div class="sl">Live courses</div>
		<div class="sd">{summary.lessonTotal} total lessons in catalog</div>
	</div>
	<div class="stat">
		<div class="sv">{summary.memberTotal}</div>
		<div class="sl">Members</div>
		<div class="sd">Active roster in D1</div>
	</div>
</div>
