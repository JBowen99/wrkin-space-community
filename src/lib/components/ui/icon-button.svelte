<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import TooltipUi from './tooltip.svelte';

	type Props = {
		href?: string;
		type?: 'button' | 'submit';
		title?: string;
		label: string;
		tooltip?: string;
		tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
		onclick?: (event: MouseEvent) => void;
		class?: string;
		children: Snippet;
	};

	let {
		href,
		type = 'button',
		title,
		label,
		tooltip,
		tooltipSide = 'top',
		onclick,
		class: className = '',
		children
	}: Props = $props();

	const base =
		'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border text-ink-muted transition hover:border-accent/50 hover:bg-accent-muted/40 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20';
</script>

<TooltipUi text={tooltip ?? ''} side={tooltipSide} disabled={!tooltip}>
	{#snippet trigger(props)}
		{#if href}
			<Button.Root
				{...props}
				{href}
				class="{base} {className}"
				aria-label={label}
				title={tooltip ? undefined : (title ?? label)}
			>
				{@render children()}
			</Button.Root>
		{:else}
			<Button.Root
				{...props}
				{type}
				{onclick}
				class="{base} {className}"
				aria-label={label}
				title={tooltip ? undefined : (title ?? label)}
			>
				{@render children()}
			</Button.Root>
		{/if}
	{/snippet}
</TooltipUi>
