<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'forum' }>;
	};

	let { preview }: Props = $props();
</script>

{#if preview.openCount === 0 && preview.threads.length === 0}
	<PreviewSkeleton variant="forum" />
{:else}
	<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
		{#if preview.openCount > 0}
			<p
				class="mb-1.5 inline-flex w-fit shrink-0 rounded-full bg-accent-muted/50 px-2 py-0.5 text-xs font-medium text-accent"
			>
				{preview.openCount} open thread{preview.openCount === 1 ? '' : 's'}
			</p>
		{/if}
		{#if preview.threads.length > 0}
			<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
				{#each preview.threads as thread, index (index)}
					<li
						class="rounded border border-border/80 bg-white px-2 py-1 text-xs leading-snug dark:bg-surface"
						aria-hidden="true"
					>
						<p class="truncate font-medium text-ink">{thread.title}</p>
						<p class="mt-0.5 truncate text-ink-muted">
							{thread.authorName}
							<span aria-hidden="true"> · </span>
							{thread.replyCount}
							{thread.replyCount === 1 ? 'response' : 'responses'}
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
