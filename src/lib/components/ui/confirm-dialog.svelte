<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import DialogUi from './dialog.svelte';
	import ButtonUi from './button.svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		formAction: string;
		hiddenFields?: Record<string, string>;
		children?: Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		destructive = false,
		formAction,
		hiddenFields,
		children
	}: Props = $props();

	function close() {
		open = false;
		onOpenChange?.(false);
	}
</script>

<DialogUi bind:open {onOpenChange} {title} {description}>
	<form
		method="POST"
		action={formAction}
		use:enhance={() => {
			return async ({ update }) => {
				close();
				await update();
			};
		}}
	>
		{#if hiddenFields}
			{#each Object.entries(hiddenFields) as [name, value] (name)}
				<input type="hidden" {name} {value} />
			{/each}
		{/if}
		{#if children}
			<div class="mb-4 text-sm text-ink-muted">
				{@render children()}
			</div>
		{/if}
		<div class="flex flex-wrap justify-end gap-2">
			<ButtonUi type="button" variant="secondary" onclick={close}>
				{cancelLabel}
			</ButtonUi>
			<ButtonUi
				type="submit"
				variant="ghost"
				class={destructive ? 'text-red-700 hover:bg-red-50' : ''}
			>
				{confirmLabel}
			</ButtonUi>
		</div>
	</form>
</DialogUi>
