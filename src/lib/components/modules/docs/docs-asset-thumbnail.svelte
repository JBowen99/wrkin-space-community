<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { File01Icon, Link01Icon } from '@hugeicons/core-free-icons';
	import {
		DOC_ASSET_PREVIEW_TEXT_CARD_MAX,
		DOC_ASSET_PREVIEW_TEXT_DETAIL_MAX,
		getDocAssetPreviewMode,
		type DocAssetPreviewMode
	} from '$lib/shared/doc-asset-preview';
	import { renderPdfFirstPageDataUrl } from '../../../doc-asset-pdf-preview';

	type Props = {
		assetId: string;
		kind: 'upload' | 'link';
		mimeType: string | null;
		title: string;
		fileUrl: string;
		linkImage?: string | null;
		variant?: 'card' | 'page';
		/** When true, load immediately (asset detail page). */
		eager?: boolean;
	};

	let {
		assetId,
		kind,
		mimeType,
		title,
		fileUrl,
		linkImage = null,
		variant = 'card',
		eager = false
	}: Props = $props();

	const previewMode = $derived.by((): DocAssetPreviewMode => {
		if (kind === 'link') {
			return linkImage ? 'link-image' : 'icon';
		}
		return getDocAssetPreviewMode(kind, mimeType, title);
	});

	const textMaxLen = $derived(
		variant === 'card' ? DOC_ASSET_PREVIEW_TEXT_CARD_MAX : DOC_ASSET_PREVIEW_TEXT_DETAIL_MAX
	);

	const pdfMaxWidth = $derived(variant === 'card' ? 320 : 720);

	let rootEl = $state<HTMLElement | null>(null);
	let visible = $state(eager);
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let imageSrc = $state<string | null>(null);
	let textPreview = $state<string | null>(null);

	const needsAsyncLoad = $derived(
		previewMode === 'pdf' || previewMode === 'text' || previewMode === 'image'
	);

	const showSkeleton = $derived(needsAsyncLoad && (status === 'idle' || status === 'loading'));

	function shouldLoad(): boolean {
		return browser && visible && needsAsyncLoad && status === 'idle';
	}

	async function loadPreview() {
		if (!browser || status !== 'idle') return;
		status = 'loading';

		try {
			if (previewMode === 'image') {
				imageSrc = fileUrl;
				status = 'ready';
				return;
			}

			if (previewMode === 'link-image' && linkImage) {
				imageSrc = linkImage;
				status = 'ready';
				return;
			}

			if (previewMode === 'pdf') {
				imageSrc = await renderPdfFirstPageDataUrl(fileUrl, pdfMaxWidth);
				status = 'ready';
				return;
			}

			if (previewMode === 'text') {
				const res = await fetch(`/api/docs/assets/${encodeURIComponent(assetId)}/preview`, {
					credentials: 'include'
				});
				if (!res.ok) throw new Error('Preview unavailable');
				const body = (await res.json()) as { text?: string };
				const text = body.text?.trim();
				if (!text) throw new Error('Empty preview');
				textPreview = text.length > textMaxLen ? `${text.slice(0, textMaxLen - 1)}…` : text;
				status = 'ready';
				return;
			}

			status = 'ready';
		} catch {
			status = 'error';
		}
	}

	$effect(() => {
		if (shouldLoad()) {
			void loadPreview();
		}
	});

	onMount(() => {
		if (eager) {
			visible = true;
			return;
		}

		const el = rootEl;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					visible = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '120px' }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={rootEl}
	class="relative flex h-full min-h-0 w-full flex-col overflow-hidden {variant === 'card'
		? 'bg-surface-inset/40'
		: ''}"
	aria-busy={showSkeleton && previewMode !== 'icon'}
>
	{#if showSkeleton && previewMode !== 'icon'}
		<div
			class="absolute inset-0 flex flex-col gap-2 p-3"
			role="status"
			aria-label="Loading preview"
		>
			<div class="skeleton-shimmer h-full min-h-[4rem] flex-1 rounded-md"></div>
			{#if variant === 'page'}
				<div class="skeleton-shimmer h-3 w-4/5 rounded"></div>
				<div class="skeleton-shimmer h-3 w-3/5 rounded"></div>
			{/if}
		</div>
	{/if}

	{#if status === 'ready' && imageSrc}
		<img
			src={imageSrc}
			alt=""
			draggable="false"
			class="h-full w-full object-cover object-top {variant === 'page'
				? 'max-h-[70vh] object-contain'
				: ''}"
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			referrerpolicy={previewMode === 'link-image' ? 'no-referrer' : undefined}
			onerror={() => {
				if (previewMode === 'link-image' || previewMode === 'image') {
					status = 'error';
					imageSrc = null;
				}
			}}
		/>
	{:else if status === 'ready' && textPreview}
		<div
			class="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-3 {variant === 'page'
				? 'max-h-[50vh] overflow-y-auto'
				: ''}"
		>
			<p
				class="text-ink-muted min-h-0 flex-1 font-mono text-[11px] leading-relaxed whitespace-pre-wrap {variant ===
				'card'
					? 'line-clamp-[14]'
					: 'text-sm'}"
			>
				{textPreview}
			</p>
		</div>
	{:else if status === 'error' || previewMode === 'icon'}
		<div class="flex h-full min-h-[4rem] flex-1 flex-col items-center justify-center gap-2 p-4">
			<HugeiconsIcon
				icon={kind === 'link' ? Link01Icon : File01Icon}
				size={variant === 'page' ? 40 : 28}
				color="currentColor"
				class="text-accent/80"
				aria-hidden={true}
			/>
			{#if variant === 'page' && status === 'error'}
				<p class="text-ink-muted text-center text-sm">Preview unavailable</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.skeleton-shimmer {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-border) 35%, transparent) 0%,
			color-mix(in srgb, var(--color-border) 65%, transparent) 50%,
			color-mix(in srgb, var(--color-border) 35%, transparent) 100%
		);
		background-size: 200% 100%;
		animation: docs-asset-shimmer 1.2s ease-in-out infinite;
	}

	@keyframes docs-asset-shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}
</style>
