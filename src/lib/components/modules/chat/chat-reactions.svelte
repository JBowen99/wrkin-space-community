<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ReactionGroup } from '$lib/server/modules';
	import { CHAT_REACTIONS } from '$lib/shared/chat';
	import Popover from '../../ui/popover.svelte';
	import Tooltip from '../../ui/tooltip.svelte';
	import Avatar from '../../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';

	type Props = {
		messageId: string;
		reactions: ReactionGroup[];
		isOwn: boolean;
		showAddButton?: boolean;
	};

	let { messageId, reactions, isOwn, showAddButton = true }: Props = $props();

	let pickerOpen = $state(false);

	function closePickerOnSubmit() {
		return () => {
			return async ({ update }: { update: () => Promise<void> }) => {
				await update();
				pickerOpen = false;
			};
		};
	}
</script>

<div
	class="absolute bottom-0 z-10 flex max-w-[calc(100%+1rem)] flex-wrap items-center gap-0.5 {isOwn
		? 'left-0 translate-y-1/2'
		: 'right-0 translate-y-1/2'}"
>
	{#each reactions as group (group.emoji)}
		<Popover>
			{#snippet trigger()}
				<Tooltip
					text={group.count === 1
						? `${group.users[0]?.name ?? 'Someone'} reacted with ${group.emoji}`
						: `${group.count} people reacted with ${group.emoji}`}
				>
					{#snippet trigger(props)}
						<form method="POST" action="?/toggleReaction" use:enhance class="inline">
							<input type="hidden" name="messageId" value={messageId} />
							<input type="hidden" name="emoji" value={group.emoji} />
							<button
								{...props}
								type="submit"
								class="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface px-2 py-0.5 text-sm shadow-sm transition hover:bg-stone-100"
								aria-label="Toggle {group.emoji} reaction"
							>
								<span>{group.emoji}</span>
								{#if group.count > 1}
									<span class="text-xs text-ink-muted">{group.count}</span>
								{/if}
							</button>
						</form>
					{/snippet}
				</Tooltip>
			{/snippet}
			{#snippet content()}
				<ul class="max-w-48 space-y-2 py-1">
					{#each group.users as reactor (reactor.id)}
						<li class="flex items-center gap-2 text-sm text-ink">
							<Avatar
								src={reactor.image}
								alt={reactor.name}
								fallback={initialsFromName(reactor.name)}
								class="size-6"
							/>
							<span class="truncate">{reactor.name}</span>
						</li>
					{/each}
				</ul>
			{/snippet}
		</Popover>
	{/each}

	{#if showAddButton}
		<Popover openOnHover={false} side={isOwn ? 'left' : 'right'} bind:open={pickerOpen}>
			{#snippet trigger()}
				<Tooltip text="Add reaction">
					{#snippet trigger(props)}
						<button
							{...props}
							type="button"
							class="inline-flex size-6 items-center justify-center rounded-full border border-border bg-surface text-sm text-ink-muted shadow-sm transition hover:bg-stone-100 hover:text-ink focus-visible:opacity-100 {pickerOpen
								? 'opacity-100'
								: 'opacity-0 group-hover/message:opacity-100'}"
							aria-label="Add reaction"
						>
							+
						</button>
					{/snippet}
				</Tooltip>
			{/snippet}
			{#snippet content()}
				<div class="grid grid-cols-3 gap-0.5">
					{#each CHAT_REACTIONS as emoji (emoji)}
						<form
							method="POST"
							action="?/toggleReaction"
							use:enhance={closePickerOnSubmit()}
							class="inline"
						>
							<input type="hidden" name="messageId" value={messageId} />
							<input type="hidden" name="emoji" value={emoji} />
							<button
								type="submit"
								class="rounded px-2 py-1.5 text-lg hover:bg-stone-100"
								aria-label="React with {emoji}"
							>
								{emoji}
							</button>
						</form>
					{/each}
				</div>
			{/snippet}
		</Popover>
	{/if}
</div>
