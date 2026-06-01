<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import { defaultEndIso, localDateTimeToIso } from '$lib/shared/calendar';
	import { textChanged } from '$lib/shared/form-changes';

	type Props = {
		open?: boolean;
		mode: 'create' | 'edit';
		eventId?: string;
		title?: string;
		description?: string;
		date?: string;
		startTime?: string;
		endTime?: string;
		onClose?: () => void;
	};

	let {
		open = $bindable(false),
		mode,
		eventId = '',
		title = '',
		description = '',
		date = '',
		startTime = '',
		endTime = '',
		onClose
	}: Props = $props();

	let titleValue = $state('');
	let descriptionValue = $state('');
	let dateValue = $state('');
	let startTimeValue = $state('');
	let endTimeValue = $state('');

	$effect(() => {
		if (!open) return;

		const syncTitle = title;
		const syncDescription = description;
		const syncDate = date;
		const syncStartTime = startTime;
		const syncEndTime = endTime;

		untrack(() => {
			titleValue = syncTitle;
			descriptionValue = syncDescription;
			dateValue = syncDate;
			startTimeValue = syncStartTime;
			endTimeValue = syncEndTime;
		});
	});

	const dialogTitle = $derived(mode === 'create' ? 'New event' : 'Edit event');
	const submitAction = $derived(mode === 'create' ? '?/addEvent' : '?/updateEvent');
	const canSave = $derived(
		mode === 'create' ||
			textChanged(titleValue, title) ||
			textChanged(descriptionValue, description) ||
			dateValue !== date ||
			startTimeValue !== startTime ||
			endTimeValue !== endTime
	);

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open title={dialogTitle} onOpenChange={(value) => !value && handleClose()}>
	<form
		method="POST"
		action={submitAction}
		use:enhance={({ formData, submitter, cancel }) => {
			const action = submitter?.getAttribute('formaction') ?? '';
			const isDelete = action.includes('deleteEvent');

			if (!isDelete) {
				const date = formData.get('date')?.toString() ?? '';
				const startTime = formData.get('startTime')?.toString() ?? '';
				const endTime = formData.get('endTime')?.toString() ?? '';

				if (!date || !startTime) {
					cancel();
					return;
				}

				formData.set('startsAt', localDateTimeToIso(date, startTime));
				formData.set('endsAt', defaultEndIso(date, startTime, endTime));
			}

			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="space-y-4"
	>
		{#if mode === 'edit'}
			<input type="hidden" name="eventId" value={eventId} />
		{/if}
		<div>
			<Label for="event-title">Title</Label>
			<Input
				id="event-title"
				name="title"
				bind:value={titleValue}
				placeholder="e.g. Launch review"
				required
			/>
		</div>
		<div>
			<Label for="event-description">Description</Label>
			<Textarea
				id="event-description"
				name="description"
				bind:value={descriptionValue}
				rows={3}
				placeholder="Agenda, links, or notes"
			/>
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div>
				<Label for="event-date">Date</Label>
				<Input id="event-date" name="date" type="date" bind:value={dateValue} required />
			</div>
			<div>
				<Label for="event-start">Start</Label>
				<Input id="event-start" name="startTime" type="time" bind:value={startTimeValue} required />
			</div>
			<div>
				<Label for="event-end">End</Label>
				<Input id="event-end" name="endTime" type="time" bind:value={endTimeValue} />
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2 pt-2">
			{#if mode === 'edit'}
				<ButtonUi
					type="submit"
					formaction="?/deleteEvent"
					formmethod="POST"
					formnovalidate
					variant="ghost"
					class="text-red-700 hover:bg-red-50"
				>
					Delete
				</ButtonUi>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={mode === 'edit' && !canSave}>
					{mode === 'create' ? 'Create' : 'Save'}
				</ButtonUi>
			</div>
		</div>
	</form>
</Dialog>
