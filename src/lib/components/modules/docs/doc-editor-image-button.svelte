<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Image01Icon } from '@hugeicons/core-free-icons';
	import { DOC_IMAGE_ACCEPT, DOC_IMAGE_MAX_BYTES } from '$lib/shared/doc-editor';
	import ButtonUi from '../../ui/button.svelte';
	import FileInput from '../../ui/file-input.svelte';
	import {
		registerImagePickerOpener,
		unregisterImagePickerOpener
	} from '$lib/shared/doc-editor-ui';

	type Props = {
		editor: Editor;
		docId: string;
	};

	let { editor, docId }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let error = $state('');

	function pickFile() {
		error = '';
		fileInput?.click();
	}

	async function onFileSelected(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		if (file.size > DOC_IMAGE_MAX_BYTES) {
			error = 'Image must be 5 MB or smaller';
			return;
		}

		uploading = true;
		error = '';

		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch(`/api/docs/images?docId=${encodeURIComponent(docId)}`, {
				method: 'POST',
				body: form
			});
			if (!res.ok) {
				const text = await res.text();
				let message = 'Upload failed';
				try {
					const body = JSON.parse(text) as { message?: string };
					if (body.message) message = body.message;
				} catch {
					if (text) message = text;
				}
				throw new Error(message);
			}
			const { url } = (await res.json()) as { url: string };
			editor.chain().focus().setImage({ src: url }).run();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	onMount(() => {
		registerImagePickerOpener(pickFile);
	});

	onDestroy(() => {
		unregisterImagePickerOpener(pickFile);
	});
</script>

<div class="image-upload-wrap">
	<FileInput bind:input={fileInput} accept={DOC_IMAGE_ACCEPT} onchange={onFileSelected} />
	<ButtonUi
		variant="unstyled"
		class="toolbar-icon-btn"
		title="Image (Ctrl+Shift+I)"
		disabled={uploading}
		onclick={pickFile}
	>
		{#if uploading}
			<span class="text-xs">…</span>
		{:else}
			<HugeiconsIcon
				icon={Image01Icon}
				size={18}
				color="currentColor"
				strokeWidth={2}
				aria-hidden={true}
			/>
		{/if}
	</ButtonUi>
	{#if error}
		<span class="image-upload-error" role="alert">{error}</span>
	{/if}
</div>

<style>
	.image-upload-wrap {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	:global(.doc-editor .toolbar-icon-btn:disabled) {
		cursor: wait;
	}

	.image-upload-error {
		font-size: 0.625rem;
		color: #dc2626;
		max-width: 8rem;
		line-height: 1.2;
	}
</style>
