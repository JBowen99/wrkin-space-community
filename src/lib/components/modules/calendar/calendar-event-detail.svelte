<script lang="ts">
	import { enhance } from '$app/forms';
	import type { DateValue, Time } from '@internationalized/date';
	import type { CalendarEventRow } from '$lib/server/modules';
	import type { CalendarAttachmentRow } from '$lib/server/calendar-attachments';
	import type { CalendarInvitationRow } from '$lib/server/calendar-invitations';
	import type { TeamMemberRow } from '$lib/server/team-members';
	import {
		defaultEndIso,
		eventToFormDefaults,
		formatEventRange,
		localDateTimeToIso
	} from '$lib/shared/calendar';
	import { textChanged } from '$lib/shared/form-changes';
	import { calendarDateFromInputString, dateInputStringFromValue } from '../../../date-values';
	import { timeFromInputString, timeInputStringFromValue } from '../../../time-values';
	import ModuleHeader from '../module-header.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import DatePickerUi from '../../ui/date-picker.svelte';
	import TimeFieldUi from '../../ui/time-field.svelte';
	import ConfirmDialog from '../../ui/confirm-dialog.svelte';
	import CalendarEventInvitations from './calendar-event-invitations.svelte';
	import CalendarEventAttachments from './calendar-event-attachments.svelte';

	type Props = {
		event: CalendarEventRow;
		moduleIndexUrl: string;
		moduleTitle: string;
		typeLabel: string;
		moduleId: string;
		attachments?: CalendarAttachmentRow[];
		invitations?: CalendarInvitationRow[];
		teamMembers?: TeamMemberRow[];
		currentUserId?: string;
	};

	let {
		event,
		moduleIndexUrl,
		moduleTitle,
		typeLabel,
		moduleId,
		attachments = [],
		invitations = [],
		teamMembers = [],
		currentUserId = ''
	}: Props = $props();

	let currentAttachments = $state<CalendarAttachmentRow[]>(attachments);
	let currentInvitations = $state<CalendarInvitationRow[]>(invitations);

	let editing = $state(false);
	let deleteConfirmOpen = $state(false);
	let metaExpanded = $state(false);

	const formDefaults = $derived(eventToFormDefaults(event));

	let titleValue = $state('');
	let descriptionValue = $state('');
	let eventDate = $state<DateValue | undefined>(undefined);
	let eventStartTime = $state<Time | undefined>(undefined);
	let eventEndTime = $state<Time | undefined>(undefined);

	const timeRange = $derived(formatEventRange(event.startsAt, event.endsAt));
	const hasDescription = $derived(Boolean(event.description?.trim()));
	const isImported = $derived(Boolean(event.icalUid));
	const formattedCreatedAt = $derived(
		new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(event.createdAt))
	);

	const endTimeInvalid = $derived(
		eventEndTime !== undefined &&
			eventStartTime !== undefined &&
			(eventEndTime.hour < eventStartTime.hour ||
				(eventEndTime.hour === eventStartTime.hour &&
					eventEndTime.minute <= eventStartTime.minute))
	);

	const canSave = $derived(
		!endTimeInvalid &&
			(textChanged(titleValue, event.title) ||
				textChanged(descriptionValue, formDefaults.description) ||
				dateInputStringFromValue(eventDate) !== formDefaults.date ||
				timeInputStringFromValue(eventStartTime) !== formDefaults.startTime ||
				timeInputStringFromValue(eventEndTime) !== formDefaults.endTime)
	);

	function startEditing() {
		titleValue = event.title;
		descriptionValue = formDefaults.description;
		eventDate = calendarDateFromInputString(formDefaults.date);
		eventStartTime = timeFromInputString(formDefaults.startTime);
		eventEndTime = timeFromInputString(formDefaults.endTime);
		editing = true;
	}

	function cancelEditing() {
		editing = false;
	}
</script>

<ModuleHeader
	backHref={moduleIndexUrl}
	backLabel={moduleTitle}
	{typeLabel}
	title={editing ? titleValue : event.title}
	{moduleId}
>
	{#snippet titleTrailing()}
		<div class="flex items-center gap-2">
			{#if editing}
				<ButtonUi type="button" variant="secondary" onclick={cancelEditing}>Cancel</ButtonUi>
				<ButtonUi type="submit" form="event-edit-form" disabled={!canSave || endTimeInvalid}>Save</ButtonUi>
			{:else}
				<ButtonUi
					type="button"
					variant="ghost"
					class="text-danger hover:bg-danger-muted"
					onclick={() => (deleteConfirmOpen = true)}
				>
					Delete
				</ButtonUi>
				<ButtonUi type="button" variant="secondary" onclick={startEditing}>Edit</ButtonUi>
				<BookmarkToggle
					targetType="calendarEvent"
					targetId={event.id}
					label={event.title}
					size={16}
					class="h-11 w-11 rounded-lg"
				/>
			{/if}
		</div>
	{/snippet}
</ModuleHeader>

{#if editing}
	<form
		id="event-edit-form"
		method="POST"
		action="?/updateEvent"
		use:enhance={({ formData, cancel }) => {
			const dateStr = dateInputStringFromValue(eventDate);
			const startTimeStr = timeInputStringFromValue(eventStartTime);
			const endTimeStr = timeInputStringFromValue(eventEndTime);

			if (!dateStr || !startTimeStr || endTimeInvalid) {
				cancel();
				return;
			}

			formData.set('startsAt', localDateTimeToIso(dateStr, startTimeStr));
			formData.set('endsAt', defaultEndIso(dateStr, startTimeStr, endTimeStr));

			return async ({ update }) => {
				await update();
				editing = false;
			};
		}}
		class="mx-auto max-w-2xl space-y-4"
	>
		<input type="hidden" name="eventId" value={event.id} />
		<div>
			<Label for="event-title">Title</Label>
			<Input
				id="event-title"
				name="title"
				bind:value={titleValue}
				placeholder="Event title"
				required
			/>
		</div>
		<div>
			<Label for="event-description">Description</Label>
			<Textarea
				id="event-description"
				name="description"
				bind:value={descriptionValue}
				rows={4}
				placeholder="Description"
			/>
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<DatePickerUi label="Date" bind:value={eventDate} />
			<TimeFieldUi label="Start" bind:value={eventStartTime} required />
			<TimeFieldUi label="End" bind:value={eventEndTime} />
		</div>
		{#if endTimeInvalid}
			<p class="text-danger text-xs">End time must be after start time</p>
		{/if}
	</form>
	{:else}
	<div class="mx-auto max-w-2xl space-y-6">
		<div>
			<p class="text-ink text-sm font-medium">Date & Time</p>
			<p class="text-ink-muted mt-1">{timeRange}</p>
		</div>

		{#if hasDescription}
			<div>
				<p class="text-ink text-sm font-medium">Description</p>
				<p class="text-ink-muted mt-1 leading-relaxed whitespace-pre-wrap">{event.description}</p>
			</div>
		{/if}

		{#if currentInvitations.length > 0 || teamMembers.length > 0}
			<CalendarEventInvitations
				eventId={event.id}
				invitations={currentInvitations}
				{teamMembers}
				{currentUserId}
				onChange={(updated) => (currentInvitations = updated)}
			/>
		{/if}

		<CalendarEventAttachments
			eventId={event.id}
			attachments={currentAttachments}
			onChange={(updated) => (currentAttachments = updated)}
		/>

		<div>
			<p class="text-ink text-sm font-medium">Details</p>
			<div class="mt-1 space-y-1">
				<p class="text-ink-muted">Created {formattedCreatedAt}</p>
				{#if isImported}
					<p class="text-ink-muted">Imported via iCal</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={deleteConfirmOpen}
	title="Delete event?"
	description="This event will be permanently removed."
	confirmLabel="Delete"
	destructive
	formAction="?/deleteEvent"
	hiddenFields={{ eventId: event.id }}
/>
