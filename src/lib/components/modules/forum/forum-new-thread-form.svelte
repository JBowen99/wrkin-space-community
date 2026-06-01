<script lang="ts">
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Attachment01Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import {
		FORUM_ATTACHMENT_ACCEPT,
		FORUM_ATTACHMENT_MAX_BYTES,
		FORUM_ATTACHMENT_MAX_PER_POST,
		formatAttachmentSize,
		isImageMimeType
	} from '$lib/shared/forum-attachments';

	let title = $state('');
	let body = $state('');
	let open = $state(false);
	let pendingAttachments = $state<{ id: string; file: File; previewUrl: string | null }[]>([]);
	let fileInput = $state<HTMLInputElement | null>(null);
	let error = $state('');

	const canSubmit = $derived(
		title.trim().length > 0 && (body.trim().length > 0 || pendingAttachments.length > 0)
	);

	const fieldShellClass =
		'mt-1.5 overflow-hidden rounded-lg border border-border bg-surface-raised focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20';
	const inputClass =
		'block w-full border-0 bg-transparent px-3.5 py-2.5 text-sm text-ink placeholder:text-stone-400 focus:outline-none';
	const textareaClass = `${inputClass} resize-none leading-relaxed`;
	const allowedMimeTypes = new Set(FORUM_ATTACHMENT_ACCEPT.split(',').map((t) => t.trim()));

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

{#if !open}
	<ButtonUi type="button" class="h-10 shrink-0" onclick={() => (open = true)}>New thread</ButtonUi>
{:else}
	<div class="w-full basis-full">
		<form
			method="POST"
			action="?/createThread"
			enctype="multipart/form-data"
			use:enhance={({ formData }) => {
				formData.delete('attachments');
				for (const { file } of pendingAttachments) {
					formData.append('attachments', file);
				}

				return async ({ update, formElement }) => {
					await update();
					formElement.reset();
					title = '';
					body = '';
					clearPending();
				};
			}}
			class="mt-4 flex flex-col gap-4"
		>
			<div>
				<Label for="thread-title">Title</Label>
				<div class={fieldShellClass}>
					<input
						id="thread-title"
						name="title"
						type="text"
						required
						bind:value={title}
						placeholder="Thread subject"
						class={inputClass}
					/>
				</div>
			</div>

			<div>
				<Label for="thread-body">Message</Label>
				<div class={fieldShellClass}>
					{#if pendingAttachments.length > 0}
						<ul class="flex flex-wrap gap-2 border-b border-border px-3 py-2">
							{#each pendingAttachments as item (item.id)}
								<li
									class="flex max-w-full items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
								>
									{#if item.previewUrl}
										<img
											src={item.previewUrl}
											alt=""
											class="size-8 shrink-0 rounded object-cover"
										/>
									{/if}
									<span class="min-w-0 truncate text-ink" title={item.file.name}
										>{item.file.name}</span
									>
									<span class="shrink-0 text-ink-muted">{formatAttachmentSize(item.file.size)}</span
									>
									<button
										type="button"
										class="shrink-0 text-ink-muted hover:text-ink"
										aria-label="Remove {item.file.name}"
										onclick={() => removeAttachment(item.id)}
									>
										×
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					<textarea
						id="thread-body"
						name="body"
						rows="4"
						required
						bind:value={body}
						placeholder="Start the discussion…"
						class={textareaClass}
					></textarea>
				</div>
			</div>

			<input
				bind:this={fileInput}
				type="file"
				accept={FORUM_ATTACHMENT_ACCEPT}
				multiple
				class="sr-only"
				onchange={onFilesSelected}
			/>

			{#if error}
				<p class="-mt-2 text-xs text-red-600" role="alert">{error}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<ButtonUi
					type="button"
					variant="secondary"
					class="h-9"
					onclick={() => {
						clearPending();
						title = '';
						body = '';
						open = false;
					}}
				>
					Cancel
				</ButtonUi>
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
				<ButtonUi type="submit" disabled={!canSubmit} class="h-9">Create thread</ButtonUi>
			</div>
		</form>
	</div>
{/if}
