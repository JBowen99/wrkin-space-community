<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

	type Variant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

	type Props = {
		variant?: Variant;
		class?: string;
		children: Snippet;
	};

	let { variant = 'neutral', class: className = '', children }: Props = $props();

	const variants: Record<Variant, string> = {
		neutral: 'bg-surface-muted text-ink-muted',
		accent: 'bg-accent-muted text-accent',
		success: 'bg-success-muted text-success',
		warning: 'bg-warning-muted text-warning',
		danger: 'bg-danger-muted text-danger'
	};
</script>

<span
	class={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}
>
	{@render children()}
</span>
