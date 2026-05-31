<script lang="ts">
	import type { ActionData, LayoutData } from './$types';
	import { enhance } from '$app/forms';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Tooltip from '$lib/components/ui/tooltip.svelte';
	import { textChanged } from '$lib/shared/form-changes';

	let { data, form }: { data: LayoutData; form: ActionData } = $props();

	let deleteOpen = $state(false);
	let nameValue = $state('');

	$effect(() => {
		nameValue = data.membership.teamName;
	});

	const canSave = $derived(textChanged(nameValue, data.membership.teamName));
</script>

{#if data.capabilities.manage_team}
	<SettingsSection title="General">
		<form method="POST" action="?/updateTeam" use:enhance class="space-y-4">
			<div>
				<Label for="team-name">Team name</Label>
				<Input id="team-name" name="name" bind:value={nameValue} required />
			</div>
			{#if form?.message}
				<p class="text-sm text-red-600" role="alert">{form.message}</p>
			{/if}
			{#if form?.success}
				<p class="text-sm text-accent">Team updated.</p>
			{/if}
			<ButtonUi type="submit" disabled={!canSave}>Save</ButtonUi>
		</form>
	</SettingsSection>
{:else}
	<p class="text-sm text-ink-muted">You do not have permission to edit team settings.</p>
{/if}

{#if data.capabilities.delete_team}
	<SettingsSection
		title="Danger zone"
		description="Permanently delete this team and all wrkspaces, modules, and data."
	>
		<Tooltip text="This cannot be undone. All wrkspaces and data will be removed.">
			{#snippet trigger(props)}
				<ButtonUi
					{...props}
					type="button"
					variant="ghost"
					class="text-red-700 hover:bg-red-50"
					onclick={() => (deleteOpen = true)}
				>
					Delete team
				</ButtonUi>
			{/snippet}
		</Tooltip>
	</SettingsSection>

	<ConfirmDialog
		bind:open={deleteOpen}
		title="Delete team?"
		description={`"${data.membership.teamName}" will be permanently deleted, including all wrkspaces and data.`}
		confirmLabel="Delete team"
		destructive
		formAction="?/deleteTeam"
	/>
{/if}
