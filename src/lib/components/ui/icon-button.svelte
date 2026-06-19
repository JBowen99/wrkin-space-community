<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import { iconButtonClass } from '../../icon-button-styles';
	import TooltipUi from './tooltip.svelte';

	type Size = 'sm' | 'md' | 'lg';
	type Variant = 'default' | 'subtle' | 'destructive';

	type Props = {
		href?: string;
		type?: 'button' | 'submit';
		title?: string;
		label: string;
		tooltip?: string;
		tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
		onclick?: (event: MouseEvent) => void;
		disabled?: boolean;
		size?: Size;
		variant?: Variant;
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
		disabled = false,
		size = 'lg',
		variant = 'default',
		class: className = '',
		children
	}: Props = $props();

	const rootClass = $derived(cn(iconButtonClass(size, variant), className));
</script>

<TooltipUi text={tooltip ?? ''} side={tooltipSide} disabled={!tooltip}>
	{#snippet trigger(props)}
		{#if href}
			<Button.Root
				{...props}
				{href}
				{disabled}
				class={rootClass}
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
				{disabled}
				class={rootClass}
				aria-label={label}
				title={tooltip ? undefined : (title ?? label)}
			>
				{@render children()}
			</Button.Root>
		{/if}
	{/snippet}
</TooltipUi>
