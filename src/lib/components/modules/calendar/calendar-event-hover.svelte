<script lang="ts">
	import {
		formatEventRange,
		truncateDescription,
		type CalendarEventInput
	} from '$lib/shared/calendar';
	import type { CalendarInvitationRow } from '$lib/server/calendar-invitations';
	import type { CalendarAttachmentRow } from '$lib/server/calendar-attachments';
	import Avatar from '../../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Attachment01Icon } from '@hugeicons/core-free-icons';

	type Props = {
		event: CalendarEventInput | null;
		anchorRect: DOMRect | null;
		invitations?: CalendarInvitationRow[];
		attachments?: CalendarAttachmentRow[];
	};

	let {
		event,
		anchorRect,
		invitations = [],
		attachments = []
	}: Props = $props();

	const style = $derived.by(() => {
		if (!anchorRect) return 'display: none';
		const top = Math.max(8, anchorRect.top - 8);
		const left = Math.min(
			anchorRect.left,
			typeof window !== 'undefined' ? window.innerWidth - 280 : anchorRect.left
		);
		return `top: ${top}px; left: ${left}px; transform: translateY(-100%);`;
	});

	const descriptionPreview = $derived(
		event?.description?.trim() ? truncateDescription(event.description) : ''
	);

	const displayInvitees = $derived(invitations.slice(0, 4));
	const overflowCount = $derived(Math.max(0, invitations.length - 4));
</script>

{#if event && anchorRect}
	<div
		class="border-border bg-surface-raised pointer-events-none fixed z-50 max-w-xs rounded-lg border px-3 py-2 shadow-md"
		{style}
		role="tooltip"
	>
		<p class="text-ink font-medium">{event.title}</p>
		<p class="text-ink-muted mt-1 text-sm">
			{formatEventRange(event.startsAt, event.endsAt)}
		</p>
		{#if descriptionPreview}
			<p class="text-ink-muted mt-2 line-clamp-2 text-sm">{descriptionPreview}</p>
		{/if}

		{#if displayInvitees.length > 0 || attachments.length > 0}
			<div class="mt-2 flex items-center gap-2">
				{#if displayInvitees.length > 0}
					<div class="flex -space-x-1.5">
						{#each displayInvitees as inv}
							<span class="invitee-avatar {inv.status === 'accepted' ? 'accepted' : ''}">
								<Avatar
									src={inv.userImage}
									alt={inv.userName}
									fallback={initialsFromName(inv.userName)}
									class="size-5 ring-1 ring-surface-raised"
								/>
								{#if inv.status === 'accepted'}
									<span class="check" aria-hidden="true">✓</span>
								{/if}
							</span>
						{/each}
						{#if overflowCount > 0}
							<span class="text-ink-muted flex size-5 items-center justify-center rounded-full bg-surface-inset text-[0.625rem] font-medium ring-1 ring-surface-raised">
								+{overflowCount}
							</span>
						{/if}
					</div>
				{/if}
				{#if attachments.length > 0}
					<span class="text-ink-muted flex items-center gap-0.5 text-xs">
						<HugeiconsIcon icon={Attachment01Icon} size={12} color="currentColor" aria-hidden={true} />
						{attachments.length}
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.invitee-avatar {
		position: relative;
		display: inline-flex;
	}

	.check {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 10px;
		height: 10px;
		border-radius: 9999px;
		background: #16a34a;
		color: white;
		font-size: 7px;
		line-height: 10px;
		text-align: center;
		font-weight: 700;
		border: 1px solid var(--color-surface-raised);
	}
</style>
