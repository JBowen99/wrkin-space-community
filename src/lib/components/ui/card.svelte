<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<div class="rounded-xl border border-border bg-surface-raised p-6 shadow-sm {className}">
	{@render children()}
</div>
