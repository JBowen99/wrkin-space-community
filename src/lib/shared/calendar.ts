export type CalendarEventInput = {
	id: string;
	title: string;
	description?: string;
	startsAt: Date | string;
	endsAt: Date | string | null;
};

export type CalendarEventDisplay = {
	id: string;
	title: string;
	start: Date;
	end: Date;
};

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export function toCalendarDisplayEvents(events: CalendarEventInput[]): CalendarEventDisplay[] {
	return events.map((event) => {
		const start = new Date(event.startsAt);
		const end = event.endsAt
			? new Date(event.endsAt)
			: new Date(start.getTime() + DEFAULT_DURATION_MS);
		return { id: event.id, title: event.title, start, end };
	});
}

export function formatEventRange(
	start: Date | string,
	end: Date | string | null | undefined
): string {
	const startDate = new Date(start);
	const endDate = end ? new Date(end) : new Date(startDate.getTime() + DEFAULT_DURATION_MS);
	const formatter = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

/** Start (inclusive) and end (exclusive) of a calendar day in the runtime's local timezone. */
export function localDayBounds(date: Date = new Date()): { start: Date; end: Date } {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

export function toDateInputValue(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function toTimeInputValue(date: Date): string {
	const h = String(date.getHours()).padStart(2, '0');
	const m = String(date.getMinutes()).padStart(2, '0');
	return `${h}:${m}`;
}

export function localDateTimeToIso(date: string, time: string): string {
	return new Date(`${date}T${time}`).toISOString();
}

export function defaultEndIso(date: string, startTime: string, endTime?: string): string {
	if (endTime?.trim()) {
		return localDateTimeToIso(date, endTime);
	}
	const start = new Date(`${date}T${startTime}`);
	return new Date(start.getTime() + DEFAULT_DURATION_MS).toISOString();
}

export function slotToFormDefaults(
	clicked: Date,
	allDay: boolean
): { date: string; startTime: string; endTime: string } {
	const date = toDateInputValue(clicked);
	if (allDay) {
		return { date, startTime: '09:00', endTime: '10:00' };
	}
	const startTime = toTimeInputValue(clicked);
	const end = new Date(clicked.getTime() + DEFAULT_DURATION_MS);
	return { date, startTime, endTime: toTimeInputValue(end) };
}

export function eventToFormDefaults(event: CalendarEventInput): {
	date: string;
	startTime: string;
	endTime: string;
	description: string;
} {
	const start = new Date(event.startsAt);
	const end = event.endsAt
		? new Date(event.endsAt)
		: new Date(start.getTime() + DEFAULT_DURATION_MS);
	return {
		date: toDateInputValue(start),
		startTime: toTimeInputValue(start),
		endTime: toTimeInputValue(end),
		description: event.description ?? ''
	};
}

export function truncateDescription(text: string, maxLength = 120): string {
	const trimmed = text.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, maxLength - 1)}…`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Matches @event-calendar/core timeGrid defaults (slotDuration 30 min, slotHeight 24px). */
export const TIME_GRID_SLOT_DURATION_MS = 30 * 60 * 1000;
export const TIME_GRID_SLOT_HEIGHT_PX = 24;
export const TIME_GRID_EVENT_PADDING_PX = 4;
/** .ec-event font-size 0.85em × line-height 1.5 at 16px root. */
export const TIME_GRID_LINE_HEIGHT_PX = 20.4;

type CalendarEventContentInfo = {
	event: { title: string; allDay: boolean; start: Date; end: Date };
	timeText: string;
	view: { type: string };
};

export function timeGridEventContentHeightPx(durationMs: number): number {
	const blockHeight = (durationMs / TIME_GRID_SLOT_DURATION_MS) * TIME_GRID_SLOT_HEIGHT_PX;
	return Math.max(0, blockHeight - TIME_GRID_EVENT_PADDING_PX);
}

/** How many text lines fit in a time-grid event block (content area, excluding padding). */
export function timeGridEventLabelVisibility(
	contentHeightPx: number,
	lineHeightPx: number = TIME_GRID_LINE_HEIGHT_PX
): { showTime: boolean; showTitle: boolean } {
	if (!contentHeightPx || !lineHeightPx) {
		return { showTime: false, showTitle: false };
	}

	// Allow a partial line at the threshold so a full slot (e.g. 30 min) still shows title.
	const lines = contentHeightPx / lineHeightPx;
	return {
		showTitle: lines >= 0.85,
		showTime: lines >= 1.85
	};
}

export function timeGridEventLabelVisibilityFromDuration(durationMs: number): {
	showTime: boolean;
	showTitle: boolean;
} {
	return timeGridEventLabelVisibility(timeGridEventContentHeightPx(durationMs));
}

/** Title above time for stacked calendar views (week/day grid, list). */
export function createCalendarEventContent(
	info: CalendarEventContentInfo
): { html: string } | undefined {
	const { event, timeText, view } = info;
	if (!view.type.startsWith('timeGrid') && view.type !== 'listWeek') {
		return undefined;
	}

	let showTitle = true;
	let showTime = Boolean(!event.allDay && timeText);

	if (view.type.startsWith('timeGrid') && !event.allDay) {
		const durationMs = event.end.getTime() - event.start.getTime();
		({ showTitle, showTime } = timeGridEventLabelVisibilityFromDuration(durationMs));
		showTime &&= Boolean(timeText);
	}

	let html = '';
	if (showTitle) {
		html += `<h4 class="ec-event-title">${escapeHtml(event.title)}</h4>`;
	}
	if (showTime && timeText) {
		html += `<time class="ec-event-time" datetime="${escapeHtml(event.start.toISOString())}">${escapeHtml(timeText)}</time>`;
	}

	return { html };
}
