<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import { hasCustomDocFolderColor } from '$lib/shared/doc-folder-colors';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'docs' }>;
	};

	let { preview }: Props = $props();
</script>

{#if preview.items.length === 0}
	<PreviewSkeleton variant="docs" />
{:else}
	<div class="relative flex h-full min-h-0 w-full flex-col">
		<div
			class="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-1 {preview.moreCount > 0
				? 'pb-5'
				: ''}"
		>
			{#each preview.items as item, index (index)}
				{#if item.kind === 'folder'}
					{@const customColor = hasCustomDocFolderColor(item.color)}
					<div
						class="border-border/80 flex min-h-0 min-w-0 flex-col overflow-hidden rounded border p-1 {customColor
							? ''
							: 'bg-amber-50/80 dark:bg-amber-950/30'}"
						style={customColor && item.color
							? `background-color: color-mix(in srgb, ${item.color} 35%, var(--color-surface-raised))`
							: undefined}
						aria-hidden="true"
					>
						<p class="text-ink truncate px-0.5 text-[10px] leading-tight font-medium">
							{item.title}
						</p>
						<p class="text-ink-muted mt-auto truncate px-0.5 text-[9px]">Folder</p>
					</div>
				{:else if item.kind === 'doc'}
					<div
						class="border-border/80 bg-surface-raised flex min-h-0 min-w-0 flex-col overflow-hidden rounded border p-1"
						aria-hidden="true"
					>
						<p class="text-ink truncate px-0.5 text-[10px] leading-tight font-medium">
							{item.title}
						</p>
					</div>
				{:else}
					<div
						class="border-border/80 bg-surface-raised flex min-h-0 min-w-0 flex-col overflow-hidden rounded border p-1"
						aria-hidden="true"
					>
						<p class="text-ink truncate px-0.5 text-[10px] leading-tight font-medium">
							{item.title}
						</p>
						<p class="text-ink-muted mt-auto truncate px-0.5 text-[9px]">
							{item.assetKind === 'link' ? 'Link' : 'File'}
						</p>
					</div>
				{/if}
			{/each}
		</div>
		{#if preview.moreCount > 0}
			<p
				class="border-border bg-surface-raised text-ink-muted pointer-events-none absolute right-0 bottom-0 rounded-md border px-1.5 py-0.5 text-xs font-semibold shadow-sm"
			>
				+{preview.moreCount}
			</p>
		{/if}
	</div>
{/if}
