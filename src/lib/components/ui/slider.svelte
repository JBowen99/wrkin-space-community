<script lang="ts">
	import { Slider } from 'bits-ui';
	import { cn } from '../../cn';

	type Props = {
		id?: string;
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		class?: string;
	};

	let {
		id,
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		class: className = ''
	}: Props = $props();
</script>

<Slider.Root
	type="single"
	{min}
	{max}
	{step}
	{disabled}
	bind:value
	class={cn('relative flex w-full touch-none items-center select-none', className)}
>
	<span class="bg-surface-inset relative h-1.5 w-full grow overflow-hidden rounded-full">
		<Slider.Range class="bg-accent absolute h-full rounded-full" />
	</span>
	<Slider.Thumb
		{id}
		index={0}
		class="border-accent bg-surface-raised focus-visible:ring-accent/20 block size-4 rounded-full border-2 shadow-sm transition focus-visible:ring-2 focus-visible:outline-none"
	/>
</Slider.Root>
