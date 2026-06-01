<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import BrandText from '../brand/brand-text.svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title: string;
		description?: string;
		children: Snippet;
		trigger?: Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		children,
		trigger
	}: Props = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
	{#if trigger}
		<Dialog.Trigger>
			{@render trigger()}
		</Dialog.Trigger>
	{/if}
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface-raised p-6 shadow-lg"
		>
			<Dialog.Title class="shrink-0 font-display text-lg font-semibold text-ink">
				<BrandText text={title} />
			</Dialog.Title>
			{#if description}
				<Dialog.Description class="mt-1 shrink-0 text-sm text-ink-muted">
					<BrandText text={description} />
				</Dialog.Description>
			{/if}
			<div class="mt-4 min-h-0 flex-1 overflow-hidden">
				{@render children()}
			</div>
			<Dialog.Close
				class="absolute top-4 right-4 rounded-md p-1 text-ink-muted hover:bg-stone-100 hover:text-ink"
				aria-label="Close"
			>
				×
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
