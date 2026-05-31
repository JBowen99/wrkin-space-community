<script lang="ts">
	import type { ForumThreadRow } from '$lib/server/forum';

	type Props = {
		thread: ForumThreadRow;
		href: string;
	};

	let { thread, href }: Props = $props();

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

<a {href} class="group -mx-4 block px-4 py-3.5 transition hover:bg-surface/80">
	<h3 class="font-medium text-ink group-hover:text-accent">{thread.title}</h3>
	{#if thread.excerpt}
		<p class="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">{thread.excerpt}</p>
	{/if}
	<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
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
</a>
