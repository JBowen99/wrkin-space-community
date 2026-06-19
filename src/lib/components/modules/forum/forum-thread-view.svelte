<script lang="ts">
	import type { ForumPostNode, ForumThreadDetail } from '$lib/server/forum';
	import ForumPost from './forum-post.svelte';
	import ForumPostComposer from './forum-post-composer.svelte';

	type Props = {
		thread: ForumThreadDetail;
		postTree: ForumPostNode[];
	};

	let { thread, postTree }: Props = $props();

	const openingPostId = $derived(postTree[0]?.id ?? null);
	const isClosed = $derived(thread.closedAt != null);
</script>

<div class="mt-6 flex flex-col">
	{#if isClosed}
		<p
			class="border-border bg-surface-raised text-ink-muted mb-6 rounded-lg border px-3 py-2 text-sm"
		>
			This thread is closed. New replies are not allowed.
		</p>
	{/if}

	<div class="flex flex-col gap-6">
		{#each postTree as node (node.id)}
			<ForumPost {node} {isClosed} />
		{/each}
	</div>

	{#if !isClosed}
		<footer class="border-border mt-6 border-t pt-6">
			<p class="text-ink mb-3 text-sm font-medium">Reply to thread</p>
			<ForumPostComposer
				parentId={openingPostId}
				startOpen={true}
				placeholder="Write a reply to this thread…"
				submitLabel="Post reply"
				variant="thread"
			/>
		</footer>
	{/if}
</div>
