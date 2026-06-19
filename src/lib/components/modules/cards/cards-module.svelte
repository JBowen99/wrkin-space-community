<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { DndController, DndDroppable, DndProvider, sortable } from '@horuse/svelte-dnd';
	import type { BoardCardRow, CardBoard, CardColumnRow } from '$lib/server/modules';
	import type { CardFieldValues, CardModuleConfig } from '$lib/shared/cards-schema';
	import { cloneBoard, moveCardInBoard, reorderColumns } from '$lib/shared/cards-board';
	import CardsColumn from './cards-column.svelte';
	import CardsAddColumn from './cards-add-column.svelte';
	import CardsCardDialog from './cards-card-dialog.svelte';
	import CardsColumnDialog from './cards-column-dialog.svelte';
	import CardsSettingsDialog from './cards-settings-dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Tooltip from '../../ui/tooltip.svelte';

	type Props = {
		board: CardBoard;
		cardModuleConfig: CardModuleConfig;
		canManageModules?: boolean;
		focusCardId?: string | null;
		settingsOpen?: boolean;
	};

	let {
		board,
		cardModuleConfig,
		canManageModules = false,
		focusCardId = null,
		settingsOpen = $bindable(false)
	}: Props = $props();

	let columns = $state<CardColumnRow[]>([]);
	let dialogOpen = $state(false);
	let dialogMode = $state<'create' | 'edit'>('edit');
	let dialogCardId = $state('');
	let dialogColumnId = $state('');
	let dialogFieldValues = $state<CardFieldValues>({});

	let columnDialogOpen = $state(false);
	let columnDialogId = $state('');
	let columnDialogTitle = $state('');
	let columnDialogColor = $state('');
	let columnDialogCardCount = $state(0);

	$effect(() => {
		columns = cloneBoard(board.columns);
	});

	function openCard(card: BoardCardRow) {
		dialogMode = 'edit';
		dialogCardId = card.id;
		dialogColumnId = '';
		dialogFieldValues = { ...card.fieldValues };
		dialogOpen = true;
	}

	function openNewCard(columnId: string) {
		dialogMode = 'create';
		dialogCardId = '';
		dialogColumnId = columnId;
		dialogFieldValues = {};
		for (const field of cardModuleConfig.schema.fields) {
			dialogFieldValues[field.key] = null;
		}
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
		columnDialogCardCount = column.cards.length;
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
		if (focusCardId) {
			for (const column of board.columns) {
				const card = column.cards.find((c) => c.id === focusCardId);
				if (card) {
					openCard(card);
					break;
				}
			}
		}
	});

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

<div class="relative mt-6 flex min-h-0 flex-1 flex-col">
	{#if canScrollLeft}
		<Tooltip text="Scroll board left" side="right">
			{#snippet trigger(props)}
				<ButtonUi
					{...props}
					type="button"
					variant="unstyled"
					class="border-border bg-surface-raised/95 text-ink hover:bg-surface-raised absolute top-1/2 -left-5 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition active:scale-95"
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
				</ButtonUi>
			{/snippet}
		</Tooltip>
	{/if}

	{#if canScrollRight}
		<Tooltip text="Scroll board right" side="left">
			{#snippet trigger(props)}
				<ButtonUi
					{...props}
					type="button"
					variant="unstyled"
					class="border-border bg-surface-raised/95 text-ink hover:bg-surface-raised absolute top-1/2 -right-5 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition active:scale-95"
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
				</ButtonUi>
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
						config={cardModuleConfig}
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
	config={cardModuleConfig}
	cardId={dialogCardId}
	columnId={dialogColumnId}
	fieldValues={dialogFieldValues}
	onClose={closeCardDialog}
/>

<CardsColumnDialog
	bind:open={columnDialogOpen}
	columnId={columnDialogId}
	title={columnDialogTitle}
	color={columnDialogColor}
	cardCount={columnDialogCardCount}
	onClose={closeColumnDialog}
/>

{#if canManageModules}
	<CardsSettingsDialog bind:open={settingsOpen} config={cardModuleConfig} />
{/if}
