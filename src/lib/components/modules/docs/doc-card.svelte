<script lang="ts">
	import type { DocPageRow } from '$lib/server/docs';

	type Props = {
		doc: DocPageRow;
		href: string;
	};

	let { doc, href }: Props = $props();

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
</script>

<div class="flex flex-col gap-1.5">
	<a
		{href}
		class="group flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-border bg-surface-raised p-3 shadow-sm transition hover:border-accent/40 hover:shadow-md"
	>
		<h3 class="shrink-0 truncate font-medium text-ink group-hover:text-accent">{doc.title}</h3>
		<div class="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
			{#if doc.previewText}
				<p
					class="prose prose-sm line-clamp-[12] max-w-none text-sm leading-relaxed text-ink-muted prose-stone prose-strong:text-ink-muted"
				>
					{doc.previewText}
				</p>
			{:else}
				<p class="text-sm text-ink-muted/70 italic">Empty document</p>
			{/if}
		</div>
	</a>
	<p class="px-0.5 text-right text-[11px] text-ink-muted">{formatRelative(doc.updatedAt)}</p>
</div>
