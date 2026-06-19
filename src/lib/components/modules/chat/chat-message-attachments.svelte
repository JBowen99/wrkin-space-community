<script lang="ts">
	import type { ChatSearchMatch } from '$lib/shared/chat-search';
	import { buildHighlightSegments, matchKey } from '$lib/shared/chat-search';
	import type { ChatAttachmentRow } from '$lib/server/modules';
	import { formatAttachmentSize, isImageMimeType } from '$lib/shared/chat-attachments';
	import ChatHighlightedText from './chat-highlighted-text.svelte';

	type Props = {
		attachments: ChatAttachmentRow[];
		isOwn: boolean;
		compact?: boolean;
		searchQuery?: string;
		activeMatch?: ChatSearchMatch | null;
		activeMatchKey?: string | null;
		messageId?: string;
	};

	let {
		attachments,
		isOwn,
		compact = false,
		searchQuery = '',
		activeMatch = null,
		activeMatchKey = null,
		messageId = ''
	}: Props = $props();

	const searching = $derived(searchQuery.length > 0);

	const linkClass = $derived(
		isOwn
			? 'text-white underline decoration-white/60 hover:decoration-white'
			: 'text-accent underline decoration-accent/40 hover:decoration-accent'
	);
	const fileRowClass = $derived(
		isOwn ? 'border-white/20 bg-surface-raised/10' : 'border-border bg-surface'
	);
	const containerClass = $derived(
		compact ? 'mt-1 flex flex-col gap-1' : 'mt-2 flex flex-col gap-2'
	);
	const imageClass = $derived(
		compact
			? 'max-h-16 max-w-full rounded object-contain'
			: 'max-h-64 max-w-full rounded-lg object-contain'
	);
	const fileLinkClass = $derived(compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm');
	const captionClass = $derived(isOwn ? 'text-white/90' : 'text-ink-muted');

	function activeRange(attId: string) {
		if (
			!activeMatch ||
			activeMatch.messageId !== messageId ||
			activeMatch.field !== 'attachment' ||
			activeMatch.attachmentId !== attId
		) {
			return undefined;
		}
		return { start: activeMatch.start, length: activeMatch.length };
	}

	function nameSegments(att: ChatAttachmentRow) {
		if (!searching) return null;
		return buildHighlightSegments(att.originalName, searchQuery, activeRange(att.id));
	}

	function attachmentMatchKey(attId: string) {
		if (
			activeMatch?.messageId === messageId &&
			activeMatch.field === 'attachment' &&
			activeMatch.attachmentId === attId
		) {
			return activeMatchKey ?? matchKey(activeMatch);
		}
		return null;
	}

	function filenameMatches(att: ChatAttachmentRow) {
		if (!searching) return false;
		return att.originalName.toLowerCase().includes(searchQuery.toLowerCase());
	}
</script>

{#if attachments.length > 0}
	<div class={containerClass}>
		{#each attachments as att (att.id)}
			{@const segments = nameSegments(att)}
			{@const matchKeyForAtt = attachmentMatchKey(att.id)}
			{#if isImageMimeType(att.mimeType)}
				<a
					href={att.url}
					target="_blank"
					rel="noopener noreferrer"
					class="block overflow-hidden rounded-lg {matchKeyForAtt
						? 'ring-offset-surface ring-2 ring-accent ring-offset-2'
						: ''}"
					data-chat-match={matchKeyForAtt ?? undefined}
				>
					<img src={att.url} alt={att.originalName} class={imageClass} loading="lazy" />
					{#if searching && filenameMatches(att)}
						<p class="mt-1 truncate px-0.5 text-xs {captionClass}">
							{#if segments}
								<ChatHighlightedText {segments} onAccent={isOwn} />
							{:else}
								{att.originalName}
							{/if}
						</p>
					{/if}
				</a>
			{:else}
				<a
					href={att.url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex min-w-0 items-center gap-2 rounded-lg border {fileLinkClass} {fileRowClass} {linkClass} {matchKeyForAtt
						? 'ring-offset-surface ring-2 ring-accent ring-offset-2'
						: ''}"
					data-chat-match={matchKeyForAtt ?? undefined}
				>
					<span class="min-w-0 flex-1 truncate font-medium">
						{#if segments}
							<ChatHighlightedText {segments} />
						{:else}
							{att.originalName}
						{/if}
					</span>
					<span class="shrink-0 text-xs opacity-80">{formatAttachmentSize(att.sizeBytes)}</span>
				</a>
			{/if}
		{/each}
	</div>
{/if}
