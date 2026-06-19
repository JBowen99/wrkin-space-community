<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Attachment01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
	import FieldShell from '../../ui/field-shell.svelte';
	import FileInput from '../../ui/file-input.svelte';
	import Label from '../../ui/label.svelte';
	import Textarea from '../../ui/textarea.svelte';
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
	let textareaRef: Textarea | undefined = $state();
	let formEl: HTMLFormElement | undefined = $state();
	let error = $state('');

	const canSend = $derived(body.trim().length > 0 || pendingAttachments.length > 0);

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

	const MAX_TEXTAREA_HEIGHT = 160;

	function autoResize() {
		const el = textareaRef?.getRef();
		if (!el) return;
		el.style.height = 'auto';
		const capped = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
		el.style.height = capped + 'px';
		el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
	}

	function onTextareaKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (canSend && formEl) {
				formEl.requestSubmit();
			}
		}
	}

	$effect(() => {
		void body;
		tick().then(autoResize);
	});
</script>

<form
	bind:this={formEl}
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
			tick().then(autoResize);
		};
	}}
	class="border-border border-t p-3"
>
	{#if pendingAttachments.length > 0}
		<ul class="border-border mb-2 flex flex-wrap gap-2 border-b px-3 pb-2">
			{#each pendingAttachments as item (item.id)}
				<li
					class="border-border bg-surface flex max-w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
				>
					{#if item.previewUrl}
						<img src={item.previewUrl} alt="" class="size-8 shrink-0 rounded object-cover" />
					{/if}
					<span class="text-ink min-w-0 truncate" title={item.file.name}>{item.file.name}</span>
					<span class="text-ink-muted shrink-0">{formatAttachmentSize(item.file.size)}</span>
					<IconButton
						label="Remove {item.file.name}"
						tooltip="Remove attachment"
						size="sm"
						variant="subtle"
						onclick={() => removeAttachment(item)}
					>
						<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
					</IconButton>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="flex items-center gap-2">
		<FieldShell withMargin={false} class="min-w-0 flex-1">
			<Label for="message-body" class="sr-only">Message</Label>
			<Textarea
				bind:this={textareaRef}
				id="message-body"
				name="body"
				variant="plain"
				rows={1}
				bind:value={body}
				placeholder="Write a message…"
				onpaste={onPaste}
				onkeydown={onTextareaKeydown}
			/>
		</FieldShell>

		<div class="flex shrink-0 items-center gap-1">
			<Tooltip text="Attach images, PDFs, or text files (up to 5 MB each)">
				{#snippet trigger(props)}
					<ButtonUi
						{...props}
						type="button"
						variant="secondary"
						class="size-10 p-0"
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
			<ButtonUi type="submit" disabled={!canSend} class="h-10">Send</ButtonUi>
		</div>
	</div>

	<FileInput
		bind:input={fileInput}
		accept={CHAT_ATTACHMENT_ACCEPT}
		multiple
		onchange={onFilesSelected}
	/>

	{#if error}
		<p class="text-danger mt-2 text-xs" role="alert">{error}</p>
	{/if}
</form>
