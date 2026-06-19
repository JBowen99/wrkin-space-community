<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '../../cn';
	import { iconButtonClass } from '../../icon-button-styles';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title?: string;
		description?: string;
		/** Custom header body — close control stays on the right unless hideCloseButton is set. */
		header?: Snippet;
		/** No title bar — only a floating close control in the top-right corner. */
		headerless?: boolean;
		/** Hide the built-in close button when using a custom header snippet. */
		hideCloseButton?: boolean;
		/** Whether to auto-focus the first focusable element on open (default true). */
		autoFocus?: boolean;
		/** Tailwind max-width class applied to the panel (default "max-w-md"). */
		maxWidth?: string;
		children: Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		header,
		headerless = false,
		hideCloseButton = false,
		autoFocus = true,
		maxWidth = 'max-w-md',
		children
	}: Props = $props();

	const showDefaultHeader = $derived(!headerless && !header && (title || description));

	const closeClass = iconButtonClass('lg', 'subtle');
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-black/25" />
		<Dialog.Content
			class={cn('border-border bg-surface-raised fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l shadow-2xl outline-none', maxWidth)}
			onOpenAutoFocus={(e) => { if (!autoFocus) e.preventDefault(); }}
		>
			{#if header}
				<Dialog.Title class="sr-only">{title ?? 'Panel'}</Dialog.Title>
				<header class="border-border flex shrink-0 items-start gap-3 border-b px-5 py-4">
					<div class="min-w-0 flex-1">
						{@render header()}
					</div>
					{#if !hideCloseButton}
					<Dialog.Close class={closeClass} aria-label="Close panel">
							<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
						</Dialog.Close>
					{/if}
				</header>
			{:else if headerless}
				<Dialog.Title class="sr-only">{title ?? 'Panel'}</Dialog.Title>
			{:else if showDefaultHeader}
				<header
					class="border-border flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4"
				>
					<div class="min-w-0">
						{#if title}
							<Dialog.Title class="font-display text-ink text-lg font-semibold"
								>{title}</Dialog.Title
							>
						{/if}
						{#if description}
							<Dialog.Description class={cn(title && 'mt-1', 'text-ink-muted text-sm')}
								>{description}</Dialog.Description
							>
						{/if}
					</div>
					<Dialog.Close class={closeClass} aria-label="Close panel">
						<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
					</Dialog.Close>
				</header>
			{/if}

			<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
				{#if headerless}
					<Dialog.Close class={cn('absolute top-4 right-4 z-10', closeClass)} aria-label="Close panel">
						<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
					</Dialog.Close>
				{/if}
				{@render children()}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
