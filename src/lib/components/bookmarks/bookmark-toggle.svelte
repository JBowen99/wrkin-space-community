<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Bookmark01Icon } from '@hugeicons/core-free-icons';
	import Tooltip from '../ui/tooltip.svelte';
	import type { BookmarkTargetType } from '$lib/shared/bookmarks';
	import { getBookmarkContext } from './bookmark-context.svelte';
	import { signalBookmarkAdded } from './bookmark-state.svelte';

	type Props = {
		targetType: BookmarkTargetType;
		targetId: string;
		label: string;
		contextId?: string | null;
		size?: number;
		class?: string;
	};

	let {
		targetType,
		targetId,
		label,
		contextId = null,
		size = 16,
		class: className = ''
	}: Props = $props();

	const ctx = getBookmarkContext();

	let bookmarked = $state(ctx?.isBookmarked(targetId) ?? false);
	let loading = $state(false);
	let animating = $state(false);
	let wasBookmarked = $state(ctx?.isBookmarked(targetId) ?? false);

	$effect(() => {
		if (bookmarked && !wasBookmarked) {
			animating = true;
			signalBookmarkAdded();
		}
		wasBookmarked = bookmarked;
	});

	async function toggle() {
		if (loading) return;
		loading = true;
		try {
			if (bookmarked) {
				const res = await fetch('/api/bookmarks', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ targetType, targetId })
				});
				if (res.ok) {
					bookmarked = false;
					await invalidateAll();
				}
			} else {
				const res = await fetch('/api/bookmarks', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						teamSlug: ctx?.teamSlug ?? '',
						wrkspaceSlug: ctx?.wrkspaceSlug ?? '',
						moduleId: ctx?.moduleId ?? '',
						moduleType: ctx?.moduleType ?? '',
						targetType,
						targetId,
						contextId,
						label
					})
				});
				if (res.ok || res.status === 201) {
					bookmarked = true;
					await invalidateAll();
				}
			}
		} finally {
			loading = false;
		}
	}
	function handleClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		toggle();
	}
</script>

<Tooltip text={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
	{#snippet trigger(props)}
		<button
			{...props}
			type="button"
			class="inline-flex items-center justify-center rounded-md transition {bookmarked
				? 'text-accent hover:text-accent/80'
				: 'text-ink-muted hover:bg-surface-hover hover:text-ink'} {className}"
			onclick={handleClick}
			disabled={loading}
		>
			<span
				class="inline-flex {animating ? 'animate-bookmark-pop' : ''}"
				onanimationend={() => (animating = false)}
			>
				<HugeiconsIcon
					icon={Bookmark01Icon}
					{size}
					color="currentColor"
					strokeWidth={bookmarked ? 2.5 : 2}
				/>
			</span>
		</button>
	{/snippet}
</Tooltip>
