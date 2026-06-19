<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { LinkPreview } from 'bits-ui';
	import type { LinkPreviewData } from '$lib/shared/link-preview';

	type Props = {
		container: HTMLElement;
	};

	let { container }: Props = $props();

	let open = $state(false);
	let anchorEl = $state<HTMLElement | null>(null);
	let href = $state('');
	let preview = $state<LinkPreviewData | null>(null);
	let loading = $state(false);
	let imageFailed = $state(false);

	let openTimer: ReturnType<typeof setTimeout> | null = null;
	let closeTimer: ReturnType<typeof setTimeout> | null = null;
	const cache = new Map<string, LinkPreviewData>();

	function clearOpenTimer() {
		if (openTimer) {
			clearTimeout(openTimer);
			openTimer = null;
		}
	}

	function clearCloseTimer() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
	}

	function isPreviewableLink(anchor: HTMLAnchorElement): string | null {
		const url = anchor.getAttribute('href')?.trim();
		if (!url) return null;
		if (/^(mailto:|tel:|#)/i.test(url)) return null;
		return url;
	}

	function hostnameFrom(url: string): string {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	async function loadPreview(url: string) {
		const cached = cache.get(url);
		if (cached) {
			preview = cached;
			loading = false;
			return;
		}

		loading = true;
		preview = {
			url,
			title: hostnameFrom(url),
			description: null,
			image: null,
			siteName: hostnameFrom(url)
		};

		try {
			const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
			if (!res.ok) return;
			const data = (await res.json()) as LinkPreviewData;
			cache.set(url, data);
			if (href === url) {
				preview = data;
			}
		} catch {
			// Keep fallback preview
		} finally {
			if (href === url) loading = false;
		}
	}

	function scheduleOpen(anchor: HTMLAnchorElement, url: string) {
		clearOpenTimer();
		clearCloseTimer();
		openTimer = setTimeout(() => {
			anchorEl = anchor;
			href = url;
			imageFailed = false;
			open = true;
			void loadPreview(url);
		}, 450);
	}

	function scheduleClose() {
		clearOpenTimer();
		clearCloseTimer();
		closeTimer = setTimeout(() => {
			open = false;
		}, 150);
	}

	function onContainerPointerOver(event: PointerEvent) {
		if (event.pointerType === 'touch') return;
		const target = event.target;
		if (!(target instanceof Element)) return;
		const anchor = target.closest('a[href]');
		if (!(anchor instanceof HTMLAnchorElement) || !container.contains(anchor)) return;
		const url = isPreviewableLink(anchor);
		if (!url) return;
		if (anchorEl === anchor && open) return;
		scheduleOpen(anchor, url);
	}

	function onContainerPointerOut(event: PointerEvent) {
		if (event.pointerType === 'touch') return;
		const related = event.relatedTarget;
		if (related instanceof Element && related.closest('[data-doc-link-preview]')) return;
		scheduleClose();
	}

	function onPreviewPointerEnter() {
		clearCloseTimer();
	}

	function onPreviewPointerLeave() {
		scheduleClose();
	}

	onMount(() => {
		container.addEventListener('pointerover', onContainerPointerOver);
		container.addEventListener('pointerout', onContainerPointerOut);
	});

	onDestroy(() => {
		clearOpenTimer();
		clearCloseTimer();
		container.removeEventListener('pointerover', onContainerPointerOver);
		container.removeEventListener('pointerout', onContainerPointerOut);
	});

	const displayTitle = $derived(preview?.title?.trim() || hostnameFrom(href));
	const displaySite = $derived(preview?.siteName?.trim() || hostnameFrom(href));
</script>

<LinkPreview.Root bind:open openDelay={0} closeDelay={0}>
	<LinkPreview.Trigger
		href={href || 'about:blank'}
		class="pointer-events-none sr-only"
		tabindex={-1}
		aria-hidden="true"
	>
		Link preview
	</LinkPreview.Trigger>

	{#if anchorEl}
		<LinkPreview.Portal>
			<LinkPreview.Content
				customAnchor={anchorEl}
				side="top"
				align="start"
				sideOffset={8}
				class="border-border bg-surface-raised z-50 w-72 overflow-hidden rounded-lg border shadow-lg"
				data-doc-link-preview=""
				onpointerenter={onPreviewPointerEnter}
				onpointerleave={onPreviewPointerLeave}
			>
				{#if preview?.image && !imageFailed}
					<img
						src={preview.image}
						alt=""
						class="h-32 w-full object-cover"
						referrerpolicy="no-referrer"
						onerror={() => {
							imageFailed = true;
						}}
					/>
				{/if}
				<div class="space-y-1 p-3">
					<p class="text-ink line-clamp-2 text-sm font-medium">{displayTitle}</p>
					{#if preview?.description}
						<p class="text-ink-muted line-clamp-3 text-xs leading-relaxed">
							{preview.description}
						</p>
					{:else if loading}
						<p class="text-ink-muted text-xs">Loading preview…</p>
					{/if}
					<p class="text-ink-muted truncate pt-1 text-[11px] font-medium uppercase">
						{displaySite}
					</p>
				</div>
			</LinkPreview.Content>
		</LinkPreview.Portal>
	{/if}
</LinkPreview.Root>
