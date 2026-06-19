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
				class="bg-accent-muted/50 text-accent mb-1.5 inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
			>
				{preview.openCount} open thread{preview.openCount === 1 ? '' : 's'}
			</p>
		{/if}
		{#if preview.threads.length > 0}
			<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
				{#each preview.threads as thread, index (index)}
					<li
						class="border-border/80 bg-surface-raised rounded border px-2 py-1 text-xs leading-snug"
						aria-hidden="true"
					>
						<p class="text-ink truncate font-medium">{thread.title}</p>
						<p class="text-ink-muted mt-0.5 truncate">
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
