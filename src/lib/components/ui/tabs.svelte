<script lang="ts">
	import { Tabs } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import { tabListClass, tabTriggerClass } from './tabs-styles';

type TabItem = { value: string; label: string };

type Props = {
	tabs: TabItem[];
	value?: string;
	onValueChange?: (value: string) => void;
	listClass?: string;
	triggerClass?: string;
	ariaLabel?: string;
	class?: string;
};

let {
	tabs,
	value = $bindable(''),
	onValueChange,
	listClass = '',
	triggerClass: triggerClassProp = '',
	ariaLabel,
	class: className = ''
}: Props = $props();
</script>

<Tabs.Root
	{value}
	class={className}
	onValueChange={(v) => {
		if (typeof v === 'string') {
			value = v;
			onValueChange?.(v);
		}
	}}
>
	<Tabs.List class={cn(tabListClass, listClass)} aria-label={ariaLabel}>
		{#each tabs as tab (tab.value)}
			<Tabs.Trigger value={tab.value} class={cn(tabTriggerClass, triggerClassProp)}>
				{tab.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
