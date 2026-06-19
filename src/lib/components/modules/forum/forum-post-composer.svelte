<script lang="ts">
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Attachment01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
	import FieldShell from '../../ui/field-shell.svelte';
	import FileInput from '../../ui/file-input.svelte';
	import Label from '../../ui/label.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import {
		FORUM_ATTACHMENT_ACCEPT,
		FORUM_ATTACHMENT_MAX_BYTES,
		FORUM_ATTACHMENT_MAX_PER_POST,
		formatAttachmentSize,
		isImageMimeType
	} from '$lib/shared/forum-attachments';

	type Props = {
		parentId?: string | null;
		placeholder?: string;
		submitLabel?: string;
		startOpen?: boolean;
		variant?: 'inline' | 'thread';
		onSent?: () => void;
	};

	let {
		parentId = null,
		placeholder = 'Write a reply…',
		submitLabel = 'Reply',
		startOpen = false,
		variant = 'inline',
		onSent
	}: Props = $props();

	let body = $state('');
	let open = $state(false);
	let pendingAttachments = $state<{ id: string; file: File; previewUrl: string | null }[]>([]);
	let fileInput = $state<HTMLInputElement | null>(null);
	let error = $state('');

	const canSend = $derived(body.trim().length > 0 || pendingAttachments.length > 0);
	const showForm = $derived(open || startOpen || parentId == null);
	const isThreadFooter = $derived(variant === 'thread');
	const isInline = $derived(parentId != null && !isThreadFooter);

	const allowedMimeTypes = new Set(FORUM_ATTACHMENT_ACCEPT.split(',').map((t) => t.trim()));
	const imageExtByMime: Record<string, string> = {
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/gif': '.gif',
		'image/webp': '.webp'
	};

	function toPending(file: File) {
		return {
			id: crypto.randomUUID(),
			file,
			previewUrl: isImageMimeType(file.type) ? URL.createObjectURL(file) : null
		};
	}

	function pickFiles() {
		error = '';
		fileInput?.click();
	}

	function addFiles(selected: File[]) {
		if (selected.length === 0) return;

		error = '';
		const incoming = selected.map(toPending);
		const combined = [...pendingAttachments, ...incoming];

		function abortIncoming() {
			for (const item of incoming) {
				if (item.previewUrl) {
					URL.revokeObjectURL(item.previewUrl);
				}
			}
		}

		if (combined.length > FORUM_ATTACHMENT_MAX_PER_POST) {
			error = `At most ${FORUM_ATTACHMENT_MAX_PER_POST} files per post`;
			abortIncoming();
			return;
		}

		for (const { file } of incoming) {
			if (!allowedMimeTypes.has(file.type)) {
				error = 'File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.';
				abortIncoming();
				return;
			}
			if (file.size > FORUM_ATTACHMENT_MAX_BYTES) {
				error = 'Each file must be 5 MB or smaller';
				abortIncoming();
				return;
			}
		}

		pendingAttachments = combined;
	}

	function onFilesSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const selected = [...(input.files ?? [])];
		input.value = '';
		addFiles(selected);
	}

	function fileFromClipboardItem(item: DataTransferItem): File | null {
		if (item.kind !== 'file' || !isImageMimeType(item.type)) return null;
		const file = item.getAsFile();
		if (!file) return null;

		const mime = file.type || item.type;
		if (!allowedMimeTypes.has(mime)) return null;

		if (file.name) return file;

		const ext = imageExtByMime[mime] ?? '.png';
		return new File([file], `pasted-image-${Date.now()}${ext}`, { type: mime });
	}

	function onPaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const images: File[] = [];
		for (const item of items) {
			const file = fileFromClipboardItem(item);
			if (file) images.push(file);
		}

		if (images.length === 0) return;

		e.preventDefault();
		addFiles(images);
	}

	function removeAttachment(id: string) {
		const item = pendingAttachments.find((attachment) => attachment.id === id);
		if (item?.previewUrl) {
			URL.revokeObjectURL(item.previewUrl);
		}
		pendingAttachments = pendingAttachments.filter((attachment) => attachment.id !== id);
		error = '';
	}

	function clearPending() {
		for (const item of pendingAttachments) {
			if (item.previewUrl) {
				URL.revokeObjectURL(item.previewUrl);
			}
		}
		pendingAttachments = [];
		error = '';
	}
</script>

{#if parentId != null && !showForm}
	<ButtonUi
		type="button"
		variant="link"
		class="text-accent text-xs font-medium"
		onclick={() => {
			open = true;
		}}
	>
		Reply
	</ButtonUi>
{:else}
	<form
		method="POST"
		action="?/createPost"
		enctype="multipart/form-data"
		use:enhance={({ formData }) => {
			formData.delete('attachments');
			for (const { file } of pendingAttachments) {
				formData.append('attachments', file);
			}

			return async ({ update, formElement }) => {
				await update();
				formElement.reset();
				body = '';
				clearPending();
				if (parentId != null) {
					open = false;
				}
				onSent?.();
			};
		}}
		class={parentId != null && !isThreadFooter ? 'mt-1.5' : ''}
	>
		{#if parentId}
			<input type="hidden" name="parentId" value={parentId} />
		{/if}

		<FieldShell withMargin={false}>
			{#if pendingAttachments.length > 0}
				<ul class="border-border flex flex-wrap gap-2 border-b px-3 py-2">
					{#each pendingAttachments as item (item.id)}
						<li
							class="border-border bg-surface flex max-w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
						>
							{#if item.previewUrl}
								<img src={item.previewUrl} alt="" class="size-8 shrink-0 rounded object-cover" />
{/if}

<style>
	.forum-inline-reply {
		field-sizing: content;
		min-height: 1lh;
	}
</style>
							<span class="text-ink min-w-0 truncate" title={item.file.name}>{item.file.name}</span>
							<span class="text-ink-muted shrink-0">{formatAttachmentSize(item.file.size)}</span>
							<IconButton
								label="Remove {item.file.name}"
								size="sm"
								variant="subtle"
								onclick={() => removeAttachment(item.id)}
							>
								<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
							</IconButton>
						</li>
					{/each}
				</ul>
			{/if}
			<Label for="post-body-{parentId ?? 'root'}" class="sr-only">Reply</Label>
			<Textarea
				id="post-body-{parentId ?? 'root'}"
				name="body"
				variant="plain"
				rows={isThreadFooter ? 4 : 1}
				required
				bind:value={body}
				{placeholder}
				onpaste={onPaste}
				class={isInline ? 'forum-inline-reply' : ''}
			/>
		</FieldShell>

		<FileInput
			bind:input={fileInput}
			accept={FORUM_ATTACHMENT_ACCEPT}
			multiple
			onchange={onFilesSelected}
		/>

		{#if error}
			<p class="text-danger mt-2 text-xs" role="alert">{error}</p>
		{/if}

		<div class="mt-2 flex items-center justify-end gap-2">
			{#if parentId && !isThreadFooter}
				<ButtonUi
					type="button"
					variant="ghost"
					class="h-9 px-3"
					onclick={() => {
						clearPending();
						body = '';
						open = false;
					}}
				>
					Cancel
				</ButtonUi>
			{/if}
			<ButtonUi
				type="button"
				variant="secondary"
				class="h-9 w-9 shrink-0 p-0 px-0"
				onclick={pickFiles}
				aria-label="Attach files"
				title="Attach files"
			>
				<HugeiconsIcon
					icon={Attachment01Icon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					class="shrink-0"
					aria-hidden={true}
				/>
			</ButtonUi>
			<ButtonUi type="submit" disabled={!canSend} class="h-9">
				{submitLabel}
			</ButtonUi>
		</div>
	</form>
{/if}
