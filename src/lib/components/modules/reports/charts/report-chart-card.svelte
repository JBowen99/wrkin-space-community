<script lang="ts">
	import type { Snippet } from 'svelte';

	type Height = 'sm' | 'md' | 'lg' | 'auto';

	type Props = {
		title: string;
		subtitle?: string;
		height?: Height;
		chartStyle?: string;
		empty?: boolean;
		emptyMessage?: string;
		class?: string;
		children?: Snippet;
		caption?: Snippet;
	};

	let {
		title,
		subtitle,
		height = 'md',
		chartStyle,
		empty = false,
		emptyMessage = 'No data to chart',
		class: className = '',
		children,
		caption
	}: Props = $props();

	const heightClass: Record<Height, string> = {
		sm: 'h-32',
		md: 'h-48',
		lg: 'h-64',
		auto: 'min-h-48'
	};
</script>

<div class="border-border bg-surface-raised rounded-xl border p-4 {className}">
	<div class="mb-3">
		<h3 class="font-display text-ink text-sm font-semibold">{title}</h3>
		{#if subtitle}
			<p class="text-ink-muted mt-0.5 text-xs">{subtitle}</p>
		{/if}
	</div>

	{#if empty}
		<div
			class="border-border bg-surface-muted/30 flex items-center justify-center rounded-lg border border-dashed {heightClass[
				height
			]}"
			style={chartStyle}
			role="img"
			aria-label={emptyMessage}
		>
			<p class="text-ink-muted px-4 text-center text-sm">{emptyMessage}</p>
		</div>
	{:else if children}
		<div class="wrkin-report-chart {heightClass[height]} w-full min-w-0" style={chartStyle}>
			{@render children()}
		</div>
	{/if}

	{#if caption}
		<div class="mt-2">
			{@render caption()}
		</div>
	{/if}
</div>
