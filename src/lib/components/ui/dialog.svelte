<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import { iconButtonClass } from '../../icon-button-styles';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import BrandText from '../brand/brand-text.svelte';

	type DialogSize = 'md' | 'lg' | 'xl';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title: string;
		description?: string;
		size?: DialogSize;
		children: Snippet;
		trigger?: Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		size = 'md',
		children,
		trigger
	}: Props = $props();

	const sizeClass: Record<DialogSize, string> = {
		md: 'max-w-md',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};
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
			class={cn(
				'fixed top-1/2 left-1/2 z-50 grid max-h-[85vh] w-[calc(100%-2rem)] border-border bg-surface-raised -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border p-6 shadow-lg',
				sizeClass[size]
			)}
		>
			<div class="min-w-0">
				<Dialog.Title class="font-display text-ink text-lg font-semibold">
					<BrandText text={title} />
				</Dialog.Title>
				{#if description}
					<Dialog.Description class="text-ink-muted mt-1 text-sm">
						<BrandText text={description} />
					</Dialog.Description>
				{/if}
			</div>
			<div class="mt-4 min-h-0 overflow-hidden">
				{@render children()}
			</div>
			<Dialog.Close
				class={cn(iconButtonClass('md', 'subtle'), 'absolute top-4 right-4')}
				aria-label="Close"
			>
				<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
