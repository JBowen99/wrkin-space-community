<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { LayoutData } from '../$types';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Select from '$lib/components/ui/select.svelte';
	import Tooltip from '$lib/components/ui/tooltip.svelte';

	let { data, form }: { data: PageData & LayoutData; form: ActionData } = $props();

	let inviteRole = $state('user');
	let transferTarget = $state<{ userId: string; name: string } | null>(null);

	const roleOptions = [
		{ value: 'user', label: 'User' },
		{ value: 'admin', label: 'Admin' }
	];

	const inviteLink = $derived(form?.inviteUrl ? `${$page.url.origin}${form.inviteUrl}` : null);

	const roleForms: Record<string, HTMLFormElement | undefined> = $state({});

	async function submitRoleForm(userId: string) {
		await tick();
		roleForms[userId]?.requestSubmit();
	}
</script>

{#if data.usage}
	<p class="text-sm text-ink-muted">
		<Tooltip text="Total seats used vs. your plan's maximum.">
			{#snippet trigger(props)}
				<span {...props}>{data.usage.members} / {data.usage.maxMembers} members</span>
			{/snippet}
		</Tooltip>
		{#if data.usage.maxWrkspaces !== null}
			·
			<Tooltip text="Wrkspaces in this team vs. your plan's maximum.">
				{#snippet trigger(props)}
					<span {...props}>{data.usage.wrkspaces} / {data.usage.maxWrkspaces} wrkspaces</span>
				{/snippet}
			</Tooltip>
		{/if}
	</p>
{/if}

<SettingsSection title="Invite member" description="Send an invite link (valid 7 days).">
	{#if data.usage?.allowsInvites}
		<form method="POST" action="?/invite" use:enhance class="space-y-4">
			<div>
				<Label for="email">Email</Label>
				<Input id="email" name="email" type="email" placeholder="colleague@company.com" required />
			</div>
			<div>
				<Label for="role">Role</Label>
				<Select name="role" bind:value={inviteRole} options={roleOptions} />
			</div>
			{#if form?.message}
				<p class="text-sm text-red-600" role="alert">{form.message}</p>
			{/if}
			{#if inviteLink && form?.inviteUrl}
				<p class="text-sm text-ink-muted">
					Invite link: <a href={form.inviteUrl} class="text-accent underline">{inviteLink}</a>
				</p>
			{/if}
			<ButtonUi type="submit">Create invite</ButtonUi>
		</form>
	{:else}
		<p class="text-sm text-ink-muted">
			Invite teammates by adding them directly as members.
		</p>
	{/if}
</SettingsSection>

{#if data.invites.length > 0}
	<SettingsSection title="Pending invites">
		<ul class="space-y-2">
			{#each data.invites as invite (invite.id)}
				<li
					class="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm"
				>
					<span>
						{invite.email} · <span class="text-ink-muted capitalize">{invite.role}</span>
					</span>
					<form method="POST" action="?/revokeInvite" use:enhance>
						<input type="hidden" name="inviteId" value={invite.id} />
						<Tooltip text="Revoke this invitation link">
							{#snippet trigger(props)}
								<ButtonUi
									{...props}
									type="submit"
									variant="ghost"
									class="h-8 px-2 text-xs text-red-600 hover:text-red-700"
								>
									Revoke
								</ButtonUi>
							{/snippet}
						</Tooltip>
					</form>
				</li>
			{/each}
		</ul>
	</SettingsSection>
{/if}

<SettingsSection title="Members">
	<ul class="divide-y divide-border rounded-lg border border-border">
		{#each data.members as member (member.userId)}
			<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
				<div>
					<p class="font-medium text-ink">{member.name}</p>
					<p class="text-ink-muted">{member.email}</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					{#if data.membership.role === 'owner' && member.role !== 'owner'}
						<Tooltip text="Transfer team ownership to {member.name}">
							{#snippet trigger(props)}
								<ButtonUi
									{...props}
									type="button"
									variant="ghost"
									class="h-8 px-2 text-xs text-accent"
									onclick={() => (transferTarget = { userId: member.userId, name: member.name })}
								>
									Make owner
								</ButtonUi>
							{/snippet}
						</Tooltip>
					{/if}
					{#if member.userId !== data.user.id && member.role !== 'owner'}
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
								options={roleOptions}
								class="!mt-0 w-28 py-1 text-xs"
								onValueChange={() => submitRoleForm(member.userId)}
							/>
						</form>
						<form method="POST" action="?/removeMember" use:enhance>
							<input type="hidden" name="userId" value={member.userId} />
							<Tooltip text="Remove {member.name} from this team">
								{#snippet trigger(props)}
									<ButtonUi
										{...props}
										type="submit"
										variant="ghost"
										class="h-8 px-2 text-xs text-red-600 hover:text-red-700"
									>
										Remove
									</ButtonUi>
								{/snippet}
							</Tooltip>
						</form>
					{:else}
						<Tooltip
							text={member.role === 'owner'
								? 'Owners can manage billing, transfer ownership, and delete the team.'
								: "That's you. Open settings to leave the team."}
						>
							{#snippet trigger(props)}
								<span {...props} class="rounded-full bg-ink/8 px-2 py-0.5 text-xs capitalize">
									{member.role}
								</span>
							{/snippet}
						</Tooltip>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</SettingsSection>

<ConfirmDialog
	open={transferTarget !== null}
	onOpenChange={(value) => {
		if (!value) transferTarget = null;
	}}
	title="Transfer ownership?"
	description={transferTarget ? `Make ${transferTarget.name} the owner of this team?` : ''}
	confirmLabel="Transfer ownership"
	destructive
	formAction="?/transferOwnership"
	hiddenFields={transferTarget ? { userId: transferTarget.userId } : {}}
>
	You will be demoted to <strong class="font-medium text-ink">admin</strong> and will no longer be able
	to delete the team, transfer ownership, or manage billing. This action cannot be undone by you — only
	the new owner can transfer ownership back.
</ConfirmDialog>
