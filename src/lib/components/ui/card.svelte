<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

	type Padding = 'default' | 'compact' | 'none';

	type Props = {
		padding?: Padding;
		interactive?: boolean;
		href?: string;
		class?: string;
		children: Snippet;
	};

	let {
		padding = 'default',
		interactive = false,
		href,
		class: className = '',
		children
	}: Props = $props();

	const paddingClass: Record<Padding, string> = {
		default: 'p-6',
		compact: 'p-4',
		none: 'p-0'
	};

	const shellClass = $derived(
		cn(
			'rounded-xl border border-border bg-surface-raised shadow-sm',
			paddingClass[padding],
			interactive && 'transition hover:border-accent/40 hover:shadow-sm',
			className
		)
	);
</script>

{#if href}
	<a {href} class={cn('block', shellClass)}>
		{@render children()}
	</a>
{:else}
	<div class={shellClass}>
		{@render children()}
	</div>
{/if}
