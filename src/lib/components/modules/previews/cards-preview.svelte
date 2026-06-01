<script lang="ts">
	import { cardColumnHeaderStyle, cardColumnSurfaceStyle } from '$lib/shared/cards';
	import type { ModulePreview } from '$lib/server/modules';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'cards' }>;
	};

	let { preview }: Props = $props();

	const MAX_VISIBLE_CARDS = 3;

	function visibleCardCount(count: number) {
		return Math.min(count, MAX_VISIBLE_CARDS);
	}

	function overflowCardCount(count: number) {
		return Math.max(0, count - MAX_VISIBLE_CARDS);
	}
</script>

{#if preview.columns.length === 0}
	<PreviewSkeleton variant="cards" />
{:else}
	<div class="flex h-full w-full items-center justify-center gap-2 overflow-hidden">
		{#each preview.columns as column, index (index)}
			<div
				class="flex h-[80%] max-w-[5.5rem] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm"
				style={cardColumnSurfaceStyle(column.color)}
			>
				<div class="shrink-0 border-b px-1.5 py-1.5" style={cardColumnHeaderStyle(column.color)}>
					<p class="truncate text-center text-xs leading-tight font-semibold text-ink">
						{column.title}
					</p>
				</div>
				<div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-1.5 py-2">
					{#each Array.from({ length: visibleCardCount(column.cardCount) }, (_, slotIndex) => slotIndex) as slotIndex (slotIndex)}
						<div
							class="shrink-0 rounded-lg border border-border bg-surface-raised px-2 py-2 shadow-sm"
							aria-hidden="true"
						>
							<div class="h-2 w-2/3 rounded-sm bg-stone-200/90"></div>
							<div class="mt-1.5 h-1.5 w-full rounded-sm bg-stone-100"></div>
						</div>
					{/each}
					{#if overflowCardCount(column.cardCount) > 0}
						<p class="shrink-0 text-center text-xs font-medium text-ink-muted">
							+{overflowCardCount(column.cardCount)}
						</p>
					{/if}
				</div>
			</div>
		{/each}
		{#if preview.moreColumnCount > 0}
			<div
				class="flex h-[80%] shrink-0 items-center justify-center rounded-xl border border-dashed border-border px-1.5 text-xs font-medium text-ink-muted"
			>
				+{preview.moreColumnCount}
			</div>
		{/if}
	</div>
{/if}
