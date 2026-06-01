<script lang="ts">
	import type { HighlightSegment } from '$lib/shared/chat-search';

	type Props = {
		segments: HighlightSegment[];
	};

	let { segments }: Props = $props();
</script>

{#each segments as segment, i (i)}
	{#if segment.highlight}
		<mark
			class="rounded-sm px-0.5 {segment.active
				? 'bg-amber-400 text-inherit ring-1 ring-amber-600/50'
				: 'bg-amber-200/90 text-inherit'}">{segment.text}</mark
		>
	{:else}
		{segment.text}
	{/if}
{/each}
