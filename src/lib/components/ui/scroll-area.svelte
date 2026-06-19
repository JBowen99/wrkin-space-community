<script lang="ts">
	import { ScrollArea } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<ScrollArea.Root class={cn('relative overflow-hidden', className)} type="auto">
	<ScrollArea.Viewport class="h-full max-h-[inherit] w-full">
		{@render children()}
	</ScrollArea.Viewport>
	<ScrollArea.Scrollbar
		orientation="vertical"
		class="bg-surface-muted flex w-2 touch-none p-0.5 transition"
	>
		<ScrollArea.Thumb class="bg-surface-inset relative flex-1 rounded-full" />
	</ScrollArea.Scrollbar>
</ScrollArea.Root>
