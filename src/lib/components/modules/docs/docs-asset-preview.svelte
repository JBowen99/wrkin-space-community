<script lang="ts">
	import type { DocAssetDetail } from '$lib/server/docs-library';
	import Button from '../../ui/button.svelte';
	import DocsAssetThumbnail from './docs-asset-thumbnail.svelte';

	type Props = {
		asset: DocAssetDetail;
		downloadUrl: string;
	};

	let { asset, downloadUrl }: Props = $props();

	async function copyLink() {
		const text = asset.kind === 'link' ? asset.url : window.location.href;
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			// ignore
		}
	}
</script>

<div class="mx-auto mt-8 max-w-3xl space-y-6">
	<div class="border-border bg-surface-raised overflow-hidden rounded-xl border">
		<div class="min-h-[12rem]">
			<DocsAssetThumbnail
				assetId={asset.id}
				kind={asset.kind}
				mimeType={asset.mimeType}
				title={asset.title}
				fileUrl={downloadUrl}
				linkImage={asset.linkImage}
				variant="page"
				eager
			/>
		</div>
		{#if asset.kind === 'link' && asset.url}
			<div class="border-border border-t px-6 py-4">
				<h2 class="text-ink text-lg font-semibold">{asset.linkTitle ?? asset.title}</h2>
				{#if asset.siteName}
					<p class="text-ink-muted mt-1 text-sm">{asset.siteName}</p>
				{/if}
				{#if asset.linkDescription}
					<p class="text-ink-muted mt-3 text-sm">{asset.linkDescription}</p>
				{/if}
				<a
					href={asset.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent mt-4 inline-block text-sm break-all hover:underline"
				>
					{asset.url}
				</a>
			</div>
		{:else if asset.kind === 'upload'}
			<div class="border-border border-t px-6 py-3">
				<p class="text-ink text-sm font-medium">{asset.title}</p>
				{#if asset.sizeBytes}
					<p class="text-ink-muted mt-0.5 text-xs">
						{Math.round(asset.sizeBytes / 1024)} KB
						{#if asset.mimeType}
							· {asset.mimeType}
						{/if}
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap gap-3">
		{#if asset.kind === 'upload'}
			<Button href={downloadUrl} variant="primary" download={asset.originalName ?? asset.title}>
				Download
			</Button>
		{/if}
		{#if asset.kind === 'link' && asset.url}
			<Button href={asset.url} variant="primary" target="_blank" rel="noopener noreferrer">
				Open link
			</Button>
		{/if}
		<Button type="button" variant="secondary" onclick={copyLink}>Copy link</Button>
	</div>
</div>
