<script lang="ts">
	import type { BoardCardRow } from '$lib/server/modules';

	type Props = {
		card: BoardCardRow;
		onclick?: (card: BoardCardRow) => void;
	};

	let { card, onclick }: Props = $props();

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
	class="rounded-lg border border-border bg-surface-raised p-3 shadow-sm {onclick
		? 'cursor-pointer hover:border-stone-300'
		: ''}"
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<p class="text-sm font-medium text-ink">{card.title}</p>
	{#if card.body}
		<p class="mt-1 text-xs leading-relaxed text-ink-muted">{card.body}</p>
	{/if}
</div>
