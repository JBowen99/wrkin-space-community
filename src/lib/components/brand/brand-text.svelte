<script lang="ts">
	import { splitBrandText } from '$lib/shared/brand';

	type Props = {
		text: string;
		class?: string;
	};

	let { text, class: className = '' }: Props = $props();
	const segments = $derived(splitBrandText(text));
</script>

<span class={className}>
	{#each segments as segment, i (i)}
		{#if segment.kind === 'text'}
			{segment.value}
		{:else}
			<span class="text-accent">wrk</span>{segment.suffix}
		{/if}
	{/each}
</span>
