<script lang="ts">
	import type { Snippet } from 'svelte';
	import BrandText from '$lib/components/brand/brand-text.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';

	let {
		title,
		description,
		eyebrow,
		showBack = false,
		backHref = '/teams',
		backLabel = '← All teams',
		children,
		headerAction,
		footer
	}: {
		title: string;
		description?: string;
		eyebrow?: string;
		showBack?: boolean;
		backHref?: string;
		backLabel?: string;
		children: Snippet;
		headerAction?: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<div class="flex w-full max-w-md flex-col">
	<header class="shrink-0">
		{#if eyebrow}
			<p class="min-h-4 text-xs font-medium tracking-wide text-ink-muted uppercase">
				{eyebrow}
			</p>
		{/if}
		<div class="flex items-center justify-between gap-3" class:mt-2={eyebrow}>
			<h1 class="font-display text-2xl font-semibold text-ink"><BrandText text={title} /></h1>
			{#if headerAction}
				<div class="shrink-0">
					{@render headerAction()}
				</div>
			{/if}
		</div>
		{#if description}
			<p class="mt-2 text-sm text-ink-muted"><BrandText text={description} /></p>
		{/if}
	</header>

	<div class="mt-8">
		{@render children()}
	</div>

	{#if showBack}
		<div class="mt-4">
			<ButtonUi href={backHref} variant="ghost" class="-ml-2 text-ink-muted">{backLabel}</ButtonUi>
		</div>
	{/if}

	{#if footer}
		<div class="mt-10 shrink-0">
			{@render footer()}
		</div>
	{/if}
</div>
