<script lang="ts">
	import type { PageData } from './$types';
	import ModuleHeader from '$lib/components/modules/module-header.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import BookmarkToggle from '$lib/components/bookmarks/bookmark-toggle.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog.svelte';
	import ForumThreadView from '$lib/components/modules/forum/forum-thread-view.svelte';
	import { setBookmarkContext } from '$lib/components/bookmarks/bookmark-context.svelte';

	let { data }: { data: PageData } = $props();

	let closeOpen = $state(false);

	const bookmarkCtx = setBookmarkContext({
		teamSlug: data.wrkspace.teamSlug,
		wrkspaceSlug: data.wrkspace.slug,
		moduleId: data.module.id,
		moduleType: 'forum',
		bookmarkedIds: data.bookmarkedIds ?? []
	});

	$effect(() => {
		bookmarkCtx.bookmarkedIds = data.bookmarkedIds ?? [];
	});
</script>

<div>
	<ModuleHeader
		backHref={data.moduleIndexUrl}
		backLabel={data.module.title}
		typeLabel={data.typeLabel}
		title={data.thread.title}
		moduleId={data.module.id}
	>
		{#snippet subtitle()}
			<span class="text-xs text-ink-muted">
				by {data.thread.authorName}
				{#if data.thread.closedAt}
					<span aria-hidden="true"> · </span>
					<span class="font-medium">Closed</span>
				{/if}
			</span>
		{/snippet}
		{#snippet titleTrailing()}
			<div class="flex items-center gap-2">
				{#if data.canClose}
					<ButtonUi
						type="button"
						variant="secondary"
						class="h-10 px-2 text-xs"
						onclick={() => (closeOpen = true)}
					>
						Close thread
					</ButtonUi>
				{/if}
				<BookmarkToggle
					targetType="forumThread"
					targetId={data.thread.id}
					label={data.thread.title}
					size={18}
					class="size-10 shrink-0 rounded-lg"
				/>
			</div>
		{/snippet}
	</ModuleHeader>

	<ForumThreadView thread={data.thread} postTree={data.postTree} />
</div>

{#if data.canClose}
	<ConfirmDialog
		bind:open={closeOpen}
		title="Close thread?"
		description="No one will be able to add new replies. Existing posts stay visible."
		confirmLabel="Close thread"
		formAction="?/closeThread"
	/>
{/if}
