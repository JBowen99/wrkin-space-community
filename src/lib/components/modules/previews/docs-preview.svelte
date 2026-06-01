<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'docs' }>;
	};

	let { preview }: Props = $props();
</script>

{#if preview.docs.length === 0}
	<PreviewSkeleton variant="docs" />
{:else}
	<div class="relative flex h-full min-h-0 w-full flex-col">
		<div class="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-1.5">
			{#each preview.docs as doc, index (index)}
				<div
					class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded border border-border/80 bg-white p-1 dark:bg-surface"
					aria-hidden="true"
				>
					<p class="truncate px-0.5 text-xs leading-tight font-medium text-ink">
						{doc.title}
					</p>
				</div>
			{/each}
		</div>
		{#if preview.moreCount > 0}
			<p
				class="pointer-events-none absolute right-0 bottom-0 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-xs font-semibold text-ink-muted shadow-sm"
			>
				+{preview.moreCount}
			</p>
		{/if}
	</div>
{/if}
