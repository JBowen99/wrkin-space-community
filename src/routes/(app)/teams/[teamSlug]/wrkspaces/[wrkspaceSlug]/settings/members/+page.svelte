<script lang="ts">
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';
	import type { WrkspaceMemberRow } from '$lib/server/wrkspace-members';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Select from '$lib/components/ui/select.svelte';
	import Tooltip from '$lib/components/ui/tooltip.svelte';

	let { data }: { data: PageData & LayoutData } = $props();

	const existingIds = $derived(new Set(data.members.map((m: WrkspaceMemberRow) => m.userId)));
	const addable = $derived(
		data.teamPool.filter((m: { userId: string }) => !existingIds.has(m.userId))
	);

	let addUserId = $state('');
	let addRole = $state('user');

	const addRoleOptions = [
		{ value: 'user', label: 'User' },
		{ value: 'admin', label: 'Admin' }
	];
	const editRoleOptions = [
		{ value: 'user', label: 'User' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'owner', label: 'Owner' }
	];

	const userOptions = $derived(
		addable.map((m: { userId: string; name: string; email: string }) => ({
			value: m.userId,
			label: `${m.name} (${m.email})`
		}))
	);

	$effect(() => {
		if (addable.length > 0 && !addUserId) {
			addUserId = addable[0].userId;
		}
	});

	const roleForms: Record<string, HTMLFormElement | undefined> = $state({});

	async function submitRoleForm(userId: string) {
		// Wait for Svelte to flush the bound hidden input value to the DOM
		// before submitting; otherwise the form posts the previous role.
		await tick();
		roleForms[userId]?.requestSubmit();
	}
</script>

<SettingsSection
	title="Add team member"
	description="Team users need explicit access unless they are team admins."
>
	{#if addable.length > 0}
		<form method="POST" action="?/addMember" use:enhance class="flex flex-wrap items-end gap-3">
			<div class="min-w-[14rem] flex-1">
				<Label for="userId">Member</Label>
				<Select name="userId" bind:value={addUserId} options={userOptions} required />
			</div>
			<div>
				<Label for="role">Role</Label>
				<Select name="role" bind:value={addRole} options={addRoleOptions} class="w-28" />
			</div>
			<ButtonUi type="submit">Add</ButtonUi>
		</form>
	{:else}
		<p class="text-sm text-ink-muted">All team members already have access or are team admins.</p>
	{/if}
</SettingsSection>

<SettingsSection title="Wrkspace members">
	<ul class="divide-y divide-border rounded-lg border border-border">
		{#each data.members as member (member.userId)}
			<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
				<div>
					<p class="font-medium text-ink">
						{member.name}
						{#if member.implicit}
							<Tooltip
								text="Access granted automatically because this person is a team {member.teamRole}."
							>
								{#snippet trigger(props)}
									<span {...props} class="text-xs font-normal text-ink-muted"
										>(team {member.teamRole})</span
									>
								{/snippet}
							</Tooltip>
						{/if}
					</p>
					<p class="text-ink-muted">{member.email}</p>
				</div>
				{#if !member.implicit}
					<div class="flex items-center gap-2">
						<form
							method="POST"
							action="?/updateRole"
							use:enhance
							bind:this={roleForms[member.userId]}
							class="flex items-center"
						>
							<input type="hidden" name="userId" value={member.userId} />
							<Select
								name="role"
								value={member.role}
								options={editRoleOptions}
								class="!mt-0 w-24 py-1 text-xs"
								onValueChange={() => submitRoleForm(member.userId)}
							/>
						</form>
						{#if member.role !== 'owner' || data.members.filter((x: WrkspaceMemberRow) => x.role === 'owner' && !x.implicit).length > 1}
							<form method="POST" action="?/removeMember" use:enhance>
								<input type="hidden" name="userId" value={member.userId} />
								<Tooltip text="Remove {member.name} from this wrkspace">
									{#snippet trigger(props)}
										<ButtonUi
											{...props}
											type="submit"
											variant="ghost"
											class="h-8 px-2 text-xs text-danger hover:text-danger"
										>
											Remove
										</ButtonUi>
									{/snippet}
								</Tooltip>
							</form>
						{/if}
					</div>
				{:else}
					<Tooltip
						text="Implicit members inherit their role from the team and can't be removed here. Change their team role to revoke access."
					>
						{#snippet trigger(props)}
							<span {...props} class="text-xs text-ink-muted capitalize"
								>Implicit {member.role}</span
							>
						{/snippet}
					</Tooltip>
				{/if}
			</li>
		{/each}
	</ul>
</SettingsSection>
