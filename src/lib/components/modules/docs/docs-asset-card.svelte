<script lang="ts">
	import type { DocsLibraryAssetRow } from '$lib/shared/docs-library';
	import DocsAssetThumbnail from './docs-asset-thumbnail.svelte';
	import {
		docsLibraryCardMetaClass,
		docsLibraryCardSurfaceClass
	} from './docs-library-card-styles';

	type Props = {
		asset: DocsLibraryAssetRow;
		href: string;
	};

	let { asset, href }: Props = $props();

	const fileUrl = $derived(`/api/docs/assets/${encodeURIComponent(asset.id)}`);

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
		<h3 class="text-ink group-hover:text-accent shrink-0 truncate font-medium">{asset.title}</h3>
		<p class="text-ink-muted mt-0.5 shrink-0 truncate text-xs">
			{#if asset.kind === 'link'}
				{asset.siteName ?? asset.url ?? 'External link'}
			{:else}
				{asset.mimeType ?? 'File'}
			{/if}
		</p>
		<div class="bg-surface-inset/40 relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg">
			<DocsAssetThumbnail
				assetId={asset.id}
				kind={asset.kind}
				mimeType={asset.mimeType}
				title={asset.title}
				{fileUrl}
				linkImage={asset.linkImage}
				variant="card"
			/>
		</div>
	</a>
	<p class="{docsLibraryCardMetaClass} text-right">{formatRelative(asset.updatedAt)}</p>
</div>
