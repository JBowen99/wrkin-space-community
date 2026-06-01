<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title: string;
		description?: string;
		children: Snippet;
	};

	let { open = $bindable(false), onOpenChange, title, description, children }: Props = $props();
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-black/25" />
		<Dialog.Content
			class="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface-raised shadow-2xl outline-none"
		>
			<header
				class="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4"
			>
				<div class="min-w-0">
					<Dialog.Title class="font-display text-lg font-semibold text-ink">{title}</Dialog.Title>
					{#if description}
						<Dialog.Description class="mt-1 text-sm text-ink-muted"
							>{description}</Dialog.Description
						>
					{/if}
				</div>
				<Dialog.Close
					class="shrink-0 rounded-md p-1.5 text-ink-muted transition hover:bg-stone-100 hover:text-ink"
					aria-label="Close panel"
				>
					×
				</Dialog.Close>
			</header>

			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				{@render children()}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
