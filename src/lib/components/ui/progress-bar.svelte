<script lang="ts">
	import { Progress } from 'bits-ui';
	import { cn } from '../../cn';

	type Variant = 'accent' | 'success' | 'warning' | 'danger';

	type Props = {
		value: number;
		max?: number;
		variant?: Variant;
		class?: string;
		size?: 'sm' | 'md';
	};

	let {
		value,
		max = 100,
		variant = 'accent',
		class: className = '',
		size = 'sm'
	}: Props = $props();

	const percent = $derived(Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0)));

	const fillVariants: Record<Variant, string> = {
		accent: 'bg-accent',
		success: 'bg-success',
		warning: 'bg-warning',
		danger: 'bg-danger'
	};

	const heightClass = $derived(size === 'md' ? 'h-2' : 'h-1.5');
</script>

<Progress.Root
	{value}
	{max}
	class={cn(heightClass, 'bg-surface-inset w-full overflow-hidden rounded-full', className)}
>
	<div
		class={cn('h-full rounded-full transition-[width] duration-300', fillVariants[variant])}
		style="width: {percent}%"
	></div>
</Progress.Root>
