<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '../ui/card.svelte';

	let {
		title,
		description,
		children
	}: {
		title: string;
		description?: string;
		children: Snippet;
	} = $props();
</script>

<Card>
	<header class="mb-4">
		<h2 class="font-display text-ink text-lg font-semibold">{title}</h2>
		{#if description}
			<p class="text-ink-muted mt-1 text-sm">{description}</p>
		{/if}
	</header>
	{@render children()}
</Card>
