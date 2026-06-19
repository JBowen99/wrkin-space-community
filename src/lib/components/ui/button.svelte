<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'link' | 'unstyled';

	type Props = {
		href?: string;
		type?: 'button' | 'submit';
		variant?: Variant;
		class?: string;
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
		formaction?: string;
		formmethod?: 'POST' | 'GET';
		formnovalidate?: boolean;
		children: Snippet;
		[key: string]: unknown;
	};

	let {
		href,
		type = 'button',
		variant = 'primary',
		class: className = '',
		disabled = false,
		onclick,
		formaction,
		formmethod,
		formnovalidate,
		children,
		...rest
	}: Props = $props();

	const variants: Record<Variant, string> = {
		primary:
			'h-11 rounded-lg px-4 bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50',
		secondary:
			'h-11 rounded-lg px-4 border border-border bg-surface-raised text-ink hover:bg-surface-hover active:scale-[0.98] disabled:opacity-50',
		ghost:
			'h-11 rounded-lg px-4 text-ink-muted hover:bg-surface-hover hover:text-ink active:scale-[0.98] disabled:opacity-50',
		link: 'h-auto rounded-none bg-transparent p-0 font-semibold text-ink hover:underline active:scale-100 disabled:opacity-50',
		unstyled: ''
	};

	const rootClass = $derived(
		cn(
			variant !== 'unstyled' && 'inline-flex items-center justify-center gap-2 text-sm font-medium transition',
			variants[variant],
			className
		)
	);
</script>

{#if href}
	<Button.Root {...rest} {href} {disabled} class={rootClass}>
		{@render children()}
	</Button.Root>
{:else}
	<Button.Root
		{...rest}
		{type}
		{disabled}
		{onclick}
		{formaction}
		{formmethod}
		formnovalidate={formnovalidate || undefined}
		class={rootClass}
	>
		{@render children()}
	</Button.Root>
{/if}
