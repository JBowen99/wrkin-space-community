<script lang="ts">
	import type { ForumAttachmentRow } from '$lib/server/forum-attachments';
	import { formatAttachmentSize, isImageMimeType } from '$lib/shared/forum-attachments';

	type Props = {
		attachments: ForumAttachmentRow[];
	};

	let { attachments }: Props = $props();
</script>

{#if attachments.length > 0}
	<div class="mt-2 flex flex-col gap-2">
		{#each attachments as att (att.id)}
			{#if isImageMimeType(att.mimeType)}
				<a
					href={att.url}
					target="_blank"
					rel="noopener noreferrer"
					class="block overflow-hidden rounded-lg"
				>
					<img
						src={att.url}
						alt={att.originalName}
						class="max-h-64 max-w-full rounded-lg object-contain"
						loading="lazy"
					/>
				</a>
			{:else}
				<a
					href={att.url}
					target="_blank"
					rel="noopener noreferrer"
					class="border-border bg-surface text-accent decoration-accent/40 hover:decoration-accent flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm underline"
				>
					<span class="min-w-0 flex-1 truncate font-medium">{att.originalName}</span>
					<span class="text-ink-muted shrink-0 text-xs">{formatAttachmentSize(att.sizeBytes)}</span>
				</a>
			{/if}
		{/each}
	</div>
{/if}
