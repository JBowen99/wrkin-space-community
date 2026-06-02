<script lang="ts">
	import { Button } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost';

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
			'bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50',
		secondary:
			'border border-border bg-surface-raised text-ink hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50',
		ghost:
			'text-ink-muted hover:bg-stone-100 hover:text-ink active:scale-[0.98] disabled:opacity-50'
	};
</script>

{#if href}
	<Button.Root
		{...rest}
		{href}
		{disabled}
		class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition {variants[
			variant
		]} {className}"
	>
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
		class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition {variants[
			variant
		]} {className}"
	>
		{@render children()}
	</Button.Root>
{/if}
