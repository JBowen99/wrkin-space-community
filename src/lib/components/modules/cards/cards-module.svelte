<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { DndController, DndDroppable, DndProvider, sortable } from '@horuse/svelte-dnd';
	import type { BoardCardRow, CardBoard, CardColumnRow } from '$lib/server/modules';
	import { cloneBoard, moveCardInBoard, reorderColumns } from '$lib/shared/cards-board';
	import CardsColumn from './cards-column.svelte';
	import CardsAddColumn from './cards-add-column.svelte';
	import CardsCardDialog from './cards-card-dialog.svelte';
	import CardsColumnDialog from './cards-column-dialog.svelte';
	import Tooltip from '../../ui/tooltip.svelte';

	type Props = {
		board: CardBoard;
	};

	let { board }: Props = $props();

	let columns = $state<CardColumnRow[]>([]);
	let dialogOpen = $state(false);
	let dialogMode = $state<'create' | 'edit'>('edit');
	let dialogCardId = $state('');
	let dialogColumnId = $state('');
	let dialogTitle = $state('');
	let dialogBody = $state('');

	let columnDialogOpen = $state(false);
	let columnDialogId = $state('');
	let columnDialogTitle = $state('');
	let columnDialogColor = $state('');

	$effect(() => {
		columns = cloneBoard(board.columns);
	});

	function openCard(card: BoardCardRow) {
		dialogMode = 'edit';
		dialogCardId = card.id;
		dialogColumnId = '';
		dialogTitle = card.title;
		dialogBody = card.body;
		dialogOpen = true;
	}

	function openNewCard(columnId: string) {
		dialogMode = 'create';
		dialogCardId = '';
		dialogColumnId = columnId;
		dialogTitle = '';
		dialogBody = '';
		dialogOpen = true;
	}

	function closeCardDialog() {
		dialogOpen = false;
		dialogCardId = '';
		dialogColumnId = '';
	}

	function openColumn(column: CardColumnRow) {
		columnDialogId = column.id;
		columnDialogTitle = column.title;
		columnDialogColor = column.color;
		columnDialogOpen = true;
	}

	function closeColumnDialog() {
		columnDialogOpen = false;
		columnDialogId = '';
	}

	const controller = new DndController();

	const COLUMNS_CONTAINER_ID = 'board-columns';
	const SCROLL_STEP = 320;

	let scrollEl = $state<HTMLElement | undefined>();
	let canScrollLeft = $state(false);
	let canScrollRight = $state(false);

	function updateScrollState() {
		if (!scrollEl) return;
		const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
		canScrollLeft = scrollLeft > 1;
		canScrollRight = scrollLeft + clientWidth < scrollWidth - 1;
	}

	function scrollBoard(direction: 'left' | 'right') {
		scrollEl?.scrollBy({
			left: direction === 'left' ? -SCROLL_STEP : SCROLL_STEP,
			behavior: 'smooth'
		});
	}

	$effect(() => {
		void columns;
		void tick().then(updateScrollState);
	});

	$effect(() => {
		const el = scrollEl;
		if (!el) return;

		const observer = new ResizeObserver(updateScrollState);
		observer.observe(el);
		updateScrollState();

		return () => observer.disconnect();
	});

	async function postAction(action: string, fields: Record<string, string>): Promise<boolean> {
		const formData = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			formData.set(key, value);
		}

		const response = await fetch(`?/${action}`, {
			method: 'POST',
			body: formData
		});

		const text = await response.text();
		const result = deserialize(text);

		if (result.type === 'failure') {
			return false;
		}

		await invalidateAll();
		return true;
	}

	onMount(() => {
		const unsubscribe = controller.onDrop(async ({ item, source, target }) => {
			if (source.id === COLUMNS_CONTAINER_ID && target.id === COLUMNS_CONTAINER_ID) {
				const previous = cloneBoard(columns);
				columns = reorderColumns(columns, item.id, target.position);
				const ok = await postAction('moveColumn', {
					columnId: item.id,
					position: String(target.position)
				});
				if (!ok) columns = previous;
				return;
			}

			if (source.id === COLUMNS_CONTAINER_ID || target.id === COLUMNS_CONTAINER_ID) {
				return;
			}

			const previous = cloneBoard(columns);
			columns = moveCardInBoard(columns, item.id, target.id, target.position);
			const ok = await postAction('moveCard', {
				cardId: item.id,
				columnId: target.id,
				position: String(target.position)
			});
			if (!ok) columns = previous;
		});

		return unsubscribe;
	});
</script>

<div class="relative mt-6 flex h-[calc(100vh-12rem)] min-h-[24rem] w-full flex-col">
	{#if canScrollLeft}
		<Tooltip text="Scroll board left" side="right">
			{#snippet trigger(props)}
				<button
					{...props}
					type="button"
					class="absolute top-1/2 -left-5 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised/95 text-ink shadow-md backdrop-blur-sm transition hover:bg-surface-raised active:scale-95"
					aria-label="Scroll board left"
					onclick={() => scrollBoard('left')}
				>
					<HugeiconsIcon
						icon={ArrowLeft01Icon}
						size={20}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</button>
			{/snippet}
		</Tooltip>
	{/if}

	{#if canScrollRight}
		<Tooltip text="Scroll board right" side="left">
			{#snippet trigger(props)}
				<button
					{...props}
					type="button"
					class="absolute top-1/2 -right-5 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised/95 text-ink shadow-md backdrop-blur-sm transition hover:bg-surface-raised active:scale-95"
					aria-label="Scroll board right"
					onclick={() => scrollBoard('right')}
				>
					<HugeiconsIcon
						icon={ArrowRight01Icon}
						size={20}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</button>
			{/snippet}
		</Tooltip>
	{/if}

	<div
		bind:this={scrollEl}
		onscroll={updateScrollState}
		class="scrollbar-hidden min-h-0 flex-1 overflow-x-auto"
	>
		<DndProvider {controller}>
			<DndDroppable
				id={COLUMNS_CONTAINER_ID}
				strategy={sortable({ layout: 'horizontal' })}
				accepts="column"
				class="flex h-full w-max items-stretch gap-4"
			>
				{#each columns as column, columnIndex (column.id)}
					<CardsColumn
						{column}
						{columnIndex}
						onCardClick={openCard}
						onAddCard={openNewCard}
						onEditColumn={openColumn}
					/>
				{/each}
				<CardsAddColumn />
			</DndDroppable>
		</DndProvider>
	</div>
</div>

<CardsCardDialog
	bind:open={dialogOpen}
	mode={dialogMode}
	cardId={dialogCardId}
	columnId={dialogColumnId}
	title={dialogTitle}
	body={dialogBody}
	onClose={closeCardDialog}
/>

<CardsColumnDialog
	bind:open={columnDialogOpen}
	columnId={columnDialogId}
	title={columnDialogTitle}
	color={columnDialogColor}
	onClose={closeColumnDialog}
/>
