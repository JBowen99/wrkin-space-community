<script lang="ts">
	import type { HighlightSegment } from '$lib/shared/chat-search';

	type Props = {
		segments: HighlightSegment[];
		onAccent?: boolean;
	};

	let { segments, onAccent = false }: Props = $props();
</script>

{#each segments as segment, i (i)}
	{#if segment.highlight}
		<mark
			class="rounded-sm px-0.5 {onAccent
				? segment.active
					? 'bg-white/40 text-inherit ring-1 ring-white/60'
					: 'bg-white/25 text-inherit'
				: segment.active
					? 'bg-accent/30 text-inherit ring-1 ring-accent/50'
					: 'bg-accent-muted text-inherit'}">{segment.text}</mark
		>
	{:else}
		{segment.text}
	{/if}
{/each}
