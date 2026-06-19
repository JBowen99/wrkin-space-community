<script lang="ts">
	import type { ForumThreadRow } from '$lib/server/forum';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';

	type Props = {
		thread: ForumThreadRow;
		href: string;
	};

	let { thread, href }: Props = $props();

	const bmCtx = getBookmarkContext();

	const isBookmarked = $derived(bmCtx?.isBookmarked(thread.id) ?? false);

	function formatRelative(date: Date): string {
		const diffMs = date.getTime() - Date.now();
		const diffSec = Math.round(diffMs / 1000);
		const absSec = Math.abs(diffSec);
		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

		if (absSec < 60) return rtf.format(diffSec, 'second');
		const diffMin = Math.round(diffSec / 60);
		if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
		const diffHr = Math.round(diffMin / 60);
		if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
		const diffDay = Math.round(diffHr / 24);
		if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
		const diffMonth = Math.round(diffDay / 30);
		return rtf.format(diffMonth, 'month');
	}

	const replyLabel = $derived(thread.replyCount === 1 ? '1 reply' : `${thread.replyCount} replies`);
</script>

<a {href} class="group hover:bg-surface/80 -mx-4 flex items-start gap-3 px-4 py-3.5 transition">
	<div class="min-w-0 flex-1">
		<h3 class="text-ink group-hover:text-accent font-medium">{thread.title}</h3>
		{#if thread.excerpt}
			<p class="text-ink-muted mt-1 line-clamp-2 text-sm leading-relaxed">{thread.excerpt}</p>
		{/if}
		<div class="text-ink-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
			<span>{thread.authorName}</span>
			<span aria-hidden="true">·</span>
			<span>{replyLabel}</span>
			{#if thread.closedAt}
				<span aria-hidden="true">·</span>
				<span class="font-medium">Closed</span>
			{/if}
			<span aria-hidden="true">·</span>
			<span>{formatRelative(thread.updatedAt)}</span>
		</div>
	</div>
	<div class="flex shrink-0 items-start pt-0">
		<BookmarkToggle
			targetType="forumThread"
			targetId={thread.id}
			label={thread.title}
			size={18}
			class="size-10 shrink-0 transition {isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}"
		/>
	</div>
</a>
