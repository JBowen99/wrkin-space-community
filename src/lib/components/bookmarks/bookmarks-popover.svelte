<script lang="ts">
	import { Popover, Tooltip } from 'bits-ui';
	import { invalidateAll } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Bookmark01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import { getModuleTypeIcon } from '$lib/shared/module-icons';
	import { formatRelativeTime } from '$lib/shared/activity-render';
	import type { BookmarkRow, BookmarkTargetType } from '$lib/shared/bookmarks';
	import { buildBookmarkHref } from '$lib/shared/bookmarks';
	import ButtonUi from '../ui/button.svelte';
	import IconButton from '../ui/icon-button.svelte';
	import { watchBookmarkSignal } from './bookmark-state.svelte';

	type Props = {
		activeWrkspaceId: string | null;
	};

	let { activeWrkspaceId }: Props = $props();

	let open = $state(false);
	let tab = $state<'wrkspace' | 'all'>('all');
	let bookmarks = $state<BookmarkRow[]>([]);
	let loading = $state(false);
	let headerAnimating = $state(false);

	let lastSignal = 0;

	$effect(() => {
		const current = watchBookmarkSignal();
		if (current !== lastSignal && current > 0) {
			headerAnimating = true;
		}
		lastSignal = current;
	});

	const showWrkspaceTab = $derived(activeWrkspaceId != null);

	const displayBookmarks = $derived(
		tab === 'wrkspace' && activeWrkspaceId
			? bookmarks.filter((b) => b.wrkspaceId === activeWrkspaceId)
			: bookmarks
	);

	async function loadBookmarks() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (tab === 'wrkspace' && activeWrkspaceId) {
				params.set('wrkspaceId', activeWrkspaceId);
			}
			const res = await fetch(`/api/bookmarks?${params}`);
			if (res.ok) {
				const data = (await res.json()) as { bookmarks: BookmarkRow[] };
				bookmarks = data.bookmarks;
			}
		} finally {
			loading = false;
		}
	}

	async function removeBookmark(
		targetType: BookmarkTargetType,
		targetId: string,
		event: MouseEvent
	) {
		event.preventDefault();
		event.stopPropagation();
		await fetch('/api/bookmarks', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ targetType, targetId })
		});
		await loadBookmarks();
		await invalidateAll();
	}

	function handleOpenChange(value: boolean) {
		open = value;
		if (value) {
			loadBookmarks();
		}
	}

	function handleBookmarkClick() {
		open = false;
	}

	function targetIcon(moduleType: string) {
		try {
			return getModuleTypeIcon(moduleType as 'chat');
		} catch {
			return Bookmark01Icon;
		}
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Tooltip.Root delayDuration={400}>
		<Tooltip.Trigger>
			{#snippet child({ props: tooltipProps })}
				<Popover.Trigger
					{...tooltipProps}
					class="text-ink-muted hover:bg-surface-hover hover:text-ink focus-visible:ring-accent/20 relative inline-flex size-9 items-center justify-center rounded-md transition focus-visible:ring-2 focus-visible:outline-none"
					aria-label="Bookmarks"
				>
					<span
						class="inline-flex {headerAnimating ? 'animate-bookmark-pop' : ''}"
						onanimationend={() => (headerAnimating = false)}
					>
						<HugeiconsIcon icon={Bookmark01Icon} size={20} color="currentColor" strokeWidth={2} />
					</span>
				</Popover.Trigger>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				side="top"
				sideOffset={6}
				class="bg-ink text-surface z-50 max-w-xs rounded-md px-2.5 py-1.5 text-xs font-medium shadow-md"
			>
				Bookmarks
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
	<Popover.Portal>
		<Popover.Content
			align="end"
			class="border-border bg-surface-raised z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-lg"
			sideOffset={8}
		>
			<div class="border-border flex items-center justify-between border-b px-4 py-3">
				<h2 class="font-display text-ink text-sm font-semibold">Bookmarks</h2>
			</div>

			{#if showWrkspaceTab}
				<div class="border-border flex border-b px-2 pt-2">
					<ButtonUi
						type="button"
						variant="unstyled"
						class="flex-1 rounded-t-md px-3 py-2 text-xs font-medium transition {tab === 'wrkspace'
							? 'border-accent text-accent border-b-2'
							: 'text-ink-muted hover:text-ink'}"
						onclick={() => {
							tab = 'wrkspace';
							loadBookmarks();
						}}
					>
						This wrkspace
					</ButtonUi>
					<ButtonUi
						type="button"
						variant="unstyled"
						class="flex-1 rounded-t-md px-3 py-2 text-xs font-medium transition {tab === 'all'
							? 'border-accent text-accent border-b-2'
							: 'text-ink-muted hover:text-ink'}"
						onclick={() => {
							tab = 'all';
							loadBookmarks();
						}}
					>
						All wrkspaces
					</ButtonUi>
				</div>
			{/if}

			<ul class="max-h-[min(24rem,60vh)] overflow-y-auto">
				{#if loading}
					<li class="text-ink-muted px-4 py-8 text-center text-sm">Loading...</li>
				{:else if displayBookmarks.length === 0}
					<li class="text-ink-muted px-4 py-8 text-center text-sm">No bookmarks yet.</li>
				{:else}
					{#each displayBookmarks as bm (bm.id)}
						<li class="border-border/60 border-b last:border-b-0">
							<a
								href={buildBookmarkHref(bm)}
								class="hover:bg-surface-hover group flex items-center gap-3 px-4 py-3 transition"
								onclick={handleBookmarkClick}
							>
								<div
									class="text-ink-muted bg-surface flex size-8 shrink-0 items-center justify-center rounded-md"
								>
									<HugeiconsIcon
										icon={targetIcon(bm.moduleType)}
										size={16}
										color="currentColor"
										strokeWidth={2}
									/>
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-ink truncate text-sm">{bm.label}</p>
									<p class="text-ink-muted mt-0.5 truncate text-xs">
										{#if tab === 'all'}
											{bm.wrkspaceName} &middot;
										{/if}
										{formatRelativeTime(new Date(bm.createdAt))}
									</p>
								</div>
								<IconButton
									label="Remove bookmark"
									size="md"
									variant="subtle"
									onclick={(e) => removeBookmark(bm.targetType, bm.targetId, e)}
									class="opacity-0 transition group-hover:opacity-100"
								>
									<HugeiconsIcon
										icon={Cancel01Icon}
										color="currentColor"
										strokeWidth={2}
									/>
								</IconButton>
							</a>
						</li>
					{/each}
				{/if}
			</ul>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
