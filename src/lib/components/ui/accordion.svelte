<script lang="ts">
	import { Accordion } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

type AccordionItem = {
	value: string;
	trigger: Snippet;
	content: Snippet;
};

type Props = {
	items: AccordionItem[];
	type?: 'single' | 'multiple';
	class?: string;
	triggerClass?: string;
	contentClass?: string;
};

let {
	items,
	type = 'multiple',
	class: className = '',
	triggerClass = '',
	contentClass = ''
}: Props = $props();
</script>

<Accordion.Root {type} class={className}>
	{#each items as item (item.value)}
		<Accordion.Item value={item.value}>
			<Accordion.Trigger class={cn('group flex w-full cursor-pointer items-center justify-between gap-2 text-left', triggerClass)}>
				{@render item.trigger()}
			</Accordion.Trigger>
			<Accordion.Content class={contentClass}>
				{@render item.content()}
			</Accordion.Content>
		</Accordion.Item>
	{/each}
</Accordion.Root>
