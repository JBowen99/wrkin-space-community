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
	<div class="flex h-full w-full min-w-0 items-center justify-center gap-1 overflow-hidden">
		{#each preview.columns as column, index (index)}
			<div
				class="flex h-[80%] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-sm"
				style={cardColumnSurfaceStyle(column.color)}
			>
				<div class="shrink-0 border-b px-1 py-1" style={cardColumnHeaderStyle(column.color)}>
					<p class="text-ink truncate text-center text-[10px] leading-tight font-semibold">
						{column.title}
					</p>
				</div>
				<div class="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-1 py-1.5">
					{#each Array.from({ length: visibleCardCount(column.cardCount) }, (_, slotIndex) => slotIndex) as slotIndex (slotIndex)}
						<div
							class="border-border bg-surface-raised shrink-0 rounded border px-2 py-2 shadow-sm"
							aria-hidden="true"
						>
							<div class="bg-surface-inset/90 h-2 w-3/4 rounded-sm"></div>
							<div class="bg-surface-muted mt-1.5 h-1.5 w-full rounded-sm"></div>
							<div class="bg-surface-muted mt-1 h-1.5 w-2/3 rounded-sm"></div>
						</div>
					{/each}
					{#if overflowCardCount(column.cardCount) > 0}
						<p class="text-ink-muted shrink-0 text-center text-[10px] font-medium">
							+{overflowCardCount(column.cardCount)}
						</p>
					{/if}
				</div>
			</div>
		{/each}
		{#if preview.moreColumnCount > 0}
			<div
				class="border-border text-ink-muted flex h-[80%] w-6 shrink-0 items-center justify-center rounded-lg border border-dashed text-[10px] font-medium"
			>
				+{preview.moreColumnCount}
			</div>
		{/if}
	</div>
{/if}
