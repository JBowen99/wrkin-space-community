<script lang="ts">
	import type { ChatSearchMatch } from '$lib/shared/chat-search';
	import { buildHighlightSegments } from '$lib/shared/chat-search';
	import type { ChatMessageRow } from '$lib/server/modules';
	import Avatar from '../../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import Tooltip from '../../ui/tooltip.svelte';
	import ChatReactions from './chat-reactions.svelte';
	import ChatMessageAttachments from './chat-message-attachments.svelte';
	import ChatHighlightedText from './chat-highlighted-text.svelte';

	type Props = {
		message: ChatMessageRow;
		isOwn: boolean;
		searchQuery?: string;
		activeMatch?: ChatSearchMatch | null;
		activeMatchKey?: string | null;
		isDimmed?: boolean;
	};

	let {
		message,
		isOwn,
		searchQuery = '',
		activeMatch = null,
		activeMatchKey = null,
		isDimmed = false
	}: Props = $props();

	const searching = $derived(searchQuery.length > 0);

	function activeRange(field: ChatSearchMatch['field'], attachmentId?: string) {
		if (
			!activeMatch ||
			activeMatch.messageId !== message.id ||
			activeMatch.field !== field ||
			(field === 'attachment' && activeMatch.attachmentId !== attachmentId)
		) {
			return undefined;
		}
		return { start: activeMatch.start, length: activeMatch.length };
	}

	const bodySegments = $derived(
		message.body && searching
			? buildHighlightSegments(message.body, searchQuery, activeRange('body'))
			: null
	);

	const authorSegments = $derived(
		!isOwn && searching
			? buildHighlightSegments(message.authorName, searchQuery, activeRange('author'))
			: null
	);

	const authorMatchKey = $derived(
		activeMatch?.messageId === message.id && activeMatch.field === 'author' ? activeMatchKey : null
	);

	const bodyMatchKey = $derived(
		activeMatch?.messageId === message.id && activeMatch.field === 'body' ? activeMatchKey : null
	);

	function formatTime(d: Date) {
		return new Intl.DateTimeFormat(undefined, {
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(d));
	}

	function formatFullTime(d: Date) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(d));
	}
</script>

<li
	class="group/message flex transition-opacity {isOwn ? 'justify-end' : 'justify-start'} {isDimmed
		? 'opacity-40'
		: ''}"
>
	<div class="flex max-w-[75%] flex-col gap-0.5 {isOwn ? 'items-end' : 'items-start'}">
		<div class="flex items-end gap-2 {isOwn ? 'flex-row-reverse' : 'flex-row'}">
			{#if !isOwn}
				<Avatar
					src={message.authorImage}
					alt={message.authorName}
					fallback={initialsFromName(message.authorName)}
				/>
			{/if}

			<div class="flex min-w-0 flex-col gap-1">
				{#if !isOwn}
					<span
						class="text-ink-muted px-1 text-xs font-medium {authorMatchKey
							? 'ring-offset-surface rounded ring-2 ring-accent ring-offset-2'
							: ''}"
						data-chat-match={authorMatchKey ?? undefined}
					>
						{#if authorSegments}
							<ChatHighlightedText segments={authorSegments} />
						{:else}
							{message.authorName}
						{/if}
					</span>
				{/if}

				<div class="relative">
					<div
						class="px-3.5 py-2.5 text-sm leading-relaxed {message.reactions.length > 0
							? 'pb-5'
							: ''} {isOwn
							? 'bg-accent rounded-2xl rounded-br-sm text-white'
							: 'border-border bg-surface-raised text-ink rounded-2xl rounded-bl-sm border'} {bodyMatchKey
							? 'ring-offset-surface ring-2 ring-accent ring-offset-2'
							: ''}"
					>
						{#if message.body}
							<p
								class="break-words whitespace-pre-wrap"
								data-chat-match={bodyMatchKey ?? undefined}
							>
								{#if bodySegments}
									<ChatHighlightedText segments={bodySegments} onAccent={isOwn} />
								{:else}
									{message.body}
								{/if}
							</p>
						{/if}
						<ChatMessageAttachments
							attachments={message.attachments}
							{isOwn}
							{searchQuery}
							{activeMatch}
							{activeMatchKey}
							messageId={message.id}
						/>
					</div>

					<ChatReactions
						messageId={message.id}
						reactions={message.reactions}
						{isOwn}
						messageBody={message.body}
					/>
				</div>

				<Tooltip text={formatFullTime(message.createdAt)}>
					{#snippet trigger(props)}
						<time
							{...props}
							class="text-ink-muted px-1 text-[0.65rem] {isOwn ? 'text-right' : 'text-left'}"
							datetime={message.createdAt.toISOString()}
						>
							{formatTime(message.createdAt)}
						</time>
					{/snippet}
				</Tooltip>
			</div>
		</div>
	</div>
</li>
