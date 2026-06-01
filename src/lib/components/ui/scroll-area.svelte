<script lang="ts">
	import { ScrollArea } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<ScrollArea.Root class="relative overflow-hidden {className}" type="auto">
	<ScrollArea.Viewport class="h-full max-h-[inherit] w-full">
		{@render children()}
	</ScrollArea.Viewport>
	<ScrollArea.Scrollbar
		orientation="vertical"
		class="flex w-2 touch-none bg-stone-100 p-0.5 transition"
	>
		<ScrollArea.Thumb class="relative flex-1 rounded-full bg-stone-300" />
	</ScrollArea.Scrollbar>
</ScrollArea.Root>
