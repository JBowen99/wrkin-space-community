<script lang="ts">
	import { Label } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		for?: string;
		id?: string;
		class?: string;
		children: Snippet;
	};

	let { for: htmlFor, id, class: className = '', children }: Props = $props();
</script>

<Label.Root {id} for={htmlFor} class="text-sm font-medium text-ink {className}">
	{@render children()}
</Label.Root>
