<script lang="ts">
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Attachment01Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Tooltip from '../../ui/tooltip.svelte';
	import {
		CHAT_ATTACHMENT_ACCEPT,
		CHAT_ATTACHMENT_MAX_BYTES,
		CHAT_ATTACHMENT_MAX_PER_MESSAGE,
		formatAttachmentSize,
		isImageMimeType
	} from '$lib/shared/chat-attachments';
	import { TASK_ATTACHMENT_ACCEPT } from '$lib/shared/task-attachments';

	const allowedMimeTypes = new Set(TASK_ATTACHMENT_ACCEPT.split(',').map((t) => t.trim()));

	type PendingAttachment = {
		id: string;
		file: File;
		previewUrl: string | null;
	};

	type Props = {
		onSent?: () => void;
	};

	let { onSent }: Props = $props();

	let body = $state('');
	let pendingAttachments = $state<PendingAttachment[]>([]);
	let fileInput = $state<HTMLInputElement | null>(null);
	let error = $state('');

	const canSend = $derived(body.trim().length > 0 || pendingAttachments.length > 0);

	const fieldShellClass =
		'overflow-hidden rounded-lg border border-border bg-surface-raised focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20';
	const textareaClass =
		'block w-full resize-none border-0 bg-transparent px-3.5 py-2.5 text-sm leading-relaxed text-ink placeholder:text-stone-400 focus:outline-none';

	const imageExtByMime: Record<string, string> = {
		'image/jpeg': '.jpg',
		'image/png': '.png',
		'image/gif': '.gif',
		'image/webp': '.webp'
	};

	function toPending(file: File): PendingAttachment {
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

		if (combined.length > CHAT_ATTACHMENT_MAX_PER_MESSAGE) {
			error = `At most ${CHAT_ATTACHMENT_MAX_PER_MESSAGE} files per message`;
			abortIncoming();
			return;
		}

		for (const { file } of incoming) {
			if (!allowedMimeTypes.has(file.type)) {
				error = 'File type not allowed. Use JPEG, PNG, GIF, WebP, PDF, or plain text.';
				abortIncoming();
				return;
			}
			if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
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

	function removeAttachment(item: PendingAttachment) {
		if (item.previewUrl) {
			URL.revokeObjectURL(item.previewUrl);
		}
		pendingAttachments = pendingAttachments.filter((a) => a.id !== item.id);
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

<form
	method="POST"
	action="?/sendMessage"
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
			onSent?.();
		};
	}}
	class="border-t border-border p-3"
>
	<div class={fieldShellClass}>
		{#if pendingAttachments.length > 0}
			<ul class="flex flex-wrap gap-2 border-b border-border px-3 py-2">
				{#each pendingAttachments as item (item.id)}
					<li
						class="flex max-w-full items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
					>
						{#if item.previewUrl}
							<img src={item.previewUrl} alt="" class="size-8 shrink-0 rounded object-cover" />
						{/if}
						<span class="min-w-0 truncate text-ink" title={item.file.name}>{item.file.name}</span>
						<span class="shrink-0 text-ink-muted">{formatAttachmentSize(item.file.size)}</span>
						<Tooltip text="Remove attachment">
							{#snippet trigger(props)}
								<button
									{...props}
									type="button"
									class="shrink-0 text-ink-muted hover:text-ink"
									aria-label="Remove {item.file.name}"
									onclick={() => removeAttachment(item)}
								>
									×
								</button>
							{/snippet}
						</Tooltip>
					</li>
				{/each}
			</ul>
		{/if}

		<Label for="message-body" class="sr-only">Message</Label>
		<textarea
			id="message-body"
			name="body"
			rows="4"
			bind:value={body}
			placeholder="Write a message…"
			class={textareaClass}
			onpaste={onPaste}
		></textarea>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept={CHAT_ATTACHMENT_ACCEPT}
		multiple
		class="sr-only"
		onchange={onFilesSelected}
	/>

	{#if error}
		<p class="mt-2 text-xs text-red-600" role="alert">{error}</p>
	{/if}

	<div class="mt-2 flex items-center justify-end gap-2">
		<Tooltip text="Attach images, PDFs, or text files (up to 5 MB each)">
			{#snippet trigger(props)}
				<ButtonUi
					{...props}
					type="button"
					variant="secondary"
					class="h-9 w-9 shrink-0 p-0 px-0"
					onclick={pickFiles}
					aria-label="Attach files"
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
			{/snippet}
		</Tooltip>
		<Tooltip text={canSend ? 'Send message' : 'Write a message or attach a file'}>
			{#snippet trigger(props)}
				<span {...props} class="inline-flex">
					<ButtonUi type="submit" disabled={!canSend} class="h-9">Send</ButtonUi>
				</span>
			{/snippet}
		</Tooltip>
	</div>
</form>
