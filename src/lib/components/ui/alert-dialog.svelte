<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import BrandText from '../brand/brand-text.svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title: string;
		description?: string;
		actionLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		actionLabel = 'Confirm',
		cancelLabel,
		destructive = false,
		children
	}: Props = $props();

	function handleAction() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<AlertDialog.Root bind:open {onOpenChange}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
		<AlertDialog.Content
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface-raised p-6 shadow-lg"
		>
			<AlertDialog.Title class="shrink-0 font-display text-lg font-semibold text-ink">
				<BrandText text={title} />
			</AlertDialog.Title>
			{#if description}
				<AlertDialog.Description class="mt-1 shrink-0 text-sm text-ink-muted">
					<BrandText text={description} />
				</AlertDialog.Description>
			{/if}
			{#if children}
				<div class="mt-4 min-h-0 flex-1 overflow-hidden">
					{@render children()}
				</div>
			{/if}
			<div class="mt-4 flex justify-end gap-2">
				{#if cancelLabel}
					<AlertDialog.Cancel
						class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-4 text-sm font-medium text-ink transition hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50"
					>
						{cancelLabel}
					</AlertDialog.Cancel>
				{/if}
				<AlertDialog.Action
					onclick={handleAction}
					class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-50 {destructive
						? 'text-red-700 hover:bg-red-50'
						: 'bg-accent text-white hover:bg-accent-hover'}"
				>
					{actionLabel}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
