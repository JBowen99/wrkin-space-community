<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { DateValue, Time } from '@internationalized/date';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import DatePickerUi from '../../ui/date-picker.svelte';
	import TimeFieldUi from '../../ui/time-field.svelte';
	import { defaultEndIso, localDateTimeToIso } from '$lib/shared/calendar';
	import { textChanged } from '$lib/shared/form-changes';
	import { calendarDateFromInputString, dateInputStringFromValue } from '../../../date-values';
	import { timeFromInputString, timeInputStringFromValue } from '../../../time-values';

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
	let eventDate = $state<DateValue | undefined>(undefined);
	let eventStartTime = $state<Time | undefined>(undefined);
	let eventEndTime = $state<Time | undefined>(undefined);

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
			eventDate = calendarDateFromInputString(syncDate);
			eventStartTime = timeFromInputString(syncStartTime);
			eventEndTime = timeFromInputString(syncEndTime);
		});
	});

	const dialogTitle = $derived(mode === 'create' ? 'New event' : 'Edit event');
	const submitAction = $derived(mode === 'create' ? '?/addEvent' : '?/updateEvent');
	const endTimeInvalid = $derived(
		eventEndTime !== undefined &&
			eventStartTime !== undefined &&
			(eventEndTime.hour < eventStartTime.hour ||
				(eventEndTime.hour === eventStartTime.hour &&
					eventEndTime.minute <= eventStartTime.minute))
	);

	const canSave = $derived(
		!endTimeInvalid &&
			(mode === 'create' ||
				textChanged(titleValue, title) ||
				textChanged(descriptionValue, description) ||
				dateInputStringFromValue(eventDate) !== date ||
				timeInputStringFromValue(eventStartTime) !== startTime ||
				timeInputStringFromValue(eventEndTime) !== endTime)
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
				const dateStr = dateInputStringFromValue(eventDate);
				const startTimeStr = timeInputStringFromValue(eventStartTime);
				const endTimeStr = timeInputStringFromValue(eventEndTime);

				if (!dateStr || !startTimeStr || endTimeInvalid) {
					cancel();
					return;
				}

				formData.set('startsAt', localDateTimeToIso(dateStr, startTimeStr));
				formData.set('endsAt', defaultEndIso(dateStr, startTimeStr, endTimeStr));
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
		<div>
			<DatePickerUi label="Date" bind:value={eventDate} />
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<TimeFieldUi label="Start" bind:value={eventStartTime} required />
			<TimeFieldUi label="End" bind:value={eventEndTime} />
		</div>
		{#if endTimeInvalid}
			<p class="text-danger text-xs">End time must be after start time</p>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-2 pt-2">
			{#if mode === 'edit'}
				<ButtonUi
					type="submit"
					formaction="?/deleteEvent"
					formmethod="POST"
					formnovalidate
					variant="ghost"
					class="text-danger hover:bg-danger-muted"
				>
					Delete
				</ButtonUi>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={(mode === 'edit' && !canSave) || endTimeInvalid}>
					{mode === 'create' ? 'Create' : 'Save'}
				</ButtonUi>
			</div>
		</div>
	</form>
</Dialog>
