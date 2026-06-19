<script lang="ts">
	import { Collapsible } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

type Props = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	class?: string;
	trigger: Snippet;
	children: Snippet;
};

let {
	open = $bindable(false),
	onOpenChange,
	class: className = '',
	trigger,
	children
}: Props = $props();
</script>

<Collapsible.Root bind:open {onOpenChange}>
	<Collapsible.Trigger
		type="button"
		class={cn(
			'group flex w-full cursor-pointer items-center justify-between gap-2 text-left',
			className
		)}
	>
		{@render trigger()}
	</Collapsible.Trigger>
	<Collapsible.Content>
		{@render children()}
	</Collapsible.Content>
</Collapsible.Root>
