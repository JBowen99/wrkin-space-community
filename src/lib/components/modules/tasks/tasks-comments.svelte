<script lang="ts">
	import { enhance } from '$app/forms';
	import type { TaskCommentRow } from '$lib/server/tasks';
	import Avatar from '../../ui/avatar.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import FieldShell from '../../ui/field-shell.svelte';
	import Label from '../../ui/label.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import { initialsFromName } from '$lib/shared/initials';

	type Props = {
		taskId: string;
		comments: TaskCommentRow[];
		onCommentPosted?: () => void;
	};

	let { taskId, comments, onCommentPosted }: Props = $props();

	let body = $state('');

	function formatTime(d: Date) {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(d));
	}
</script>

<div class="flex flex-col gap-4">
	{#if comments.length === 0}
		<p class="text-ink-muted text-sm">No comments yet.</p>
	{:else}
		<ul class="flex flex-col gap-4">
			{#each comments as comment (comment.id)}
				<li class="flex gap-3">
					<Avatar
						src={comment.authorImage}
						alt={comment.authorName}
						fallback={initialsFromName(comment.authorName)}
						class="mt-0.5 size-8 shrink-0"
					/>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<span class="text-ink text-sm font-medium">{comment.authorName}</span>
							<time class="text-ink-muted text-xs" datetime={comment.createdAt.toISOString()}>
								{formatTime(comment.createdAt)}
							</time>
						</div>
						<p class="text-ink mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
							{comment.body}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<form
		method="POST"
		action="?/createTaskComment"
		use:enhance={() => {
			return async ({ update, formElement }) => {
				await update();
				formElement.reset();
				body = '';
				onCommentPosted?.();
			};
		}}
	>
		<input type="hidden" name="taskId" value={taskId} />
		<FieldShell withMargin={false}>
			<Label for="task-comment-body" class="sr-only">Comment</Label>
			<Textarea
				id="task-comment-body"
				name="body"
				variant="plain"
				rows={3}
				required
				bind:value={body}
				placeholder="Write a comment…"
			/>
		</FieldShell>
		<div class="mt-2 flex justify-end">
			<ButtonUi type="submit" class="h-9" disabled={!body.trim()}>Post comment</ButtonUi>
		</div>
	</form>
</div>
