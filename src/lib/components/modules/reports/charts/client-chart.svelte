<script lang="ts">
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';

	type Props = {
		heightClass?: string;
		placeholder?: string;
		children: Snippet;
	};

	let { heightClass = 'h-48', placeholder = 'Loading chart…', children }: Props = $props();
</script>

{#if browser}
	{@render children()}
{:else}
	<div
		class="border-border bg-surface-muted/40 flex items-center justify-center rounded-lg border border-dashed {heightClass}"
		aria-hidden="true"
	>
		<span class="text-ink-muted text-xs">{placeholder}</span>
	</div>
{/if}
