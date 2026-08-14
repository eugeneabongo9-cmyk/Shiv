<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();
	let uploadModuleId = $state('');
	let uploadTitle = $state('');
	let uploadDescription = $state('');
	let uploadEpisodeNumber = $state('');
	let uploadAccessTier = $state<'free' | 'member' | 'vip'>('member');
	let uploadPlaybackPolicy = $state<'private' | 'public'>('private');
	let uploadMaxDurationMinutes = $state('');
	let uploadDurationHint = $state<string | null>(null);
	let selectedUploadFile = $state<File | null>(null);
	let uploadStatus = $state<string | null>(null);
	let uploadError = $state<string | null>(null);
	let uploadPercent = $state<number | null>(null);
	let uploadSpeedBytesPerSecond = $state<number | null>(null);
	let uploadEtaSeconds = $state<number | null>(null);
	let isUploading = $state(false);
	let isDraggingUpload = $state(false);
	let uploadFileInput = $state<HTMLInputElement | null>(null);
	let interruptedUploads = $state<PendingUpload[]>([]);
	let replacementEpisodeId = $state<string | null>(null);
	let syncingMediaAssetId = $state<string | null>(null);
	let mediaSyncStatus = $state<Record<string, string>>({});
	let mediaSyncError = $state<Record<string, string>>({});
	const processingPolls = new SvelteSet<string>();
	let memberSearch = $state('');
	let importSearch = $state('');
	let showBulkNudgeConfirmation = $state(false);
	let scheduleTimezoneLabel = $state('your local timezone');
	let timezoneOffsetMinutes = $state(0);

	let showCreateDestination = $state(false);
	let newDestinationKind = $state<'course' | 'series'>('course');
	let newCourseTitle = $state('');
	let newCourseSlug = $state('');
	let newCourseSlugTouched = $state(false);
	let newCourseDescription = $state('');
	let newCourseAccessTier = $state<'free' | 'member' | 'vip'>('member');
	let newCourseStatus = $state<'coming_soon' | 'archived'>('coming_soon');
	let newFirstModuleTitle = $state('');
	let newFirstModuleDescription = $state('');

	onMount(() => {
		scheduleTimezoneLabel =
			Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local timezone';
		timezoneOffsetMinutes = new Date().getTimezoneOffset();
	});

	function syncScheduleForm(event: SubmitEvent) {
		const form = event.currentTarget;
		if (!(form instanceof HTMLFormElement)) return;

		for (const input of form.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')) {
			const epochInput = form.elements.namedItem(`${input.name}Epoch`);
			if (epochInput instanceof HTMLInputElement) {
				const epoch = input.value ? new Date(input.value).getTime() : Number.NaN;
				epochInput.value = Number.isFinite(epoch) ? String(epoch) : '';
			}
		}
	}

	let showAddModule = $state(false);
	let addModuleCourseId = $state('');
	let addModuleTitle = $state('');
	let addModuleDescription = $state('');
	let addModuleAccessTier = $state<'free' | 'member' | 'vip'>('member');

	let expandedCourseId = $state<string | null>(null);
	let expandedModuleId = $state<string | null>(null);

	function slugifyPreview(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
	}

	function handleNewCourseTitleInput() {
		if (!newCourseSlugTouched) {
			newCourseSlug = slugifyPreview(newCourseTitle);
		}
	}

	// Any successful create/discard action returns the module the admin should
	// now use — jump straight to it so the new destination is immediately
	// selectable in the upload workflow without another click.
	$effect(() => {
		if (form?.newModuleId) {
			uploadModuleId = form.newModuleId;
			showCreateDestination = false;
			showAddModule = false;
		}
	});

	const filteredMembers = $derived.by(() => {
		const query = memberSearch.trim().toLowerCase();
		if (!query) return data.members;
		return data.members.filter(
			(member) =>
				member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query)
		);
	});

	const filteredImports = $derived.by(() => {
		const query = importSearch.trim().toLowerCase();
		if (!query) return data.imports;
		return data.imports.filter(
			(item) =>
				item.name.toLowerCase().includes(query) ||
				item.email.toLowerCase().includes(query) ||
				(item.sourceRef || '').toLowerCase().includes(query)
		);
	});

	function memberInitials(name: string): string {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	const TUS_CHUNK_SIZE_BYTES = 5 * 1024 * 1024;
	const TUS_RETRY_DELAYS_MS = [0, 1_000, 3_000, 5_000, 10_000, 20_000, 30_000];

	const selectedUploadModule = $derived(
		data.modules.find((module) => module.id === uploadModuleId) || data.modules[0] || null
	);
	const uploadDestinationGroups = $derived.by(() => [
		{
			label: 'Training',
			courses: data.courses.filter((course) => course.courseKind !== 'series')
		},
		{
			label: 'The Roadshow',
			courses: data.courses.filter((course) => course.id === 'series_roadshow')
		},
		{
			label: 'ShivWorks Spotlights',
			courses: data.courses.filter((course) => course.id === 'series_spotlights')
		}
	]);
	const uploadQueueEpisodes = $derived.by(() =>
		[...data.episodes]
			.filter((episode) => episode.media?.provider === 'cloudflare_stream')
			.sort(
				(left, right) =>
					Date.parse(right.media?.updatedAt || '') - Date.parse(left.media?.updatedAt || '')
			)
			.slice(0, 12)
	);

	function moduleForEpisode(moduleId: string) {
		return data.modules.find((module) => module.id === moduleId) || null;
	}

	$effect(() => {
		if (!uploadModuleId && data.modules[0]) {
			uploadModuleId = data.modules[0].id;
		}
	});

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			refreshPendingUploads();
		}
	});

	$effect(() => {
		for (const episode of data.episodes) {
			if (
				episode.media?.provider === 'cloudflare_stream' &&
				episode.media.ingestStatus === 'processing'
			) {
				void pollStreamMedia(episode.media.id);
			}
		}
	});

	function toDateTimeLocal(value: number | null): string {
		if (!value) {
			return '';
		}

		const date = new Date(value);
		return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
	}

	function episodesForModule(moduleId: string) {
		return data.episodes.filter((episode) => episode.moduleId === moduleId);
	}

	function formatBytes(value: number | null | undefined): string {
		if (!value) {
			return 'No file size';
		}

		if (value >= 1024 * 1024 * 1024) {
			return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		}

		return `${(value / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatUploadSpeed(value: number | null): string {
		if (!value || value <= 0) return '';
		return `${formatBytes(value)}/s`;
	}

	function formatEta(seconds: number | null): string {
		if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '';
		if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} sec remaining`;
		const minutes = Math.ceil(seconds / 60);
		return `${minutes} min remaining`;
	}

	function formatMediaStatus(status: string): string {
		return status.replaceAll('_', ' ');
	}

	function mediaStatusLabel(status: string): string {
		if (status === 'pending_upload') return 'Uploading';
		if (status === 'processing') return 'Processing';
		if (status === 'ready') return 'Ready';
		if (status === 'failed') return 'Error';
		return formatMediaStatus(status);
	}

	function mediaStatusClass(status: string): string {
		if (status === 'ready') return 'ready';
		if (status === 'failed') return 'error';
		if (status === 'processing') return 'processing';
		return 'uploading';
	}

	function formatCatalogStatus(status: string): string {
		if (status === 'coming_soon') return 'Coming soon';
		if (status === 'available') return 'Available';
		if (status === 'archived') return 'Archived';
		return formatMediaStatus(status);
	}

	function toggleCourseEditor(courseId: string) {
		if (expandedCourseId === courseId) {
			expandedCourseId = null;
			expandedModuleId = null;
			return;
		}
		expandedCourseId = courseId;
		expandedModuleId = null;
	}

	function toggleModuleEditor(moduleId: string) {
		expandedModuleId = expandedModuleId === moduleId ? null : moduleId;
	}

	function confirmArchive(label: string): boolean {
		return window.confirm(`Archive "${label}"? Members will no longer see it as live content.`);
	}

	function confirmDelete(label: string, kind: 'course' | 'module'): boolean {
		return window.confirm(`Permanently delete empty ${kind} "${label}"? This cannot be undone.`);
	}

	function moduleMediaHint(moduleId: string): string {
		const episodes = episodesForModule(moduleId);
		if (episodes.length === 0) {
			return 'No episodes';
		}
		const readyCount = episodes.filter((episode) => episode.media?.ingestStatus === 'ready').length;
		if (readyCount === episodes.length) {
			return `${episodes.length} episode${episodes.length === 1 ? '' : 's'} · ready`;
		}
		return `${episodes.length} episode${episodes.length === 1 ? '' : 's'} · ${readyCount} ready`;
	}

	function formatDurationMinutes(totalSeconds: number): string {
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.round(totalSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function recommendedMaxDurationMinutes(durationSeconds: number): number {
		const minutes = Math.ceil(durationSeconds / 60);
		return Math.max(minutes + 15, Math.ceil(minutes * 1.1));
	}

	function probeVideoDuration(file: File): Promise<number | null> {
		return new Promise((resolve) => {
			const url = URL.createObjectURL(file);
			const video = document.createElement('video');
			video.preload = 'metadata';
			video.onloadedmetadata = () => {
				URL.revokeObjectURL(url);
				resolve(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
			};
			video.onerror = () => {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			video.src = url;
		});
	}

	const SUPPORTED_VIDEO_EXTENSIONS = [
		'mp4',
		'mov',
		'm4v',
		'avi',
		'mkv',
		'webm',
		'mpeg',
		'mpg',
		'3gp',
		'3g2',
		'flv',
		'ogv',
		'ogg'
	];

	function isLikelyVideoFile(file: File): boolean {
		if (file.type && file.type.startsWith('video/')) {
			return true;
		}
		const extension = file.name.split('.').pop()?.toLowerCase() || '';
		return SUPPORTED_VIDEO_EXTENSIONS.includes(extension);
	}

	async function selectUploadFile(file: File | null, input?: HTMLInputElement) {
		selectedUploadFile = file;
		uploadError = null;
		uploadDurationHint = null;

		if (!selectedUploadFile) {
			return;
		}

		if (!isLikelyVideoFile(selectedUploadFile)) {
			uploadError =
				'That file does not look like a supported video. Choose an MP4, MOV, MKV, or WebM file.';
			selectedUploadFile = null;
			if (input) input.value = '';
			return;
		}

		if (data.maxUploadFileSizeBytes && selectedUploadFile.size > data.maxUploadFileSizeBytes) {
			uploadError = `That file is too large. Maximum supported size is ${formatBytes(data.maxUploadFileSizeBytes)}.`;
			selectedUploadFile = null;
			if (input) input.value = '';
			return;
		}

		if (!uploadTitle.trim()) {
			uploadTitle = selectedUploadFile.name
				.replace(/\.[^.]+$/, '')
				.replace(/[_-]+/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}

		const durationSeconds = await probeVideoDuration(selectedUploadFile);
		if (durationSeconds) {
			const maxMinutes = recommendedMaxDurationMinutes(durationSeconds);
			uploadMaxDurationMinutes = String(maxMinutes);
			uploadDurationHint = `Detected ${formatDurationMinutes(durationSeconds)}. Max duration set to ${maxMinutes} minutes so Cloudflare encoding will not reject the file.`;
		} else {
			uploadMaxDurationMinutes = '';
			uploadDurationHint =
				'Could not read video length from this file. Leaving max duration blank so Cloudflare will not apply a per-upload time cap.';
		}

		await handleDirectUpload();
	}

	async function handleUploadFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		await selectUploadFile(input.files?.[0] || null, input);
	}

	async function handleUploadDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingUpload = false;
		if (isUploading) return;
		await selectUploadFile(event.dataTransfer?.files?.[0] || null);
	}

	async function uploadFileToTus(uploadUrl: string, file: File): Promise<void> {
		const tusModule = (await import('tus-js-client')) as unknown as {
			Upload?: new (...args: any[]) => { start: () => void };
			default?: {
				Upload?: new (...args: any[]) => { start: () => void };
			};
		};
		const TusUpload = tusModule.Upload || tusModule.default?.Upload;
		if (!TusUpload) {
			throw new Error('Could not load the resumable upload client.');
		}

		await new Promise<void>((resolve, reject) => {
			let lastSampleAt = performance.now();
			let lastBytesUploaded = 0;
			let smoothedBytesPerSecond = 0;
			const upload = new TusUpload(file, {
				uploadUrl,
				chunkSize: TUS_CHUNK_SIZE_BYTES,
				retryDelays: TUS_RETRY_DELAYS_MS,
				removeFingerprintOnSuccess: true,
				onShouldRetry: (error: Error, retryAttempt: number) => {
					const retryDelay = TUS_RETRY_DELAYS_MS[retryAttempt] ?? null;
					if (retryDelay !== null) {
						uploadStatus = `Upload interrupted. Retrying in ${Math.round(retryDelay / 1000)} seconds...`;
						return true;
					}
					return false;
				},
				onError: (error: Error) => {
					reject(new Error(error.message || 'Network error while uploading video chunk.'));
				},
				onProgress: (bytesUploaded: number, bytesTotal: number) => {
					uploadStatus = 'Uploading to Cloudflare Stream...';
					uploadPercent =
						bytesTotal > 0 ? Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100)) : 0;
					const now = performance.now();
					const elapsedSeconds = (now - lastSampleAt) / 1_000;
					if (elapsedSeconds >= 0.5) {
						const currentBytesPerSecond = Math.max(
							0,
							(bytesUploaded - lastBytesUploaded) / elapsedSeconds
						);
						smoothedBytesPerSecond =
							smoothedBytesPerSecond > 0
								? smoothedBytesPerSecond * 0.7 + currentBytesPerSecond * 0.3
								: currentBytesPerSecond;
						uploadSpeedBytesPerSecond = smoothedBytesPerSecond;
						uploadEtaSeconds =
							smoothedBytesPerSecond > 0
								? Math.max(0, (bytesTotal - bytesUploaded) / smoothedBytesPerSecond)
								: null;
						lastSampleAt = now;
						lastBytesUploaded = bytesUploaded;
					}
				},
				onSuccess: () => {
					uploadPercent = 100;
					uploadEtaSeconds = 0;
					resolve();
				}
			});

			// A stored TUS upload URL makes the client issue HEAD and continue
			// from Cloudflare's current offset instead of restarting at byte 0.
			upload.start();
		});
	}

	type PendingUpload = {
		storageKey: string;
		uploadUrl: string;
		mediaAssetId: string;
		episodeId: string;
		expiresAt: number;
		fileName: string;
		fileSize: number;
		moduleId: string;
		title: string;
	};

	function pendingUploadKey(file: File): string {
		return `shivworks:upload:${uploadModuleId}:${file.name}:${file.size}:${file.lastModified}`;
	}

	function readPendingUpload(file: File): PendingUpload | null {
		try {
			const key = pendingUploadKey(file);
			const raw = localStorage.getItem(key);
			if (!raw) return null;
			const pending = JSON.parse(raw) as PendingUpload;
			if (
				!pending.uploadUrl ||
				!pending.mediaAssetId ||
				!pending.episodeId ||
				pending.storageKey !== key ||
				pending.expiresAt * 1_000 <= Date.now()
			) {
				localStorage.removeItem(key);
				return null;
			}
			return pending;
		} catch {
			return null;
		}
	}

	function savePendingUpload(file: File, pending: PendingUpload) {
		localStorage.setItem(pending.storageKey, JSON.stringify(pending));
		refreshPendingUploads();
	}

	function clearPendingUpload(file: File) {
		localStorage.removeItem(pendingUploadKey(file));
		refreshPendingUploads();
	}

	function refreshPendingUploads() {
		const pending: PendingUpload[] = [];
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (!key?.startsWith('shivworks:upload:')) continue;
			try {
				const item = JSON.parse(localStorage.getItem(key) || '') as PendingUpload;
				if (item.expiresAt * 1_000 <= Date.now()) {
					localStorage.removeItem(key);
					continue;
				}
				pending.push(item);
			} catch {
				localStorage.removeItem(key);
			}
		}
		interruptedUploads = pending.sort((left, right) => left.expiresAt - right.expiresAt);
	}

	function prepareResume(pending: PendingUpload) {
		uploadModuleId = pending.moduleId;
		uploadTitle = pending.title;
		setTimeout(() => uploadFileInput?.click());
	}

	function prepareReupload(episode: PageData['episodes'][number]) {
		uploadModuleId = episode.moduleId;
		uploadTitle = episode.title;
		uploadDescription = episode.description || '';
		uploadEpisodeNumber = String(episode.episodeNumber);
		uploadAccessTier = episode.accessTier;
		replacementEpisodeId = episode.id;
		document.querySelector('#direct-video-upload')?.scrollIntoView({ behavior: 'smooth' });
		setTimeout(() => uploadFileInput?.click(), 350);
	}

	async function handleDirectUpload(event?: SubmitEvent) {
		event?.preventDefault();

		if (!selectedUploadModule) {
			uploadError = 'Choose an upload destination first.';
			return;
		}
		if (!selectedUploadFile) {
			uploadError = 'Choose a video file first.';
			return;
		}
		if (!isLikelyVideoFile(selectedUploadFile)) {
			uploadError =
				'That file does not look like a supported video. Choose an MP4, MOV, MKV, or WebM file.';
			return;
		}
		if (data.maxUploadFileSizeBytes && selectedUploadFile.size > data.maxUploadFileSizeBytes) {
			uploadError = `That file is too large. Maximum supported size is ${formatBytes(data.maxUploadFileSizeBytes)}.`;
			return;
		}
		if (!uploadTitle.trim()) {
			uploadError = 'Add an episode title.';
			return;
		}
		if (!data.videoUploadConfig.ready) {
			uploadError =
				'Cloudflare Stream uploads are not configured yet. Ask an engineer to set the missing keys.';
			return;
		}

		isUploading = true;
		uploadError = null;
		uploadStatus = 'Creating upload...';
		uploadPercent = 0;
		uploadSpeedBytesPerSecond = null;
		uploadEtaSeconds = null;

		try {
			const uploadFile = selectedUploadFile;
			const maxDurationMinutes = Number(uploadMaxDurationMinutes);
			const episodeNumber = Number(uploadEpisodeNumber);
			let pendingUpload = readPendingUpload(uploadFile);

			if (pendingUpload) {
				uploadStatus = 'Found an interrupted upload. Resuming...';
			} else {
				const initResponse = await fetch('/api/admin/media/uploads/init', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						episodeId: replacementEpisodeId || undefined,
						moduleId: selectedUploadModule.id,
						title: uploadTitle.trim(),
						description: uploadDescription.trim() || undefined,
						episodeNumber:
							Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : undefined,
						accessTier: uploadAccessTier,
						fileName: uploadFile.name,
						fileType: uploadFile.type || undefined,
						fileSizeBytes: uploadFile.size,
						maxDurationSeconds:
							Number.isFinite(maxDurationMinutes) && maxDurationMinutes > 0
								? Math.round(maxDurationMinutes * 60)
								: undefined,
						playbackPolicy: uploadPlaybackPolicy
					})
				});
				const initResult = await initResponse.json().catch(() => null);

				if (!initResponse.ok || !initResult?.success) {
					throw new Error(initResult?.error || 'Could not create the upload.');
				}
				pendingUpload = {
					storageKey: pendingUploadKey(uploadFile),
					uploadUrl: initResult.data.uploadUrl,
					mediaAssetId: initResult.data.mediaAssetId,
					episodeId: initResult.data.episodeId,
					expiresAt: initResult.data.expiresAt,
					fileName: uploadFile.name,
					fileSize: uploadFile.size,
					moduleId: selectedUploadModule.id,
					title: uploadTitle.trim()
				};
				savePendingUpload(uploadFile, pendingUpload);
			}

			uploadStatus = 'Uploading to Cloudflare Stream...';
			await uploadFileToTus(pendingUpload.uploadUrl, uploadFile);
			uploadStatus = 'Finalizing upload...';

			const completeResponse = await fetch('/api/admin/media/uploads/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mediaAssetId: pendingUpload.mediaAssetId,
					episodeId: pendingUpload.episodeId,
					title: uploadTitle.trim(),
					description: uploadDescription.trim() || null,
					accessTier: uploadAccessTier
				})
			});
			const completeResult = await completeResponse.json().catch(() => null);

			if (!completeResponse.ok || !completeResult?.success) {
				throw new Error(completeResult?.error || 'Could not finalize the upload.');
			}

			uploadStatus = 'Checking Cloudflare Stream encoding status...';
			const syncResponse = await fetch('/api/admin/media/uploads/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mediaAssetId: pendingUpload.mediaAssetId })
			});
			const syncResult = await syncResponse.json().catch(() => null);

			if (!syncResponse.ok || !syncResult?.success) {
				throw new Error(
					syncResult?.error || 'Upload finished but Stream status could not be checked.'
				);
			}

			if (syncResult.data.ingestStatus === 'failed') {
				clearPendingUpload(uploadFile);
				throw new Error(
					syncResult.data.failureReason ||
						'Cloudflare Stream rejected this video after upload. Check max duration and try again.'
				);
			}

			uploadPercent = 100;
			uploadStatus =
				syncResult.data.ingestStatus === 'ready'
					? 'Upload complete and ready to stream.'
					: 'Upload complete. Cloudflare is processing the video — this page will update automatically.';
			clearPendingUpload(uploadFile);
			uploadTitle = '';
			uploadDescription = '';
			uploadEpisodeNumber = '';
			uploadMaxDurationMinutes = '';
			uploadDurationHint = null;
			selectedUploadFile = null;
			replacementEpisodeId = null;
			if (uploadFileInput) uploadFileInput.value = '';
			await invalidateAll();
			if (syncResult.data.ingestStatus === 'processing') {
				void pollStreamMedia(pendingUpload.mediaAssetId);
			}
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed.';
			uploadStatus = null;
		} finally {
			isUploading = false;
		}
	}

	async function pollStreamMedia(mediaAssetId: string) {
		if (processingPolls.has(mediaAssetId)) return;
		processingPolls.add(mediaAssetId);

		try {
			for (let attempt = 0; attempt < 225; attempt += 1) {
				await new Promise((resolve) => setTimeout(resolve, 8_000));
				const response = await fetch('/api/admin/media/uploads/sync', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ mediaAssetId })
				});
				const result = await response.json().catch(() => null);
				if (!response.ok || !result?.success) {
					mediaSyncError = {
						...mediaSyncError,
						[mediaAssetId]: result?.error || 'Automatic Stream status check failed.'
					};
					continue;
				}

				const ingestStatus = String(result.data.ingestStatus);
				mediaSyncStatus = {
					...mediaSyncStatus,
					[mediaAssetId]:
						ingestStatus === 'processing'
							? 'Processing in Cloudflare Stream…'
							: `Cloudflare reports ${formatMediaStatus(ingestStatus)}.`
				};
				if (ingestStatus === 'ready' || ingestStatus === 'failed') {
					await invalidateAll();
					break;
				}
			}
		} finally {
			processingPolls.delete(mediaAssetId);
		}
	}

	async function syncStreamMedia(mediaAssetId: string) {
		syncingMediaAssetId = mediaAssetId;
		mediaSyncStatus = { ...mediaSyncStatus, [mediaAssetId]: 'Checking Cloudflare Stream...' };
		mediaSyncError = { ...mediaSyncError, [mediaAssetId]: '' };

		try {
			const response = await fetch('/api/admin/media/uploads/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mediaAssetId })
			});
			const result = await response.json().catch(() => null);

			if (!response.ok || !result?.success) {
				throw new Error(result?.error || 'Could not sync Stream status.');
			}

			mediaSyncStatus = {
				...mediaSyncStatus,
				[mediaAssetId]: `Cloudflare reports ${formatMediaStatus(result.data.ingestStatus)}.`
			};
			await invalidateAll();
		} catch (error) {
			mediaSyncError = {
				...mediaSyncError,
				[mediaAssetId]: error instanceof Error ? error.message : 'Could not sync Stream status.'
			};
			mediaSyncStatus = { ...mediaSyncStatus, [mediaAssetId]: '' };
		} finally {
			syncingMediaAssetId = null;
		}
	}
</script>

<svelte:head>
	<title>Admin | ShivWorks Network</title>
</svelte:head>

<div class="adm-page-head">
	<p class="adm-page-copy">
		Manage access, course states, build-log updates, events, and VIP scheduling. For publishing
		training videos with Stream IDs, use
		<a class="ghost-link" href="/admin/lessons">Lesson management</a>.
	</p>
</div>

{#if form?.error && form?.action !== 'importMembers'}
	<div class="status-message error">{form.error}</div>
{/if}
{#if form?.success && form?.action !== 'importMembers'}
	<div class="status-message">{form.success}</div>
{/if}
{#if form?.importWarnings?.length}
	<details class="status-message subtle import-warnings">
		<summary
			>{form.importWarnings.length} row warning{form.importWarnings.length === 1
				? ''
				: 's'}</summary
		>
		<ul>
			{#each form.importWarnings as warning}
				<li>{warning}</li>
			{/each}
		</ul>
	</details>
{/if}

<div class="panel stack-form destination-tools">
	<h2>Upload destination</h2>
	<p class="fhint">
		Pick an existing course/module in the upload form below, or create the missing course/series and
		first module right here without leaving this page.
	</p>
	<div class="destination-toggle-row">
		<button
			type="button"
			class="btn-secondary compact-button"
			onclick={() => (showCreateDestination = !showCreateDestination)}
		>
			{showCreateDestination ? 'Cancel new course/series' : '+ New course or series'}
		</button>
		<button
			type="button"
			class="btn-secondary compact-button"
			onclick={() => (showAddModule = !showAddModule)}
		>
			{showAddModule ? 'Cancel new module' : '+ New module in an existing course'}
		</button>
	</div>

	{#if showCreateDestination}
		<form class="stack-form destination-subform" method="POST" action="?/createCourse">
			<div class="inline-fields">
				<label>
					<span>Kind</span>
					<select name="courseKind" bind:value={newDestinationKind}>
						<option value="course">Course</option>
						<option value="series">Series</option>
					</select>
				</label>
				<label>
					<span>Title</span>
					<input
						name="title"
						bind:value={newCourseTitle}
						oninput={handleNewCourseTitleInput}
						required
					/>
				</label>
				<label>
					<span>Slug</span>
					<input
						name="slug"
						bind:value={newCourseSlug}
						oninput={() => (newCourseSlugTouched = true)}
						placeholder="auto-generated-from-title"
						required
					/>
				</label>
			</div>
			<label>
				<span>Description</span>
				<textarea name="description" bind:value={newCourseDescription} rows="2" required></textarea>
			</label>
			<div class="inline-fields">
				<label>
					<span>Access tier</span>
					<select name="accessTier" bind:value={newCourseAccessTier}>
						<option value="free">Preview access</option>
						<option value="member">Founding members</option>
						<option value="vip">VIP tagged</option>
					</select>
				</label>
				<label>
					<span>Initial status</span>
					<select name="status" bind:value={newCourseStatus}>
						<option value="coming_soon">Coming soon (hidden from members)</option>
						<option value="archived">Archived (hidden from members)</option>
					</select>
				</label>
			</div>
			<label>
				<span>First module title (optional)</span>
				<input
					name="firstModuleTitle"
					bind:value={newFirstModuleTitle}
					placeholder="e.g. Module 1: Fundamentals"
				/>
			</label>
			<label>
				<span>First module description (optional)</span>
				<textarea name="firstModuleDescription" bind:value={newFirstModuleDescription} rows="2"
				></textarea>
			</label>
			<p class="fhint">
				New courses and modules always start hidden from members. Publish them explicitly once the
				video is uploaded and Cloudflare reports it ready.
			</p>
			<button class="btn-secondary" type="submit">Create destination</button>
		</form>
	{/if}

	{#if showAddModule}
		<form class="stack-form destination-subform" method="POST" action="?/createModule">
			<div class="inline-fields">
				<label>
					<span>Course</span>
					<select name="courseId" bind:value={addModuleCourseId} required>
						<option value="" disabled selected={!addModuleCourseId}>Choose a course</option>
						{#each data.courses as course}
							<option value={course.id}>{course.title}</option>
						{/each}
					</select>
				</label>
				<label>
					<span>Module title</span>
					<input name="title" bind:value={addModuleTitle} required />
				</label>
				<label>
					<span>Access tier</span>
					<select name="accessTier" bind:value={addModuleAccessTier}>
						<option value="free">Preview access</option>
						<option value="member">Founding members</option>
						<option value="vip">VIP tagged</option>
					</select>
				</label>
			</div>
			<label>
				<span>Description</span>
				<textarea name="description" bind:value={addModuleDescription} rows="2"></textarea>
			</label>
			<button class="btn-secondary" type="submit">Add module</button>
		</form>
	{/if}
</div>

<form class="panel stack-form upload-form" id="direct-video-upload" onsubmit={handleDirectUpload}>
	<h2>Create lesson from a video file</h2>
	<p class="fhint">
		Choose the destination and access level, then drop a video. Upload starts automatically and the
		lesson stays in draft while Cloudflare processes it.
	</p>
	{#if !data.videoUploadConfig.ready}
		<div class="status-message error">
			Cloudflare Stream uploads are not configured yet. Missing:
			{data.videoUploadConfig.missingKeys.join(', ')}.
		</div>
	{/if}
	{#if interruptedUploads.length > 0 && !isUploading}
		<div class="status-message subtle interrupted-upload-list">
			<strong>Interrupted upload available</strong>
			{#each interruptedUploads as pending (pending.storageKey)}
				<div>
					<span>{pending.fileName} · {formatBytes(pending.fileSize)}</span>
					<button
						class="btn-secondary compact-button"
						type="button"
						onclick={() => prepareResume(pending)}
					>
						Choose same file to resume
					</button>
				</div>
			{/each}
		</div>
	{/if}
	{#if replacementEpisodeId}
		<div class="status-message subtle">
			<span>This video will replace the failed upload on the existing lesson.</span>
			<button
				class="ghost-link compact-button"
				type="button"
				onclick={() => (replacementEpisodeId = null)}>Cancel replacement</button
			>
		</div>
	{/if}
	<p class="upload-step-label">1 · Choose destination</p>
	<div class="inline-fields">
		<label>
			<span>Upload destination</span>
			<select bind:value={uploadModuleId} required>
				{#each uploadDestinationGroups as group (group.label)}
					{#if group.courses.some( (course) => data.modules.some((module) => module.courseId === course.id) )}
						<optgroup label={group.label}>
							{#each group.courses as course (course.id)}
								{#each data.modules.filter((module) => module.courseId === course.id) as module (module.id)}
									<option value={module.id}>{course.title} - {module.title}</option>
								{/each}
							{/each}
						</optgroup>
					{/if}
				{/each}
			</select>
		</label>
	</div>
	<p class="upload-step-label">2 · Drop video — upload starts immediately</p>
	<label
		class="dropzone"
		class:drag={isDraggingUpload}
		aria-disabled={isUploading}
		ondragenter={(event) => {
			event.preventDefault();
			if (!isUploading) isDraggingUpload = true;
		}}
		ondragover={(event) => {
			event.preventDefault();
			if (!isUploading) isDraggingUpload = true;
		}}
		ondragleave={() => (isDraggingUpload = false)}
		ondrop={handleUploadDrop}
	>
		<span class="dz-ico" aria-hidden="true">▶</span>
		<span class="dz-title">{isUploading ? 'Upload in progress' : 'Drop video here'}</span>
		<span class="dz-sub">
			{selectedUploadFile
				? `${selectedUploadFile.name} · ${formatBytes(selectedUploadFile.size)}`
				: 'MP4, MOV, MKV, or WebM up to the configured Stream limit.'}
		</span>
		<span class="btn-secondary compact-button" aria-hidden="true">Browse files</span>
		<input
			class="upload-file-input"
			bind:this={uploadFileInput}
			accept="video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.mpeg,.mpg,.3gp,.3g2,.flv,.ogv,.ogg"
			onchange={handleUploadFileChange}
			type="file"
			disabled={isUploading}
		/>
	</label>
	{#if uploadDurationHint}
		<div class="status-message subtle">{uploadDurationHint}</div>
	{/if}
	<p class="upload-step-label">3 · Add lesson details while it uploads</p>
	<div class="inline-fields">
		<label>
			<span>Episode title</span>
			<input bind:value={uploadTitle} required />
		</label>
		<label>
			<span>Episode number</span>
			<input bind:value={uploadEpisodeNumber} min="1" type="number" placeholder="Next" />
		</label>
	</div>
	<label>
		<span>Description</span>
		<textarea bind:value={uploadDescription} rows="2"></textarea>
	</label>
	<div class="inline-fields">
		<label>
			<span>Access</span>
			<select bind:value={uploadAccessTier}>
				<option value="free">Preview access</option>
				<option value="member">Founding members</option>
				<option value="vip">VIP tagged</option>
			</select>
		</label>
		<label>
			<span>Playback</span>
			<select bind:value={uploadPlaybackPolicy}>
				<option value="private">Signed private playback</option>
				<option value="public">Public playback URL</option>
			</select>
		</label>
		<label>
			<span>Max duration minutes</span>
			<input
				bind:value={uploadMaxDurationMinutes}
				min="1"
				type="number"
				placeholder="Blank = no cap"
			/>
		</label>
	</div>
	{#if uploadStatus}
		<div class="status-message upload-progress-status" aria-live="polite">
			<div>
				<span>{uploadStatus}</span>
				{#if uploadPercent !== null}
					<span class="ingest-status-chip {uploadPercent < 100 ? 'uploading' : 'processing'}">
						{uploadPercent < 100 ? `Uploading… ${uploadPercent}%` : 'Processing'}
					</span>
				{/if}
			</div>
			{#if uploadPercent !== null}
				<progress max="100" value={uploadPercent}>{uploadPercent}%</progress>
			{/if}
			{#if uploadSpeedBytesPerSecond}
				<small>
					{formatUploadSpeed(uploadSpeedBytesPerSecond)}
					{#if uploadEtaSeconds !== null}
						· {formatEta(uploadEtaSeconds)}{/if}
				</small>
			{/if}
		</div>
	{/if}
	{#if uploadError}
		<div class="status-message error upload-retry-message">
			<span>{uploadError}</span>
			{#if selectedUploadFile}
				<button class="btn-secondary compact-button" type="submit" disabled={isUploading}
					>Retry upload</button
				>
			{/if}
		</div>
	{/if}
</form>

{#if uploadQueueEpisodes.length > 0}
	<section class="panel stack-form upload-queue" aria-labelledby="upload-queue-heading">
		<div class="section-head">
			<div>
				<p class="eyebrow">Upload queue</p>
				<h2 id="upload-queue-heading">Finish and publish</h2>
				<p>Encoding updates automatically. Publishing remains a separate editorial choice.</p>
			</div>
		</div>
		<div class="upload-queue-list">
			{#each uploadQueueEpisodes as episode (episode.id)}
				{@const lessonModule = moduleForEpisode(episode.moduleId)}
				<article class="upload-queue-item">
					<div class="upload-queue-thumb">
						{#if lessonModule?.thumbnailUrl}
							<img src={lessonModule.thumbnailUrl} alt="" />
						{:else}
							<span aria-hidden="true">▶</span>
						{/if}
					</div>
					<div class="upload-queue-copy">
						<strong>{episode.title}</strong>
						<small>{episode.courseTitle} · {episode.moduleTitle}</small>
						<div class="episode-status-chips">
							<span class="ingest-status-chip {mediaStatusClass(episode.media!.ingestStatus)}">
								{mediaStatusLabel(episode.media!.ingestStatus)}
							</span>
							<span class="membership-badge">{formatCatalogStatus(episode.status)}</span>
						</div>
						{#if mediaSyncStatus[episode.media!.id]}
							<small>{mediaSyncStatus[episode.media!.id]}</small>
						{/if}
						{#if episode.media!.failureReason || mediaSyncError[episode.media!.id]}
							<small class="error-copy">
								{episode.media!.failureReason || mediaSyncError[episode.media!.id]}
							</small>
						{/if}
					</div>
					<div class="upload-queue-actions">
						<form class="episode-status-form" method="POST" action="?/updateEpisode">
							<input type="hidden" name="episodeId" value={episode.id} />
							<select name="status" aria-label={`Editorial status for ${episode.title}`}>
								<option value="coming_soon" selected={episode.status === 'coming_soon'}
									>Draft</option
								>
								<option
									value="available"
									selected={episode.status === 'available'}
									disabled={episode.media!.ingestStatus !== 'ready'}>Published</option
								>
								<option value="archived" selected={episode.status === 'archived'}>Archived</option>
							</select>
							<button class="btn-secondary compact-button" type="submit">Save</button>
						</form>
						{#if episode.media!.ingestStatus === 'failed' || episode.media!.ingestStatus === 'pending_upload'}
							<button
								class="btn-secondary compact-button"
								type="button"
								onclick={() => prepareReupload(episode)}>Re-upload video</button
							>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

<details class="panel advanced-video-link">
	<summary>Advanced: link an existing video</summary>
	<form
		class="stack-form advanced-video-link-form"
		method="POST"
		action="?/linkExistingStreamVideo"
	>
		<p class="fhint">
			Use this only when the video already exists in Cloudflare Stream. Normal uploads never require
			an ID.
		</p>
		<div class="inline-fields">
			<label>
				<span>Destination</span>
				<select name="moduleId" required>
					{#each uploadDestinationGroups as group (group.label)}
						{#if group.courses.some( (course) => data.modules.some((module) => module.courseId === course.id) )}
							<optgroup label={group.label}>
								{#each group.courses as course (course.id)}
									{#each data.modules.filter((module) => module.courseId === course.id) as module (module.id)}
										<option value={module.id}>{course.title} - {module.title}</option>
									{/each}
								{/each}
							</optgroup>
						{/if}
					{/each}
				</select>
			</label>
			<label>
				<span>Lesson title</span>
				<input name="title" required maxlength="180" />
			</label>
			<label>
				<span>Access</span>
				<select name="accessTier">
					<option value="free">Preview access</option>
					<option value="member" selected>Founding members</option>
					<option value="vip">VIP tagged</option>
				</select>
			</label>
		</div>
		<label>
			<span>Cloudflare Stream ID or URL</span>
			<input name="streamReference" required autocomplete="off" />
		</label>
		<label>
			<span>Description</span>
			<textarea name="description" rows="2"></textarea>
		</label>
		<button class="btn-secondary" type="submit">Link existing video</button>
	</form>
</details>

<div class="card-grid two-up align-start">
	<form
		class="panel stack-form"
		method="POST"
		action="?/importMembers"
		enctype="multipart/form-data"
		use:enhance
	>
		<h2>Import purchasers</h2>
		<p>
			Upload a ShivWorks buyer export or paste CSV rows. Required columns:
			<code>email</code> and either <code>tier</code>, <code>package</code>, or
			<code>product</code>. Optional columns: <code>name</code>, <code>customer_name</code>,
			<code>first_name</code>,
			<code>last_name</code>, and <code>order_id</code>.
		</p>
		<label>
			<span>CSV file</span>
			<input name="csvFile" type="file" accept=".csv,text/csv" />
		</label>
		<label>
			<span>Or paste CSV rows</span>
			<textarea
				name="csvData"
				rows="8"
				placeholder={'email,name,tier\nmember@example.com,Craig Douglas,vip'}
				>{form?.action === 'importMembers' ? form?.values?.csvData || '' : ''}</textarea
			>
		</label>
		<label class="inline-checkbox">
			<input
				name="sendOnboardingEmail"
				type="checkbox"
				checked={form?.action === 'importMembers' && form?.values?.sendOnboardingEmail}
			/>
			<span>Send onboarding email for this import (off by default)</span>
		</label>
		{#if form?.action === 'importMembers' && form?.error}
			<div class="status-message error" role="alert">{form.error}</div>
		{:else if form?.action === 'importMembers' && form?.success}
			<div class="status-message" role="status">{form.success}</div>
		{/if}
		<button class="btn-primary" type="submit">Import members</button>
	</form>

	<div class="panel adm-list-panel" id="imports">
		<div class="adm-list-head">
			<h2>Import queue · {filteredImports.length} shown of {data.imports.length}</h2>
			{#if data.imports.length > 0}
				<input
					class="adm-list-search-input"
					type="search"
					bind:value={importSearch}
					placeholder="Search name or email…"
					autocomplete="off"
					aria-label="Search import queue"
				/>
			{/if}
		</div>
		<div class="import-stats">
			<div>
				<strong>{data.importStats.total}</strong>
				<span>Total purchases</span>
			</div>
			<div>
				<strong>{data.importStats.bronze}</strong>
				<span>Bronze sold</span>
			</div>
			<div>
				<strong>{data.importStats.vip}</strong>
				<span>VIP sold</span>
			</div>
			<div>
				<strong>{data.importStats.queued}</strong>
				<span>Awaiting signup</span>
			</div>
			<div>
				<strong>{data.importStats.claimed}</strong>
				<span>Signed up</span>
			</div>
		</div>
		{#if data.importStats.queued > 0}
			<div class="import-nudge-bulk">
				<button
					class="btn-secondary"
					type="button"
					onclick={() => (showBulkNudgeConfirmation = true)}
				>
					Review re-nudge recipients ({data.importStats.queued})
				</button>
				<small>Skips claimed rows and anyone emailed in the last 24 hours.</small>
				{#if showBulkNudgeConfirmation}
					<div
						class="status-message subtle"
						role="dialog"
						aria-labelledby="bulk-nudge-confirmation-title"
					>
						<strong id="bulk-nudge-confirmation-title">
							Send onboarding re-nudges to eligible queued buyers?
						</strong>
						<p>
							Up to {data.importStats.queued} awaiting-signup records will be checked. Claimed, inactive,
							ineligible, and recently emailed records will be skipped.
						</p>
						<div class="inline-actions">
							<button
								class="btn-secondary"
								type="button"
								onclick={() => (showBulkNudgeConfirmation = false)}
							>
								Cancel
							</button>
							<form method="POST" action="?/nudgeAwaitingSignups">
								<input type="hidden" name="confirmBulkNudge" value="confirm" />
								<button class="btn-primary" type="submit"> Confirm and send re-nudges </button>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{/if}
		<div class="adm-scroll-body">
			<div class="list-stack adm-list-stack">
				{#if data.imports.length === 0}
					<div class="list-card">
						<strong>No purchaser imports yet.</strong>
						<p>Imported members will appear here until they finish signup and claim access.</p>
					</div>
				{:else if filteredImports.length === 0}
					<div class="list-card">
						<strong>No imports match your search.</strong>
						<p>Try a different name or email.</p>
					</div>
				{:else}
					{#each filteredImports as imported}
						<div class="list-card">
							<div class="member-import-head">
								<strong>{imported.name}</strong>
								<span class="membership-badge">{imported.tier.toUpperCase()}</span>
							</div>
							<p>{imported.email}</p>
							<small>
								{#if imported.claimedAt}
									Signed up {new Date(imported.claimedAt).toLocaleString()}
								{:else if imported.lastEmailedAt}
									Onboarding sent {new Date(imported.lastEmailedAt).toLocaleString()}
								{:else}
									Queued for signup
								{/if}
							</small>
							{#if imported.sourceRef}
								<small>Source ref: {imported.sourceRef}</small>
							{/if}
							{#if !imported.claimedAt && (imported.tier === 'bronze' || imported.tier === 'vip') && imported.accessStatus === 'active'}
								<form method="POST" action="?/resendImportOnboarding" class="import-nudge-row">
									<input type="hidden" name="email" value={imported.email} />
									<button class="ghost-link" type="submit">Re-nudge signup email</button>
								</form>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<div class="card-grid two-up align-start">
	<div class="panel adm-list-panel">
		<div class="adm-list-head">
			<h2>Members · {filteredMembers.length} shown of {data.members.length}</h2>
			<label class="adm-list-search">
				<input
					type="search"
					bind:value={memberSearch}
					placeholder="Search name or email…"
					autocomplete="off"
					aria-label="Search members"
				/>
			</label>
		</div>
		<div class="adm-scroll-body">
			{#if data.members.length === 0}
				<div class="adm-empty-state">
					<strong>No members yet.</strong>
					<p>Members appear here after they sign up or claim an import.</p>
				</div>
			{:else if filteredMembers.length === 0}
				<div class="adm-empty-state">
					<strong>No members match your search.</strong>
					<p>Try a different name or email.</p>
				</div>
			{:else}
				<table class="mbr">
					<thead>
						<tr>
							<th>Member</th>
							<th>Access controls</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredMembers as member (member.clerkUserId)}
							<tr>
								<td>
									<div class="mbr-id">
										<span class="mbr-av">{memberInitials(member.name)}</span>
										<div>
											<div class="mbr-name">
												{member.name}
												{#if member.role === 'admin'}
													<span class="role-pill admin">Admin</span>
												{/if}
											</div>
											<div class="mbr-email">{member.email}</div>
										</div>
									</div>
								</td>
								<td>
									<form class="mbr-actions" method="POST" action="?/updateMember">
										<input type="hidden" name="memberId" value={member.clerkUserId} />
										<select name="tier" aria-label={`Tier for ${member.name}`}>
											<option value="" selected={member.tier === null}>No tier</option>
											<option value="free" selected={member.tier === 'free'}>Preview</option>
											<option value="bronze" selected={member.tier === 'bronze'}>Bronze</option>
											<option value="vip" selected={member.tier === 'vip'}>VIP</option>
										</select>
										<select name="accessStatus" aria-label={`Access for ${member.name}`}>
											<option value="none" selected={member.accessStatus === 'none'}
												>No access</option
											>
											<option value="active" selected={member.accessStatus === 'active'}
												>Active</option
											>
											<option value="revoked" selected={member.accessStatus === 'revoked'}
												>Revoked</option
											>
										</select>
										<button class="btn-secondary compact-button" type="submit">Save</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	<div class="panel adm-list-panel">
		<div class="adm-list-head">
			<h2>Courses</h2>
			<p class="adm-list-sub">
				Collapsed by default. Edit to change details, archive to hide, or delete only when empty.
			</p>
		</div>
		<div class="adm-scroll-body adm-scroll-body-tall">
			<div class="catalog-stack">
				{#each data.courses as course}
					{@const courseModules = data.modules.filter((module) => module.courseId === course.id)}
					{@const courseExpanded = expandedCourseId === course.id}
					<article class="catalog-course" class:is-expanded={courseExpanded}>
						<div class="catalog-summary">
							<div class="catalog-summary-main">
								<div class="catalog-title-row">
									<strong>{course.title}</strong>
									<span class="membership-badge"
										>{course.courseKind === 'series' ? 'Series' : 'Course'}</span
									>
									<span class="membership-badge">{formatCatalogStatus(course.status)}</span>
									<span class="membership-badge">{getAudienceLabel(course.accessTier)}</span>
									{#if course.badgeText}
										<span class="membership-badge">{course.badgeText}</span>
									{/if}
								</div>
								<small class="catalog-meta">
									{courseModules.length} module{courseModules.length === 1 ? '' : 's'}
									· /library/{course.slug}
								</small>
							</div>
							<div class="catalog-actions">
								<a
									class="ghost-link compact-button"
									href="/library/{course.slug}"
									target="_blank"
									rel="noreferrer"
								>
									Preview
								</a>
								<button
									type="button"
									class="btn-secondary compact-button"
									onclick={() => toggleCourseEditor(course.id)}
								>
									{courseExpanded ? 'Close' : 'Edit'}
								</button>
								{#if course.status !== 'archived'}
									<form method="POST" action="?/archiveCourse">
										<input type="hidden" name="courseId" value={course.id} />
										<button
											class="btn-secondary compact-button"
											type="submit"
											onclick={(event) => {
												if (!confirmArchive(course.title)) event.preventDefault();
											}}
										>
											Archive
										</button>
									</form>
								{/if}
								{#if courseModules.length === 0}
									<form method="POST" action="?/deleteCourse">
										<input type="hidden" name="courseId" value={course.id} />
										<button
											class="btn-secondary compact-button danger-action"
											type="submit"
											onclick={(event) => {
												if (!confirmDelete(course.title, 'course')) event.preventDefault();
											}}
										>
											Delete
										</button>
									</form>
								{/if}
							</div>
						</div>

						{#if courseExpanded}
							<form class="catalog-editor stack-form" method="POST" action="?/updateCourse">
								<input type="hidden" name="courseId" value={course.id} />
								<div class="inline-fields">
									<label>
										<span>Status</span>
										<select name="status">
											<option value="coming_soon" selected={course.status === 'coming_soon'}
												>Coming soon</option
											>
											<option value="available" selected={course.status === 'available'}
												>Available</option
											>
											<option value="archived" selected={course.status === 'archived'}
												>Archived</option
											>
										</select>
									</label>
									<label>
										<span>Access</span>
										<select name="accessTier">
											<option value="free" selected={course.accessTier === 'free'}
												>Preview access</option
											>
											<option value="member" selected={course.accessTier === 'member'}
												>Founding members</option
											>
											<option value="vip" selected={course.accessTier === 'vip'}>VIP tagged</option>
										</select>
									</label>
									<label>
										<span>Badge text</span>
										<input name="badgeText" value={course.badgeText || ''} placeholder="Optional" />
									</label>
								</div>
								<div class="catalog-actions">
									<button class="btn-secondary compact-button" type="submit">Save course</button>
								</div>
							</form>
						{/if}

						{#if courseModules.length > 0}
							<div class="catalog-module-list">
								{#each courseModules as module}
									{@const moduleEpisodes = episodesForModule(module.id)}
									{@const moduleExpanded = expandedModuleId === module.id}
									<article class="catalog-module" class:is-expanded={moduleExpanded}>
										<div class="catalog-summary">
											<div class="catalog-summary-main">
												<div class="catalog-title-row">
													<strong>{module.title}</strong>
													<span class="membership-badge">{formatCatalogStatus(module.status)}</span>
													<span class="membership-badge"
														>{module.videoKind === 'none'
															? 'Episodes'
															: module.videoKind.toUpperCase()}</span
													>
												</div>
												<small class="catalog-meta">{moduleMediaHint(module.id)}</small>
											</div>
											<div class="catalog-actions">
												<a
													class="ghost-link compact-button"
													href="/library/{course.slug}?module={encodeURIComponent(module.id)}"
													target="_blank"
													rel="noreferrer"
												>
													Preview
												</a>
												<button
													type="button"
													class="btn-secondary compact-button"
													onclick={() => toggleModuleEditor(module.id)}
												>
													{moduleExpanded ? 'Close' : 'Edit'}
												</button>
												{#if module.status !== 'archived'}
													<form method="POST" action="?/archiveModule">
														<input type="hidden" name="moduleId" value={module.id} />
														<button
															class="btn-secondary compact-button"
															type="submit"
															onclick={(event) => {
																if (!confirmArchive(module.title)) event.preventDefault();
															}}
														>
															Archive
														</button>
													</form>
												{/if}
												{#if moduleEpisodes.length === 0}
													<form method="POST" action="?/deleteModule">
														<input type="hidden" name="moduleId" value={module.id} />
														<button
															class="btn-secondary compact-button danger-action"
															type="submit"
															onclick={(event) => {
																if (!confirmDelete(module.title, 'module')) event.preventDefault();
															}}
														>
															Delete
														</button>
													</form>
												{/if}
											</div>
										</div>

										{#if moduleExpanded}
											<form class="catalog-editor stack-form" method="POST" action="?/updateModule">
												<input type="hidden" name="moduleId" value={module.id} />
												<div class="inline-fields">
													<label>
														<span>Module title</span>
														<input name="title" value={module.title} required />
													</label>
													<label>
														<span>Status</span>
														<select name="status">
															<option value="coming_soon" selected={module.status === 'coming_soon'}
																>Coming soon</option
															>
															<option value="available" selected={module.status === 'available'}
																>Available</option
															>
															<option value="archived" selected={module.status === 'archived'}
																>Archived</option
															>
														</select>
													</label>
													<label>
														<span>Video type</span>
														<select name="videoKind">
															<option value="none" selected={module.videoKind === 'none'}
																>No playback</option
															>
															<option value="mp4" selected={module.videoKind === 'mp4'}>MP4</option>
															<option value="embed" selected={module.videoKind === 'embed'}
																>Embed</option
															>
														</select>
													</label>
												</div>
												<label>
													<span>Description</span>
													<textarea name="description" rows="2">{module.description || ''}</textarea
													>
												</label>
												<div class="inline-fields">
													<label>
														<span>Video URL</span>
														<input
															name="videoUrl"
															value={module.videoUrl || ''}
															placeholder="/videos/example.mp4 or Stream embed URL"
														/>
													</label>
													<label>
														<span>Duration</span>
														<input
															name="durationLabel"
															value={module.durationLabel || ''}
															placeholder="08 min"
														/>
													</label>
												</div>
												<label class="inline-checkbox">
													<input name="sendReleaseEmail" type="checkbox" />
													<span>Send release alert if this update moves the module live</span>
												</label>
												<div class="catalog-actions">
													<button class="btn-secondary compact-button" type="submit"
														>Save module</button
													>
													<a
														class="ghost-link compact-button"
														href="/library/{course.slug}?module={encodeURIComponent(module.id)}"
														target="_blank"
														rel="noreferrer"
													>
														Preview
													</a>
												</div>
											</form>
										{/if}

										{#if moduleEpisodes.length > 0}
											<div class="episode-stack">
												{#each moduleEpisodes as episode}
													<div class="list-card episode-card">
														<div class="episode-head">
															<strong>Episode {episode.episodeNumber}: {episode.title}</strong>
															<div class="episode-status-chips">
																<span class="membership-badge"
																	>{formatCatalogStatus(episode.status)}</span
																>
																{#if episode.media}
																	<span
																		class="ingest-status-chip {mediaStatusClass(
																			episode.media.ingestStatus
																		)}"
																	>
																		{mediaStatusLabel(episode.media.ingestStatus)}
																	</span>
																{:else}
																	<span class="ingest-status-chip error">No video</span>
																{/if}
															</div>
														</div>
														<p>
															{episode.description ||
																module.description ||
																'No episode description yet.'}
														</p>
														<div class="episode-actions">
															<form
																class="episode-status-form"
																method="POST"
																action="?/updateEpisode"
															>
																<input type="hidden" name="episodeId" value={episode.id} />
																<select name="status" aria-label={`Status for ${episode.title}`}>
																	<option
																		value="coming_soon"
																		selected={episode.status === 'coming_soon'}>Coming soon</option
																	>
																	<option
																		value="available"
																		selected={episode.status === 'available'}>Available</option
																	>
																	<option value="archived" selected={episode.status === 'archived'}
																		>Archived</option
																	>
																</select>
																<button class="btn-secondary compact-button" type="submit"
																	>Save status</button
																>
															</form>
															<a
																class="ghost-link compact-button"
																href="/library/{episode.courseSlug}?module={encodeURIComponent(
																	module.id
																)}&episode={encodeURIComponent(episode.id)}"
																target="_blank"
																rel="noreferrer"
															>
																Preview
															</a>
															{#if episode.media}
																{#if episode.media.provider === 'cloudflare_stream' && episode.media.ingestStatus !== 'ready'}
																	<button
																		class="btn-secondary compact-button"
																		type="button"
																		disabled={syncingMediaAssetId === episode.media.id}
																		onclick={() =>
																			episode.media && syncStreamMedia(episode.media.id)}
																	>
																		{syncingMediaAssetId === episode.media.id
																			? 'Syncing...'
																			: 'Sync Stream'}
																	</button>
																{/if}
																{#if episode.media.ingestStatus === 'pending_upload' || episode.media.ingestStatus === 'failed'}
																	<form method="POST" action="?/discardUpload">
																		<input type="hidden" name="episodeId" value={episode.id} />
																		<button class="btn-secondary compact-button" type="submit">
																			Discard upload
																		</button>
																	</form>
																{/if}
															{/if}
														</div>
														{#if episode.media}
															<small>
																{getAudienceLabel(episode.accessTier)} ·
																{#if episode.media.sourceBytes}
																	{formatBytes(episode.media.sourceBytes)}
																{:else}
																	No file size reported
																{/if}
															</small>
															{#if mediaSyncStatus[episode.media.id]}
																<small>{mediaSyncStatus[episode.media.id]}</small>
															{/if}
															{#if mediaSyncError[episode.media.id]}
																<small class="error-copy">{mediaSyncError[episode.media.id]}</small>
															{/if}
															{#if episode.media.failureReason}
																<small class="error-copy">{episode.media.failureReason}</small>
															{/if}
														{:else}
															<small>{getAudienceLabel(episode.accessTier)} · No media</small>
														{/if}
													</div>
												{/each}
											</div>
										{/if}
									</article>
								{/each}
							</div>
						{:else}
							<p class="catalog-empty">No modules yet. Add one from Upload destination above.</p>
						{/if}
					</article>
				{/each}
			</div>
		</div>
	</div>
</div>

<div class="card-grid two-up align-start">
	<form class="panel stack-form" method="POST" action="?/createUpdate">
		<h2>Post update</h2>
		<label>
			<span>Title</span>
			<input name="title" required />
		</label>
		<label>
			<span>Audience</span>
			<select name="audience">
				<option value="free">Preview access</option>
				<option value="member" selected>Paid members</option>
				<option value="vip">VIP only</option>
			</select>
		</label>
		<label>
			<span>Body</span>
			<textarea name="bodyMarkdown" rows="6" required></textarea>
		</label>
		<label class="inline-checkbox">
			<input name="sendUpdateEmail" type="checkbox" checked />
			<span>Email this update to members who opted into build updates</span>
		</label>
		<button class="btn-primary" type="submit">Publish update</button>
	</form>

	<form class="panel stack-form" method="POST" action="?/createEvent" onsubmit={syncScheduleForm}>
		<input type="hidden" name="timezoneOffsetMinutes" value={timezoneOffsetMinutes} />
		<input type="hidden" name="startsAtEpoch" />
		<input type="hidden" name="endsAtEpoch" />
		<h2>Create event</h2>
		<label>
			<span>Title</span>
			<input name="title" required />
		</label>
		<label>
			<span>Description</span>
			<textarea name="description" rows="4" required></textarea>
		</label>
		<div class="inline-fields">
			<select name="eventKind">
				<option value="livestream">Livestream</option>
				<option value="vip_call">VIP call</option>
			</select>
			<select name="accessTier">
				<option value="free">Preview access</option>
				<option value="member" selected>Paid members</option>
				<option value="vip">VIP only</option>
			</select>
			<select name="status">
				<option value="scheduled">Scheduled</option>
				<option value="live">Live</option>
				<option value="ended">Ended</option>
			</select>
		</div>
		<label>
			<span>Starts at</span>
			<input name="startsAt" type="datetime-local" />
		</label>
		<label>
			<span>Ends at</span>
			<input name="endsAt" type="datetime-local" />
		</label>
		<small>
			Enter times in {scheduleTimezoneLabel}. Members see the event converted to their local
			timezone; email reminders include an explicit timezone.
		</small>
		<div class="inline-fields">
			<select name="locationType">
				<option value="youtube">YouTube</option>
				<option value="zoom">Zoom</option>
				<option value="external">External</option>
			</select>
			<input name="embedUrl" placeholder="Embed URL" />
		</div>
		<label>
			<span>Booking URL</span>
			<input name="bookingUrl" placeholder="Optional booking URL" />
		</label>
		<label class="inline-checkbox">
			<input name="reminderEnabled" type="checkbox" checked />
			<span>Allow RSVP reminders for this event</span>
		</label>
		<button class="btn-primary" type="submit">Create event</button>
	</form>
</div>

<div class="card-grid two-up align-start">
	<div class="panel">
		<h2>Recent updates</h2>
		<div class="list-stack">
			{#each data.updates as update}
				<div class="list-card">
					<strong>{update.title}</strong>
					<p>{update.bodyMarkdown}</p>
					<small>
						{getAudienceLabel(update.audience)} · {new Date(update.publishedAt).toLocaleString()}
					</small>
				</div>
			{/each}
		</div>
	</div>

	<div class="panel">
		<h2>Scheduled events</h2>
		<div class="list-stack">
			{#each data.events as event}
				<div class="list-card stack-form">
					<form class="stack-form" method="POST" action="?/updateEvent" onsubmit={syncScheduleForm}>
						<input type="hidden" name="id" value={event.id} />
						<input type="hidden" name="timezoneOffsetMinutes" value={timezoneOffsetMinutes} />
						<input type="hidden" name="startsAtEpoch" value={event.startsAt ?? ''} />
						<input type="hidden" name="endsAtEpoch" value={event.endsAt ?? ''} />
						<div class="inline-fields">
							<label>
								<span>Title</span>
								<input name="title" value={event.title} required />
							</label>
							<label>
								<span>Status</span>
								<select name="status">
									<option value="scheduled" selected={event.status === 'scheduled'}
										>Scheduled</option
									>
									<option value="live" selected={event.status === 'live'}>Live</option>
									<option value="ended" selected={event.status === 'ended'}>Ended</option>
								</select>
							</label>
						</div>
						<small>
							Displayed in {scheduleTimezoneLabel}; member views convert to each viewer's local
							timezone.
						</small>
						<label>
							<span>Description</span>
							<textarea name="description" rows="3">{event.description}</textarea>
						</label>
						<div class="inline-fields">
							<label>
								<span>Event kind</span>
								<select name="eventKind">
									<option value="livestream" selected={event.eventKind === 'livestream'}
										>Livestream</option
									>
									<option value="vip_call" selected={event.eventKind === 'vip_call'}
										>VIP call</option
									>
								</select>
							</label>
							<label>
								<span>Audience</span>
								<select name="accessTier">
									<option value="free" selected={event.accessTier === 'free'}>Preview access</option
									>
									<option value="member" selected={event.accessTier === 'member'}
										>Paid members</option
									>
									<option value="vip" selected={event.accessTier === 'vip'}>VIP only</option>
								</select>
							</label>
							<label>
								<span>Location type</span>
								<select name="locationType">
									<option value="youtube" selected={event.locationType === 'youtube'}
										>YouTube</option
									>
									<option value="zoom" selected={event.locationType === 'zoom'}>Zoom</option>
									<option value="external" selected={event.locationType === 'external'}
										>External</option
									>
								</select>
							</label>
						</div>
						<div class="inline-fields">
							<label>
								<span>Starts at</span>
								<input
									name="startsAt"
									type="datetime-local"
									value={toDateTimeLocal(event.startsAt)}
								/>
							</label>
							<label>
								<span>Ends at</span>
								<input name="endsAt" type="datetime-local" value={toDateTimeLocal(event.endsAt)} />
							</label>
						</div>
						<label>
							<span>Embed URL</span>
							<input name="embedUrl" type="url" value={event.embedUrl || ''} />
						</label>
						<label>
							<span>Booking URL</span>
							<input name="bookingUrl" type="url" value={event.bookingUrl || ''} />
						</label>
						<label class="inline-checkbox">
							<input name="reminderEnabled" type="checkbox" checked={event.reminderEnabled} />
							<span>Allow RSVP reminders for this event</span>
						</label>
						<button class="btn-secondary" type="submit">Save event</button>
					</form>
					{#if event.eventKind === 'livestream' && event.startsAt && event.status !== 'ended' && event.reminderEnabled}
						<form method="POST" action="?/sendReminder">
							<input type="hidden" name="eventId" value={event.id} />
							<button class="btn-secondary" type="submit">Send RSVP reminders</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="card-grid two-up align-start">
	<div class="panel">
		<h2>External links</h2>
		<div class="list-stack">
			{#each data.links as link}
				<form class="list-card stack-form" method="POST" action="?/updateLink">
					<input type="hidden" name="id" value={link.id} />
					<div class="inline-fields">
						<label>
							<span>Label</span>
							<input name="label" value={link.label} required />
						</label>
						<label>
							<span>Key</span>
							<input name="linkKey" value={link.linkKey} />
						</label>
					</div>
					<label>
						<span>URL</span>
						<input name="url" type="url" value={link.url} required />
					</label>
					<div class="inline-fields">
						<label>
							<span>Audience</span>
							<select name="audience">
								<option value="free" selected={link.audience === 'free'}>Preview access</option>
								<option value="member" selected={link.audience === 'member'}>Paid members</option>
								<option value="vip" selected={link.audience === 'vip'}>VIP only</option>
							</select>
						</label>
						<label>
							<span>Sort order</span>
							<input name="sortOrder" type="number" value={link.sortOrder} />
						</label>
						<label>
							<span>CTA text</span>
							<input name="ctaText" value={link.ctaText || ''} />
						</label>
					</div>
					<label>
						<span>Description</span>
						<textarea name="description" rows="3">{link.description || ''}</textarea>
					</label>
					<button class="btn-secondary" type="submit">Save link</button>
				</form>
			{/each}
		</div>
	</div>

	<form class="panel stack-form" method="POST" action="?/createLink">
		<h2>Add external link</h2>
		<label>
			<span>Label</span>
			<input name="label" required />
		</label>
		<label>
			<span>URL</span>
			<input name="url" type="url" required />
		</label>
		<div class="inline-fields">
			<label>
				<span>Audience</span>
				<select name="audience">
					<option value="free">Preview access</option>
					<option value="member" selected>Paid members</option>
					<option value="vip">VIP only</option>
				</select>
			</label>
			<label>
				<span>Sort order</span>
				<input name="sortOrder" type="number" value="0" />
			</label>
			<label>
				<span>Link key</span>
				<input name="linkKey" placeholder="optional-internal-key" />
			</label>
		</div>
		<label>
			<span>Description</span>
			<textarea name="description" rows="4"></textarea>
		</label>
		<label>
			<span>CTA text</span>
			<input name="ctaText" placeholder="Open resource" />
		</label>
		<button class="btn-primary" type="submit">Add link</button>
	</form>
</div>

<div class="panel">
	<h2>VIP call requests</h2>
	<div class="list-stack">
		{#if data.vipRequests.length === 0}
			<div class="list-card">
				<strong>No open VIP requests</strong>
				<p>New requests will appear here as members submit them from the product.</p>
			</div>
		{:else}
			{#each data.vipRequests as request}
				<form
					class="list-card stack-form"
					method="POST"
					action="?/approveVip"
					onsubmit={syncScheduleForm}
				>
					<strong>{request.memberName || 'VIP member'}</strong>
					<p>{request.memberEmail || request.memberId}</p>
					<p>{request.goals}</p>
					{#if request.preferredMonth}
						<p><strong>Preferred month:</strong> {request.preferredMonth}</p>
					{/if}
					{#if request.notes}
						<p><strong>Notes:</strong> {request.notes}</p>
					{/if}
					<input type="hidden" name="requestId" value={request.id} />
					<input type="hidden" name="memberId" value={request.memberId} />
					<input type="hidden" name="timezoneOffsetMinutes" value={timezoneOffsetMinutes} />
					<input type="hidden" name="startsAtEpoch" />
					<input type="hidden" name="endsAtEpoch" />
					<div class="inline-fields">
						<input name="startsAt" type="datetime-local" required />
						<input name="endsAt" type="datetime-local" required />
					</div>
					<small>
						Enter the booking in {scheduleTimezoneLabel}. The confirmation email includes an
						explicit timezone.
					</small>
					<label>
						<span>Zoom join URL</span>
						<input name="zoomJoinUrl" placeholder="https://zoom.us/j/..." />
					</label>
					<button class="btn-secondary" type="submit">Approve and schedule</button>
				</form>
			{/each}
		{/if}
	</div>
</div>

<style>
	.adm-page-copy {
		color: var(--color-fg-secondary);
		max-width: 52rem;
		margin: 0 0 1.25rem;
		line-height: 1.55;
	}

	.member-import-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.episode-stack {
		display: grid;
		gap: 0.75rem;
		margin: 0.25rem 0 0.75rem 1rem;
	}

	.episode-card {
		border-left: 3px solid rgba(255, 255, 255, 0.18);
	}

	.episode-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.episode-status-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.compact-button {
		align-self: flex-start;
		margin-top: 0.35rem;
		padding: 0.55rem 0.8rem;
		font-size: 0.68rem;
	}

	.episode-status-form .compact-button {
		margin-top: 0;
	}

	.adm-list-sub {
		margin: 0.35rem 0 0;
		color: var(--color-fg-muted);
		font-size: 0.85rem;
		line-height: 1.45;
	}

	.catalog-stack {
		display: grid;
		gap: 0.85rem;
	}

	.catalog-course,
	.catalog-module {
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.03);
		padding: 0.85rem 1rem;
	}

	.catalog-course.is-expanded,
	.catalog-module.is-expanded {
		border-color: rgba(185, 28, 28, 0.35);
		background: rgba(255, 255, 255, 0.045);
	}

	.catalog-module-list {
		display: grid;
		gap: 0.65rem;
		margin-top: 0.85rem;
		padding-left: 0.65rem;
		border-left: 2px solid rgba(255, 255, 255, 0.1);
	}

	.catalog-summary {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.catalog-summary-main {
		min-width: 0;
		flex: 1;
	}

	.catalog-title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem;
	}

	.catalog-title-row strong {
		margin-right: 0.15rem;
	}

	.catalog-meta {
		display: block;
		margin-top: 0.4rem;
		color: var(--color-fg-muted);
	}

	.catalog-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		align-items: center;
	}

	.catalog-actions form {
		margin: 0;
	}

	.catalog-editor {
		margin-top: 0.85rem;
		padding-top: 0.85rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.catalog-empty {
		margin: 0.85rem 0 0;
		color: var(--color-fg-muted);
		font-size: 0.88rem;
	}

	.episode-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin: 0.45rem 0;
	}

	.danger-action {
		border-color: rgba(255, 120, 120, 0.35);
		color: #ffb4b4;
	}

	.subtle {
		background: rgba(255, 255, 255, 0.06);
	}

	.destination-toggle-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.destination-subform {
		margin-top: 0.75rem;
		padding: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
	}

	.error-copy {
		color: #ff9b9b;
	}

	.upload-form select {
		width: 100%;
		min-height: 3.35rem;
		appearance: none;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		background:
			linear-gradient(45deg, transparent 50%, var(--color-fg-muted) 50%) calc(100% - 1.05rem) 50% /
				0.45rem 0.45rem no-repeat,
			linear-gradient(135deg, var(--color-fg-muted) 50%, transparent 50%) calc(100% - 0.78rem) 50% /
				0.45rem 0.45rem no-repeat,
			rgba(0, 0, 0, 0.84);
		color: var(--color-fg-primary);
		font: inherit;
		padding: 0.85rem 2.1rem 0.85rem 1rem;
		box-shadow: inset 0 0 0 1px rgba(120, 15, 20, 0.12);
	}

	.upload-form select:hover {
		border-color: rgba(185, 28, 28, 0.5);
	}

	.upload-form select:focus {
		outline: 2px solid rgba(185, 28, 28, 0.35);
		outline-offset: 2px;
		border-color: var(--color-accent);
	}

	@media (max-width: 760px) {
		.episode-stack {
			margin-left: 0;
		}

		.episode-head {
			align-items: flex-start;
			flex-direction: column;
		}

		.catalog-module-list {
			padding-left: 0;
			border-left: 0;
		}

		.catalog-summary {
			flex-direction: column;
		}
	}
</style>
