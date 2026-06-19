<script lang="ts">
	import type { ForumPostNode } from '$lib/server/forum';
	import Avatar from '../../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import ForumPostComposer from './forum-post-composer.svelte';
	import ForumPost from './forum-post.svelte';
	import ForumPostAttachments from './forum-post-attachments.svelte';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';

	type Props = {
		node: ForumPostNode;
		depth?: number;
		isClosed?: boolean;
	};

	let { node, depth = 0, isClosed = false }: Props = $props();

	const bmCtx = getBookmarkContext();

	const isBookmarked = $derived(bmCtx?.isBookmarked(node.id) ?? false);

	let hovered = $state(false);

	function formatTime(d: Date) {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(d));
	}
</script>

<article class="flex gap-3 {depth > 0 ? 'border-accent/25 border-l-2 pl-3.5' : ''}">
	<Avatar
		src={node.authorImage}
		alt={node.authorName}
		fallback={initialsFromName(node.authorName)}
		class="mt-0.5 size-8 shrink-0"
	/>

	<div class="min-w-0 flex-1">
		<div onpointerenter={() => (hovered = true)} onpointerleave={() => (hovered = false)}>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
				<span class="text-ink text-sm font-medium">{node.authorName}</span>
				<time class="text-ink-muted text-xs" datetime={node.createdAt.toISOString()}>
					{formatTime(node.createdAt)}
				</time>
				<BookmarkToggle
					targetType="forumPost"
					targetId={node.id}
					label={node.body.slice(0, 80) || 'Forum post'}
					contextId={node.threadId}
					size={12}
					class="transition {isBookmarked || hovered ? 'opacity-100' : 'opacity-0'}"
				/>
			</div>

			<p class="text-ink mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
				{node.body}
			</p>
			<ForumPostAttachments attachments={node.attachments} />

			<div class="mt-1.5 w-full">
				{#if !isClosed}
					<ForumPostComposer parentId={node.id} />
				{/if}
			</div>
		</div>

		{#if node.children.length > 0}
			<div class="mt-5 flex flex-col gap-5">
				{#each node.children as child (child.id)}
					<ForumPost node={child} depth={depth + 1} {isClosed} />
				{/each}
			</div>
		{/if}
	</div>
</article>
