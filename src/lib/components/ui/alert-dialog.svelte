<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import BrandText from '../brand/brand-text.svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onConfirm?: () => void;
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
		onConfirm,
		title,
		description,
		actionLabel = 'Confirm',
		cancelLabel,
		destructive = false,
		children
	}: Props = $props();

	function handleAction() {
		onConfirm?.();
		open = false;
		onOpenChange?.(false);
	}
</script>

<AlertDialog.Root bind:open {onOpenChange}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
		<AlertDialog.Content
			class="border-border bg-surface-raised fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border p-6 shadow-lg"
		>
			<AlertDialog.Title class="font-display text-ink shrink-0 text-lg font-semibold">
				<BrandText text={title} />
			</AlertDialog.Title>
			{#if description}
				<AlertDialog.Description class="text-ink-muted mt-1 shrink-0 text-sm">
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
						class="border-border bg-surface-raised text-ink hover:bg-surface-hover inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50"
					>
						{cancelLabel}
					</AlertDialog.Cancel>
				{/if}
				<AlertDialog.Action
					onclick={handleAction}
					class={cn(
						'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-50',
						destructive
							? 'text-danger hover:bg-danger-muted'
							: 'bg-accent hover:bg-accent-hover text-white'
					)}
				>
					{actionLabel}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
