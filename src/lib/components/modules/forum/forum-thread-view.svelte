<script lang="ts">
	import type { ForumPostNode, ForumThreadDetail } from '$lib/server/forum';
	import ButtonUi from '../../ui/button.svelte';
	import ConfirmDialog from '../../ui/confirm-dialog.svelte';
	import ForumPost from './forum-post.svelte';
	import ForumPostComposer from './forum-post-composer.svelte';

	type Props = {
		thread: ForumThreadDetail;
		postTree: ForumPostNode[];
		canClose?: boolean;
	};

	let { thread, postTree, canClose = false }: Props = $props();

	let closeOpen = $state(false);

	const openingPostId = $derived(postTree[0]?.id ?? null);
	const isClosed = $derived(thread.closedAt != null);
</script>

<div class="mt-6 flex flex-col">
	<header class="border-b border-border pb-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<h2 class="text-lg font-semibold text-ink">{thread.title}</h2>
				<p class="mt-1 text-xs text-ink-muted">
					Started by {thread.authorName}
					{#if isClosed}
						<span aria-hidden="true"> · </span>
						<span class="font-medium text-ink-muted">Closed</span>
					{/if}
				</p>
			</div>
			{#if canClose}
				<ButtonUi
					type="button"
					variant="secondary"
					class="shrink-0"
					onclick={() => (closeOpen = true)}
				>
					Close thread
				</ButtonUi>
			{/if}
		</div>
		{#if isClosed}
			<p
				class="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-ink-muted"
			>
				This thread is closed. New replies are not allowed.
			</p>
		{/if}
	</header>

	<div class="flex flex-col gap-6 py-6">
		{#each postTree as node (node.id)}
			<ForumPost {node} {isClosed} />
		{/each}
	</div>

	{#if !isClosed}
		<footer class="border-t border-border pt-6">
			<p class="mb-3 text-sm font-medium text-ink">Reply to thread</p>
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

{#if canClose}
	<ConfirmDialog
		bind:open={closeOpen}
		title="Close thread?"
		description="No one will be able to add new replies. Existing posts stay visible."
		confirmLabel="Close thread"
		formAction="?/closeThread"
	/>
{/if}
