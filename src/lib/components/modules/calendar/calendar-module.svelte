<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { Calendar, DayGrid, Interaction, List, TimeGrid } from '@event-calendar/core';
	import '@event-calendar/core/index.css';
	import type { CalendarEventRow } from '$lib/server/modules';
	import {
		createCalendarEventContent,
		eventToFormDefaults,
		slotToFormDefaults,
		toCalendarDisplayEvents,
		type CalendarEventInput
	} from '$lib/shared/calendar';
	import CalendarEventDialog from './calendar-event-dialog.svelte';
	import CalendarEventHover from './calendar-event-hover.svelte';
	import CalendarToolbar from './calendar-toolbar.svelte';

	type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

	type CalendarInstance = {
		prev: () => void;
		next: () => void;
		setOption: (name: string, value: unknown) => void;
	};

	type IcsImportForm = {
		success?: boolean;
		icsImport?: { imported: number; updated: number; skipped: number };
		message?: string;
	};

	type Props = {
		events: CalendarEventRow[];
		teamSlug: string;
		wrkspaceSlug: string;
		moduleId: string;
	};

	let { events, teamSlug, wrkspaceSlug, moduleId }: Props = $props();

	let dialogOpen = $state(false);
	let dialogMode = $state<'create' | 'edit'>('create');
	let editingEventId = $state('');
	let formTitle = $state('');
	let formDescription = $state('');
	let formDate = $state('');
	let formStartTime = $state('');
	let formEndTime = $state('');

	let hoverEvent = $state<CalendarEventInput | null>(null);
	let hoverAnchor = $state<DOMRect | null>(null);
	let icsInputRef = $state<HTMLInputElement | null>(null);

	let calendarRef = $state<CalendarInstance | null>(null);
	let toolbarTitle = $state('');
	let currentView = $state<CalendarView>('dayGridMonth');

	const displayEvents = $derived(toCalendarDisplayEvents(events));

	const exportHref = $derived(
		`/api/calendar/export?teamSlug=${encodeURIComponent(teamSlug)}&wrkspaceSlug=${encodeURIComponent(wrkspaceSlug)}&moduleId=${encodeURIComponent(moduleId)}`
	);

	const icsImportMessage = $derived.by(() => {
		const form = page.form as IcsImportForm | null;
		if (!form?.success || !form.icsImport) return '';
		const { imported, updated, skipped } = form.icsImport;
		const parts: string[] = [];
		if (imported > 0) parts.push(`${imported} imported`);
		if (updated > 0) parts.push(`${updated} updated`);
		if (skipped > 0) parts.push(`${skipped} skipped`);
		return parts.length > 0 ? `ICS import: ${parts.join(', ')}.` : 'ICS import complete.';
	});

	function handleDatesSet(info: { view: { title: string; type: string } }) {
		toolbarTitle = info.view.title;
		if (
			info.view.type === 'dayGridMonth' ||
			info.view.type === 'timeGridWeek' ||
			info.view.type === 'listWeek'
		) {
			currentView = info.view.type;
		}
	}

	function goPrev() {
		calendarRef?.prev();
	}

	function goNext() {
		calendarRef?.next();
	}

	function goToday() {
		calendarRef?.setOption('date', new Date());
	}

	function setView(view: CalendarView) {
		calendarRef?.setOption('view', view);
	}

	function openImportPicker() {
		icsInputRef?.click();
	}

	function openCreate(clicked: Date, allDay: boolean) {
		const defaults = slotToFormDefaults(clicked, allDay);
		dialogMode = 'create';
		editingEventId = '';
		formTitle = '';
		formDescription = '';
		formDate = defaults.date;
		formStartTime = defaults.startTime;
		formEndTime = defaults.endTime;
		dialogOpen = true;
	}

	function openEdit(event: CalendarEventRow) {
		const defaults = eventToFormDefaults(event);
		dialogMode = 'edit';
		editingEventId = event.id;
		formTitle = event.title;
		formDescription = event.description;
		formDate = defaults.date;
		formStartTime = defaults.startTime;
		formEndTime = defaults.endTime;
		dialogOpen = true;
	}

	function clearHover() {
		hoverEvent = null;
		hoverAnchor = null;
	}

	function findEventById(id: string | number | undefined): CalendarEventRow | undefined {
		if (id == null) return undefined;
		return events.find((event) => event.id === String(id));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleDateClick(info: any) {
		openCreate(info.date as Date, Boolean(info.allDay));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleEventClick(info: any) {
		const row = findEventById(info.event?.id);
		if (row) {
			openEdit(row);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleEventMouseEnter(info: any) {
		const row = findEventById(info.event?.id);
		if (!row || !info.el) return;
		hoverEvent = row;
		hoverAnchor = (info.el as HTMLElement).getBoundingClientRect();
	}

	function handleEventMouseLeave() {
		clearHover();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleEventContent(info: any) {
		return createCalendarEventContent(info);
	}

	let options = $derived({
		view: currentView,
		firstDay: 0,
		height: '100%',
		headerToolbar: {
			start: '',
			center: '',
			end: ''
		},
		datesSet: handleDatesSet,
		events: displayEvents,
		editable: false,
		nowIndicator: true,
		dateClick: handleDateClick,
		eventClick: handleEventClick,
		eventMouseEnter: handleEventMouseEnter,
		eventMouseLeave: handleEventMouseLeave,
		eventContent: handleEventContent
	});
</script>

<form
	method="POST"
	action="?/importIcs"
	enctype="multipart/form-data"
	class="hidden"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			if (icsInputRef) icsInputRef.value = '';
		};
	}}
>
	<input
		bind:this={icsInputRef}
		type="file"
		name="icsFile"
		accept=".ics,text/calendar"
		onchange={(e) => {
			const input = e.currentTarget;
			if (input.files?.[0]) {
				input.form?.requestSubmit();
			}
		}}
	/>
</form>

<div class="ec-wrkin mt-6 flex max-h-[calc(100vh-10rem)] min-h-[32rem] flex-col gap-4">
	{#if browser}
		<CalendarToolbar
			title={toolbarTitle}
			view={currentView}
			{exportHref}
			onImportClick={openImportPicker}
			onPrev={goPrev}
			onNext={goNext}
			onToday={goToday}
			onViewChange={setView}
		/>
		{#if icsImportMessage}
			<p class="text-sm text-ink-muted" role="status">{icsImportMessage}</p>
		{/if}
		<div class="min-h-0 flex-1">
			<Calendar
				bind:this={calendarRef as never}
				plugins={[DayGrid, TimeGrid, List, Interaction]}
				{options}
			/>
		</div>
	{:else}
		<p class="py-8 text-sm text-ink-muted">Loading calendar…</p>
	{/if}
</div>

<CalendarEventHover event={hoverEvent} anchorRect={hoverAnchor} />

{#key `${dialogMode}-${editingEventId}`}
	<CalendarEventDialog
		bind:open={dialogOpen}
		mode={dialogMode}
		eventId={editingEventId}
		title={formTitle}
		description={formDescription}
		date={formDate}
		startTime={formStartTime}
		endTime={formEndTime}
		onClose={clearHover}
	/>
{/key}
