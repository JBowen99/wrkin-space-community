<script lang="ts">
	import { DndDraggable, DndDroppable, sortable } from '@horuse/svelte-dnd';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Add01Icon } from '@hugeicons/core-free-icons';
	import { cardColumnHeaderStyle, cardColumnSurfaceStyle } from '$lib/shared/cards';
	import type { BoardCardRow, CardColumnRow } from '$lib/server/modules';
	import Tooltip from '../../ui/tooltip.svelte';
	import CardsCard from './cards-card.svelte';

	type Props = {
		column: CardColumnRow;
		columnIndex: number;
		onCardClick?: (card: BoardCardRow) => void;
		onAddCard?: (columnId: string) => void;
		onEditColumn?: (column: CardColumnRow) => void;
	};

	let { column, columnIndex, onCardClick, onAddCard, onEditColumn }: Props = $props();

	const surfaceStyle = $derived(cardColumnSurfaceStyle(column.color));
	const headerStyle = $derived(cardColumnHeaderStyle(column.color));
</script>

<DndDraggable
	id={column.id}
	type="column"
	position={columnIndex}
	class="flex h-full min-h-0 w-72 shrink-0 cursor-grab flex-col active:cursor-grabbing"
>
	<div
		class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm"
		style={surfaceStyle}
	>
		<div
			class="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
			style={headerStyle}
		>
			<div class="flex min-w-0 items-center gap-2">
				<Tooltip text="Edit column name and color">
					{#snippet trigger(props)}
						<button
							{...props}
							type="button"
							class="group min-w-0 truncate text-left text-sm font-semibold text-ink"
							onclick={() => onEditColumn?.(column)}
							onpointerdown={(e) => e.stopPropagation()}
						>
							<span class="relative inline-block max-w-full truncate">
								{column.title}
								<span
									class="pointer-events-none absolute right-0 bottom-0 left-0 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100"
									aria-hidden={true}
								></span>
							</span>
						</button>
					{/snippet}
				</Tooltip>
			</div>
			<div class="flex shrink-0 items-center gap-0.5">
				<Tooltip
					text={column.cards.length === 1
						? '1 card in this column'
						: `${column.cards.length} cards in this column`}
				>
					{#snippet trigger(props)}
						<span
							{...props}
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-[10px] font-medium text-ink-muted tabular-nums"
						>
							{column.cards.length}
						</span>
					{/snippet}
				</Tooltip>
				<Tooltip text="Add card">
					{#snippet trigger(props)}
						<button
							{...props}
							type="button"
							class="flex size-7 items-center justify-center rounded-md text-ink-muted transition hover:bg-black/10 hover:text-ink"
							aria-label="Add card"
							onclick={() => onAddCard?.(column.id)}
							onpointerdown={(e) => e.stopPropagation()}
						>
							<HugeiconsIcon
								icon={Add01Icon}
								size={16}
								color="currentColor"
								strokeWidth={2}
								aria-hidden={true}
							/>
						</button>
					{/snippet}
				</Tooltip>
			</div>
		</div>

		<DndDroppable
			id={column.id}
			strategy={sortable()}
			accepts="card"
			class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
			spacing={8}
		>
			{#each column.cards as card, cardIndex (card.id)}
				<DndDraggable
					id={card.id}
					type="card"
					position={cardIndex}
					class="cursor-grab active:cursor-grabbing"
				>
					<CardsCard {card} onclick={onCardClick} />
				</DndDraggable>
			{/each}
		</DndDroppable>
	</div>
</DndDraggable>
