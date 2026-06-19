<script lang="ts">
	import { Label } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

	type Props = {
		for?: string;
		id?: string;
		class?: string;
		children: Snippet;
	};

	let { for: htmlFor, id, class: className = '', children }: Props = $props();
</script>

<Label.Root {id} for={htmlFor} class={cn('text-ink text-sm font-medium', className)}>
	{@render children()}
</Label.Root>
