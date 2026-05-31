<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import ColorPicker from '../../ui/color-picker.svelte';
	import { DEFAULT_CARD_COLUMN_COLOR } from '$lib/shared/cards';
	import { textChanged } from '$lib/shared/form-changes';

	type Props = {
		open?: boolean;
		columnId?: string;
		title?: string;
		color?: string;
		onClose?: () => void;
	};

	let {
		open = $bindable(false),
		columnId = '',
		title = '',
		color = DEFAULT_CARD_COLUMN_COLOR,
		onClose
	}: Props = $props();

	let titleValue = $state('');
	let colorValue = $state(DEFAULT_CARD_COLUMN_COLOR);

	$effect(() => {
		if (!open) return;

		const syncTitle = title;
		const syncColor = color;

		untrack(() => {
			titleValue = syncTitle;
			colorValue = syncColor;
		});
	});

	const canSave = $derived(textChanged(titleValue, title) || colorValue !== color);

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open title="Edit column" onOpenChange={(value) => !value && handleClose()}>
	<form
		method="POST"
		action="?/updateColumn"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="space-y-4"
	>
		<input type="hidden" name="columnId" value={columnId} />
		<div>
			<Label for="column-title">Title</Label>
			<Input
				id="column-title"
				name="title"
				bind:value={titleValue}
				placeholder="Column name"
				required
			/>
		</div>
		<div>
			<Label for="column-color">Color</Label>
			<ColorPicker
				id="column-color"
				name="color"
				bind:value={colorValue}
				ariaLabel="Column color"
			/>
		</div>

		<div class="flex justify-end gap-2 pt-2">
			<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
			<ButtonUi type="submit" disabled={!canSave}>Save</ButtonUi>
		</div>
	</form>
</Dialog>
