<script lang="ts">
	import Avatar from '../../ui/avatar.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Delete02Icon, UserAdd01Icon } from '@hugeicons/core-free-icons';
	import { initialsFromName } from '$lib/shared/initials';
	import type {
		CalendarInvitationRow,
		CalendarInvitationStatus
	} from '$lib/server/calendar-invitations';
	import type { TeamMemberRow } from '$lib/server/team-members';

	type Props = {
		eventId: string;
		invitations: CalendarInvitationRow[];
		teamMembers: TeamMemberRow[];
		currentUserId: string;
		editable?: boolean;
		onChange?: (invitations: CalendarInvitationRow[]) => void;
	};

	let {
		eventId,
		invitations,
		teamMembers,
		currentUserId,
		editable = true,
		onChange
	}: Props = $props();

	let showPicker = $state(false);
	let adding = $state(false);
	let removingId = $state<string | null>(null);
	let responding = $state(false);
	let error = $state('');

	const invitedUserIds = $derived(new Set(invitations.map((i) => i.userId)));

	const availableMembers = $derived(
		teamMembers.filter((m) => !invitedUserIds.has(m.userId) && m.userId !== currentUserId)
	);

	const myInvitation = $derived(invitations.find((i) => i.userId === currentUserId));

	function statusLabel(status: CalendarInvitationStatus): string {
		if (status === 'accepted') return 'Accepted';
		if (status === 'declined') return 'Declined';
		return 'Pending';
	}

	function statusClass(status: CalendarInvitationStatus): string {
		if (status === 'accepted') return 'bg-green-100 text-green-800';
		if (status === 'declined') return 'bg-red-100 text-red-800';
		return 'bg-surface-inset text-ink-muted';
	}

	async function addInvitees(userIds: string[]) {
		if (userIds.length === 0) return;
		adding = true;
		error = '';

		try {
			const res = await fetch('/api/calendar/invitations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId, userIds })
			});
			if (!res.ok) {
				const body = (await res.json()) as { message?: string };
				throw new Error(body.message ?? 'Failed to add invitees');
			}
			const newInvitations = (await res.json()) as CalendarInvitationRow[];
			onChange?.([...invitations, ...newInvitations]);
			showPicker = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add invitees';
		} finally {
			adding = false;
		}
	}

	async function removeInvitee(invitationId: string) {
		removingId = invitationId;
		error = '';

		try {
			const res = await fetch(`/api/calendar/invitations/${encodeURIComponent(invitationId)}`, {
				method: 'DELETE'
			});
			if (!res.ok) throw new Error('Failed to remove invitee');
			onChange?.(invitations.filter((i) => i.id !== invitationId));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove invitee';
		} finally {
			removingId = null;
		}
	}

	async function respondToInvitation(status: 'accepted' | 'declined') {
		responding = true;
		error = '';

		try {
			const res = await fetch(`/api/calendar/invitations/${encodeURIComponent(eventId)}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId, status })
			});
			if (!res.ok) throw new Error('Failed to update status');
			onChange?.(
				invitations.map((i) => (i.userId === currentUserId ? { ...i, status } : i))
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update status';
		} finally {
			responding = false;
		}
	}
</script>

<div class="invitations">
	<div class="invitations-header">
		<p class="text-ink text-sm font-medium">
			Invitees{#if invitations.length > 0} ({invitations.length}){/if}
		</p>
		{#if editable}
			<IconButton
				label="Add invitees"
				tooltip="Add invitees"
				size="md"
				onclick={() => (showPicker = !showPicker)}
			>
				<HugeiconsIcon icon={UserAdd01Icon} color="currentColor" aria-hidden={true} />
			</IconButton>
		{/if}
	</div>

	{#if error}
		<p class="text-danger text-xs" role="alert">{error}</p>
	{/if}

	{#if showPicker && availableMembers.length > 0}
		<div class="picker">
			{#each availableMembers as member}
				<button
					type="button"
					class="picker-item"
					disabled={adding}
					onclick={() => addInvitees([member.userId])}
				>
					<Avatar
						src={member.image}
						alt={member.name}
						fallback={initialsFromName(member.name)}
						class="size-6"
					/>
					<span class="text-ink text-sm">{member.name}</span>
				</button>
			{/each}
		</div>
	{:else if showPicker && availableMembers.length === 0}
		<p class="text-ink-muted text-xs">All team members have been invited.</p>
	{/if}

	{#if myInvitation && myInvitation.status === 'pending'}
		<div class="my-response">
			<span class="text-ink-muted text-xs">You're invited:</span>
			<ButtonUi
				type="button"
				variant="secondary"
				class="h-7 px-2 text-xs"
				disabled={responding}
				onclick={() => respondToInvitation('accepted')}
			>
				Accept
			</ButtonUi>
			<ButtonUi
				type="button"
				variant="ghost"
				class="h-7 px-2 text-xs text-ink-muted"
				disabled={responding}
				onclick={() => respondToInvitation('declined')}
			>
				Decline
			</ButtonUi>
		</div>
	{/if}

	{#if invitations.length === 0 && !showPicker}
		<p class="text-ink-muted text-xs">No invitees yet.</p>
	{:else}
		<ul class="invitations-list">
			{#each invitations as inv (inv.id)}
				<li class="invitation-row">
					<Avatar
						src={inv.userImage}
						alt={inv.userName}
						fallback={initialsFromName(inv.userName)}
						class="size-6"
					/>
					<span class="text-ink flex-1 text-sm">{inv.userName}</span>
					<span class="status-badge {statusClass(inv.status)}">
						{statusLabel(inv.status)}
					</span>
					{#if editable && inv.userId !== currentUserId}
						<IconButton
							label="Remove invitee"
							size="sm"
							variant="subtle"
							disabled={removingId === inv.id}
							onclick={() => removeInvitee(inv.id)}
						>
							<HugeiconsIcon
								icon={Delete02Icon}
								color="currentColor"
								aria-hidden={true}
							/>
						</IconButton>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.invitations {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.invitations-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.invitations-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.invitation-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
	}

	.status-badge {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		font-weight: 500;
		white-space: nowrap;
	}

	.my-response {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0;
	}

	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		max-height: 12rem;
		overflow-y: auto;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		padding: 0.25rem;
	}

	.picker-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		border-radius: 0.25rem;
		border: none;
		background: transparent;
		cursor: pointer;
		width: 100%;
		text-align: left;

		&:hover {
			background: var(--color-surface-hover);
		}
	}
</style>
