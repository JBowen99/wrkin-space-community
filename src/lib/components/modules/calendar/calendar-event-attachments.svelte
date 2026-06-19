<script lang="ts">
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
	import FileInput from '../../ui/file-input.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import type { CalendarAttachmentRow } from '$lib/server/calendar-attachments';
	import {
		CALENDAR_ATTACHMENT_ACCEPT,
		CALENDAR_ATTACHMENT_MAX_BYTES,
		CALENDAR_ATTACHMENT_MAX_PER_EVENT,
		formatAttachmentSize
	} from '$lib/shared/calendar-attachments';

	type Props = {
		eventId: string;
		attachments: CalendarAttachmentRow[];
		editable?: boolean;
		onChange?: (attachments: CalendarAttachmentRow[]) => void;
	};

	let { eventId, attachments, editable = true, onChange }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let deletingId = $state<string | null>(null);
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

		if (attachments.length >= CALENDAR_ATTACHMENT_MAX_PER_EVENT) {
			error = `Maximum ${CALENDAR_ATTACHMENT_MAX_PER_EVENT} attachments per event`;
			return;
		}

		if (file.size > CALENDAR_ATTACHMENT_MAX_BYTES) {
			error = 'File must be 5 MB or smaller';
			return;
		}

		uploading = true;
		error = '';

		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch(
				`/api/calendar/attachments?eventId=${encodeURIComponent(eventId)}`,
				{ method: 'POST', body: form }
			);
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
			const row = (await res.json()) as CalendarAttachmentRow;
			onChange?.([...attachments, row]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			uploading = false;
		}
	}

	async function removeAttachment(id: string) {
		deletingId = id;
		error = '';

		try {
			const res = await fetch(`/api/calendar/attachments/${encodeURIComponent(id)}`, {
				method: 'DELETE'
			});
			if (!res.ok) throw new Error('Delete failed');
			onChange?.(attachments.filter((a) => a.id !== id));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Delete failed';
		} finally {
			deletingId = null;
		}
	}
</script>

<div class="attachments">
	<div class="attachments-header">
		<p class="text-ink text-sm font-medium">
			Attachments{#if attachments.length > 0} ({attachments.length}){/if}
		</p>
		{#if editable}
			<FileInput bind:input={fileInput} accept={CALENDAR_ATTACHMENT_ACCEPT} onchange={onFileSelected} />
			<ButtonUi
				type="button"
				variant="secondary"
				class="h-8 px-2 text-xs"
				disabled={uploading}
				onclick={pickFile}
			>
				{uploading ? 'Uploading…' : 'Add file'}
			</ButtonUi>
		{/if}
	</div>

	{#if error}
		<p class="text-danger text-xs" role="alert">{error}</p>
	{/if}

	{#if attachments.length === 0}
		<p class="text-ink-muted text-xs">No attachments yet.</p>
	{:else}
		<ul class="attachments-list">
			{#each attachments as att (att.id)}
				<li class="attachment-row">
					<a href={att.url} target="_blank" rel="noopener noreferrer" class="attachment-link">
						{att.originalName}
					</a>
					<span class="text-ink-muted text-xs">{formatAttachmentSize(att.sizeBytes)}</span>
					{#if editable}
						<IconButton
							label="Remove attachment"
							size="sm"
							variant="subtle"
							disabled={deletingId === att.id}
							onclick={() => removeAttachment(att.id)}
						>
							<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
						</IconButton>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.attachments {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.attachments-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.attachments-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.attachment-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--color-border);
	}

	.attachment-link {
		flex: 1;
		min-width: 0;
		font-size: 0.875rem;
		color: var(--color-accent);
		text-decoration: underline;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
