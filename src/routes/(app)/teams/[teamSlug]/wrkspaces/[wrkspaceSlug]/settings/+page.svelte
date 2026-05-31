<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { LayoutData } from './$types';
	import { enhance } from '$app/forms';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import Tooltip from '$lib/components/ui/tooltip.svelte';
	import { textChanged } from '$lib/shared/form-changes';

	let { data, form }: { data: PageData & LayoutData; form: ActionData } = $props();

	let deleteOpen = $state(false);
	let nameValue = $state('');
	let descriptionValue = $state('');

	$effect(() => {
		if (!data.wrkspace) return;
		nameValue = data.wrkspace.name;
		descriptionValue = data.wrkspace.description;
	});

	const canSave = $derived(
		data.wrkspace
			? textChanged(nameValue, data.wrkspace.name) ||
					textChanged(descriptionValue, data.wrkspace.description)
			: false
	);
</script>

{#if data.wrkspace && data.capabilities.manage_settings}
	<SettingsSection title="General">
		<form method="POST" action="?/updateWrkspace" use:enhance class="space-y-4">
			<div>
				<Label for="name">Name</Label>
				<Input id="name" name="name" bind:value={nameValue} required />
			</div>
			<div>
				<Label for="description">Description</Label>
				<Textarea id="description" name="description" bind:value={descriptionValue} rows={3} />
			</div>
			{#if form?.message}
				<p class="text-sm text-red-600" role="alert">{form.message}</p>
			{/if}
			{#if form?.success}
				<p class="text-sm text-accent">Wrkspace updated.</p>
			{/if}
			<ButtonUi type="submit" disabled={!canSave}>Save</ButtonUi>
		</form>
	</SettingsSection>
{/if}

{#if data.capabilities.delete_wrkspace && data.wrkspace}
	<SettingsSection title="Danger zone" description="Delete this wrkspace and all modules.">
		<Tooltip text="This cannot be undone. All modules and data in this wrkspace will be removed.">
			{#snippet trigger(props)}
				<ButtonUi
					{...props}
					type="button"
					variant="ghost"
					class="text-red-700 hover:bg-red-50"
					onclick={() => (deleteOpen = true)}
				>
					Delete wrkspace
				</ButtonUi>
			{/snippet}
		</Tooltip>
	</SettingsSection>

	<ConfirmDialog
		bind:open={deleteOpen}
		title="Delete wrkspace?"
		description={`All modules and data in "${data.wrkspace.name}" will be permanently deleted. This cannot be undone.`}
		confirmLabel="Delete wrkspace"
		destructive
		formAction="?/deleteWrkspace"
	/>
{/if}
