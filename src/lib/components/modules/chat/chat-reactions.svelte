<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ReactionGroup } from '$lib/server/modules';
	import { CHAT_REACTIONS } from '$lib/shared/chat';
	import ButtonUi from '../../ui/button.svelte';
	import Popover from '../../ui/popover.svelte';
	import Avatar from '../../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';

	type Props = {
		messageId: string;
		reactions: ReactionGroup[];
		isOwn: boolean;
		showAddButton?: boolean;
		messageBody?: string;
	};

	let { messageId, reactions, isOwn, showAddButton = true, messageBody = '' }: Props = $props();

	let pickerOpen = $state(false);

	const bookmarkCtx = getBookmarkContext();

	const isBookmarked = $derived(bookmarkCtx?.isBookmarked(messageId) ?? false);

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
				<form method="POST" action="?/toggleReaction" use:enhance class="inline">
					<input type="hidden" name="messageId" value={messageId} />
					<input type="hidden" name="emoji" value={group.emoji} />
					<ButtonUi
						type="submit"
						variant="unstyled"
						class="border-border bg-surface hover:bg-surface-hover inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-sm shadow-sm transition"
						aria-label="Toggle {group.emoji} reaction"
					>
						<span>{group.emoji}</span>
						{#if group.count > 1}
							<span class="text-ink-muted text-xs">{group.count}</span>
						{/if}
					</ButtonUi>
				</form>
			{/snippet}
			{#snippet content()}
				<ul class="max-w-48 space-y-2 py-1">
					{#each group.users as reactor (reactor.id)}
						<li class="text-ink flex items-center gap-2 text-sm">
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
				<ButtonUi
					type="button"
					variant="unstyled"
					class="border-border bg-surface text-ink-muted hover:bg-surface-hover hover:text-ink inline-flex size-6 items-center justify-center rounded-full border text-sm shadow-sm transition focus-visible:opacity-100 {pickerOpen
						? 'opacity-100'
						: 'opacity-0 group-hover/message:opacity-100'}"
					aria-label="Add reaction"
				>
					+
				</ButtonUi>
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
							<ButtonUi
								type="submit"
								variant="unstyled"
								class="hover:bg-surface-hover rounded px-2 py-1.5 text-lg"
								aria-label="React with {emoji}"
							>
								{emoji}
							</ButtonUi>
						</form>
					{/each}
				</div>
			{/snippet}
		</Popover>
	{/if}

	<BookmarkToggle
		targetType="chatMessage"
		targetId={messageId}
		label={messageBody?.slice(0, 80) || 'Message'}
		size={14}
		class="border-border bg-surface hover:bg-surface-hover size-6 rounded-full border shadow-sm transition {!isBookmarked && !pickerOpen
			? 'opacity-0 group-hover/message:opacity-100'
			: ''}"
	/>
</div>
