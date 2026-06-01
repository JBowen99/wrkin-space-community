<script lang="ts">
	import { Slider } from 'bits-ui';

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
	class="relative flex w-full touch-none items-center select-none {className}"
>
	<span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-stone-200">
		<Slider.Range class="absolute h-full rounded-full bg-accent" />
	</span>
	<Slider.Thumb
		{id}
		index={0}
		class="block size-4 rounded-full border-2 border-accent bg-surface-raised shadow-sm transition focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:outline-none"
	/>
</Slider.Root>
