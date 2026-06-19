<script lang="ts">
	import { RadioGroup, Label, useId } from 'bits-ui';
	import { cn } from '../../cn';

	type Item = { value: string; label: string };

	type Props = {
		value?: string;
		name?: string;
		items: Item[];
		orientation?: 'horizontal' | 'vertical';
		class?: string;
	};

	let {
		value = $bindable(''),
		name,
		items,
		orientation = 'horizontal',
		class: className = ''
	}: Props = $props();

	const itemClass =
		'size-4 shrink-0 rounded-full border border-border bg-surface-raised transition hover:border-accent/40 data-[state=checked]:border-[5px] data-[state=checked]:border-accent';
</script>

<RadioGroup.Root bind:value {name} {orientation} class={cn('flex flex-wrap gap-4', className)}>
	{#each items as item (item.value)}
		{@const id = useId()}
		<div class="flex items-center gap-2">
			<RadioGroup.Item {id} value={item.value} class={itemClass} />
			<Label.Root for={id} class="cursor-pointer text-sm">{item.label}</Label.Root>
		</div>
	{/each}
</RadioGroup.Root>
