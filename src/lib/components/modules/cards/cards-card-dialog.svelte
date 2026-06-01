<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Tooltip from '../../ui/tooltip.svelte';
	import { textChanged } from '$lib/shared/form-changes';

	type Props = {
		open?: boolean;
		mode: 'create' | 'edit';
		cardId?: string;
		columnId?: string;
		title?: string;
		body?: string;
		onClose?: () => void;
	};

	let {
		open = $bindable(false),
		mode,
		cardId = '',
		columnId = '',
		title = '',
		body = '',
		onClose
	}: Props = $props();

	let titleValue = $state('');
	let bodyValue = $state('');

	$effect(() => {
		if (!open) return;

		const syncTitle = title;
		const syncBody = body;

		untrack(() => {
			titleValue = syncTitle;
			bodyValue = syncBody;
		});
	});

	const dialogTitle = $derived(mode === 'create' ? 'New card' : 'Edit card');
	const submitAction = $derived(mode === 'create' ? '?/addCard' : '?/updateCard');
	const canSave = $derived(
		mode === 'create' || textChanged(titleValue, title) || bodyValue !== body
	);

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open title={dialogTitle} onOpenChange={(value) => !value && handleClose()}>
	<form
		method="POST"
		action={submitAction}
		use:enhance={({ submitter, cancel }) => {
			const action = submitter?.getAttribute('formaction') ?? '';
			const isDelete = action.includes('deleteCard');

			if (!isDelete && !titleValue.trim()) {
				cancel();
				return;
			}

			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="space-y-4"
	>
		{#if mode === 'create'}
			<input type="hidden" name="columnId" value={columnId} />
		{:else}
			<input type="hidden" name="cardId" value={cardId} />
		{/if}
		<div>
			<Label for="card-title">Title</Label>
			<Input
				id="card-title"
				name="title"
				bind:value={titleValue}
				placeholder="Card title"
				required
			/>
		</div>
		<div>
			<Label for="card-body">Description</Label>
			<textarea
				id="card-body"
				name="body"
				rows="6"
				bind:value={bodyValue}
				placeholder="Add more detail…"
				class="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
			></textarea>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2 pt-2">
			{#if mode === 'edit'}
				<Tooltip text="Permanently delete this card">
					{#snippet trigger(props)}
						<span {...props} class="inline-flex">
							<ButtonUi
								type="submit"
								formaction="?/deleteCard"
								formmethod="POST"
								formnovalidate
								variant="ghost"
								class="text-red-700 hover:bg-red-50"
							>
								Delete
							</ButtonUi>
						</span>
					{/snippet}
				</Tooltip>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={mode === 'edit' && !canSave}>
					{mode === 'create' ? 'Create' : 'Save'}
				</ButtonUi>
			</div>
		</div>
	</form>
</Dialog>
