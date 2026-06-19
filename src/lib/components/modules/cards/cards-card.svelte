<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Bookmark01Icon } from '@hugeicons/core-free-icons';
	import type { BoardCardRow } from '$lib/server/modules';
	import type { CardModuleConfig } from '$lib/shared/cards-schema';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';
	import CardsCardFace from './cards-card-face.svelte';

	type Props = {
		card: BoardCardRow;
		config: CardModuleConfig;
		onclick?: (card: BoardCardRow) => void;
	};

	let { card, config, onclick }: Props = $props();

	const bmCtx = getBookmarkContext();

	const isBookmarked = $derived(bmCtx?.isBookmarked(card.id) ?? false);

	function handleClick() {
		onclick?.(card);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onclick?.(card);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="border-border bg-surface-raised relative rounded-lg border p-3 shadow-sm {onclick
		? 'cursor-pointer hover:border-stone-300'
		: ''}"
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{#if isBookmarked}
		<span class="text-accent pointer-events-none absolute top-1.5 right-1.5">
			<HugeiconsIcon icon={Bookmark01Icon} size={14} color="currentColor" strokeWidth={2.5} />
		</span>
	{/if}
	<CardsCardFace {config} fieldValues={card.fieldValues} />
</div>
