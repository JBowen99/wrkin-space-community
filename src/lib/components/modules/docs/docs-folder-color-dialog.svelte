<script lang="ts">
	import Dialog from '../../ui/dialog.svelte';
	import Button from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import ColorPicker from '../../ui/color-picker.svelte';
	import { DEFAULT_DOC_FOLDER_COLOR, resolveDocFolderColor } from '$lib/shared/doc-folder-colors';

	type Props = {
		open?: boolean;
		folderName?: string;
		initialColor?: string | null;
		loading?: boolean;
		onSave?: (color: string | null) => void | Promise<void>;
	};

	let {
		open = $bindable(false),
		folderName = '',
		initialColor = null,
		loading = false,
		onSave
	}: Props = $props();

	let colorValue = $state(DEFAULT_DOC_FOLDER_COLOR);

	$effect(() => {
		if (!open) return;
		colorValue = resolveDocFolderColor(initialColor);
	});

	const usingDefault = $derived(
		colorValue.toLowerCase() === DEFAULT_DOC_FOLDER_COLOR.toLowerCase()
	);

	async function handleSave() {
		const color = usingDefault ? null : colorValue;
		await onSave?.(color);
	}

	async function resetToDefault() {
		colorValue = DEFAULT_DOC_FOLDER_COLOR;
		await onSave?.(null);
	}
</script>

<Dialog
	bind:open
	title="Folder color"
	description={folderName ? `Choose a color for “${folderName}”.` : 'Choose a folder color.'}
>
	<div class="flex flex-col gap-4">
		<div>
			<Label for="folder-color-picker">Color</Label>
			<ColorPicker id="folder-color-picker" bind:value={colorValue} ariaLabel="Folder color" />
		</div>
		<div class="flex flex-wrap justify-end gap-2">
			<Button type="button" variant="secondary" onclick={() => (open = false)} disabled={loading}>
				Cancel
			</Button>
			<Button type="button" variant="ghost" disabled={loading} onclick={resetToDefault}>
				Reset to default
			</Button>
			<Button type="button" disabled={loading} onclick={handleSave}>
				{loading ? 'Saving…' : 'Save'}
			</Button>
		</div>
	</div>
</Dialog>
