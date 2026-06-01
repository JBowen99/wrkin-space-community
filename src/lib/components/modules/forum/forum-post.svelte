<script lang="ts">
	import type { ForumPostNode } from '$lib/server/forum';
	import Avatar from '../../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import ForumPostComposer from './forum-post-composer.svelte';
	import ForumPost from './forum-post.svelte';
	import ForumPostAttachments from './forum-post-attachments.svelte';

	type Props = {
		node: ForumPostNode;
		depth?: number;
		isClosed?: boolean;
	};

	let { node, depth = 0, isClosed = false }: Props = $props();

	function formatTime(d: Date) {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(d));
	}
</script>

<article class="flex gap-3 {depth > 0 ? 'border-l-2 border-accent/25 pl-3.5' : ''}">
	<Avatar
		src={node.authorImage}
		alt={node.authorName}
		fallback={initialsFromName(node.authorName)}
		class="mt-0.5 size-8 shrink-0"
	/>

	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
			<span class="text-sm font-medium text-ink">{node.authorName}</span>
			<time class="text-xs text-ink-muted" datetime={node.createdAt.toISOString()}>
				{formatTime(node.createdAt)}
			</time>
		</div>

		<p class="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">
			{node.body}
		</p>
		<ForumPostAttachments attachments={node.attachments} />

		{#if !isClosed}
			<div class="mt-1">
				<ForumPostComposer parentId={node.id} />
			</div>
		{/if}

		{#if node.children.length > 0}
			<div class="mt-5 flex flex-col gap-5">
				{#each node.children as child (child.id)}
					<ForumPost node={child} depth={depth + 1} {isClosed} />
				{/each}
			</div>
		{/if}
	</div>
</article>
