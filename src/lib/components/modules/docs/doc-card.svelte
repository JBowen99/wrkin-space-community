<script lang="ts">
	import type { DocsLibraryDocRow } from '$lib/shared/docs-library';
	import {
		docsLibraryCardMetaClass,
		docsLibraryCardSurfaceClass
	} from './docs-library-card-styles';

	type DocCardDoc = Pick<DocsLibraryDocRow, 'title' | 'previewText' | 'updatedAt'>;

	type Props = {
		doc: DocCardDoc;
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

<div class="flex w-full min-w-0 flex-col gap-1.5">
	<a
		{href}
		draggable="false"
		ondragstart={(e) => e.preventDefault()}
		class="{docsLibraryCardSurfaceClass} p-3"
	>
		<h3 class="text-ink group-hover:text-accent shrink-0 truncate font-medium">{doc.title}</h3>
		<div class="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
			{#if doc.previewText}
				<p
					class="prose prose-sm text-ink-muted prose-stone prose-strong:text-ink-muted line-clamp-[12] max-w-none text-sm leading-relaxed"
				>
					{doc.previewText}
				</p>
			{:else}
				<p class="text-ink-muted/70 text-sm italic">Empty document</p>
			{/if}
		</div>
	</a>
	<p class="{docsLibraryCardMetaClass} text-right">{formatRelative(doc.updatedAt)}</p>
</div>
