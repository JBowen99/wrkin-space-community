<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import ChatMessageAttachments from '../chat/chat-message-attachments.svelte';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'chat' }>;
	};

	let { preview }: Props = $props();
</script>

{#if preview.messages.length === 0}
	<PreviewSkeleton variant="chat" />
{:else}
	<div class="flex h-full min-h-0 w-full flex-col justify-end gap-1.5 overflow-hidden">
		{#each preview.messages as message, index (index)}
			<div class="flex shrink-0 {message.isOwn ? 'justify-end' : 'justify-start'}">
				<div class="max-w-[88%] min-w-0">
					{#if !message.isOwn}
						<span class="text-ink-muted mb-0.5 block px-0.5 text-xs font-medium">
							{message.authorName}
						</span>
					{/if}
					<div
						class="px-2.5 py-1.5 text-xs leading-relaxed {message.isOwn
							? 'bg-accent rounded-xl rounded-br-sm text-white'
							: 'border-border bg-surface text-ink rounded-xl rounded-bl-sm border'}"
					>
						{#if message.body}
							<p class="line-clamp-3 break-words">{message.body}</p>
						{/if}
						<ChatMessageAttachments
							attachments={message.attachments}
							isOwn={message.isOwn}
							compact
						/>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
