<script lang="ts">
	import type { Snippet } from 'svelte';

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

<section class="rounded-xl border border-border bg-surface-raised p-6">
	<header class="mb-4">
		<h2 class="font-display text-lg font-semibold text-ink">{title}</h2>
		{#if description}
			<p class="mt-1 text-sm text-ink-muted">{description}</p>
		{/if}
	</header>
	{@render children()}
</section>
