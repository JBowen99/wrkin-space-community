import { describe, expect, it } from 'vitest';
import {
	createCalendarEventContent,
	defaultEndIso,
	localDateTimeToIso,
	slotToFormDefaults,
	timeGridEventContentHeightPx,
	timeGridEventLabelVisibilityFromDuration,
	toCalendarDisplayEvents,
	toDateInputValue
} from './calendar';

describe('calendar utilities', () => {
	it('maps events to display range with default duration', () => {
		const start = new Date('2026-05-18T15:00:00');
		const result = toCalendarDisplayEvents([
			{ id: '1', title: 'Standup', startsAt: start, endsAt: null }
		]);

		expect(result[0].start).toEqual(start);
		expect(result[0].end.getTime() - result[0].start.getTime()).toBe(60 * 60 * 1000);
	});

	it('builds ISO instants from local date and time', () => {
		const iso = localDateTimeToIso('2026-05-18', '15:30');
		expect(new Date(iso).getHours()).toBe(15);
		expect(new Date(iso).getMinutes()).toBe(30);
	});

	it('defaults end time one hour after start', () => {
		const endIso = defaultEndIso('2026-05-18', '09:00');
		const start = new Date(localDateTimeToIso('2026-05-18', '09:00'));
		const end = new Date(endIso);
		expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
	});

	it('uses 09:00 for all-day slot clicks', () => {
		const clicked = new Date('2026-05-18T00:00:00');
		const defaults = slotToFormDefaults(clicked, true);
		expect(defaults.startTime).toBe('09:00');
		expect(defaults.date).toBe(toDateInputValue(clicked));
	});

	it('derives content height from event duration', () => {
		expect(timeGridEventContentHeightPx(15 * 60 * 1000)).toBe(8);
		expect(timeGridEventContentHeightPx(30 * 60 * 1000)).toBe(20);
		expect(timeGridEventContentHeightPx(45 * 60 * 1000)).toBe(32);
	});

	it('hides all labels when a time-grid event is shorter than one line', () => {
		expect(timeGridEventLabelVisibilityFromDuration(15 * 60 * 1000)).toEqual({
			showTime: false,
			showTitle: false
		});
	});

	it('shows title only for one-line time-grid events', () => {
		expect(timeGridEventLabelVisibilityFromDuration(30 * 60 * 1000)).toEqual({
			showTime: false,
			showTitle: true
		});
		expect(timeGridEventLabelVisibilityFromDuration(45 * 60 * 1000)).toEqual({
			showTime: false,
			showTitle: true
		});
	});

	it('shows time and title when a time-grid event fits two lines', () => {
		expect(timeGridEventLabelVisibilityFromDuration(60 * 60 * 1000)).toEqual({
			showTime: true,
			showTitle: true
		});
	});

	it('renders title above time for long week-view events', () => {
		const start = new Date('2026-05-18T14:00:00');
		const end = new Date('2026-05-18T15:30:00');
		const content = createCalendarEventContent({
			event: { title: 'Design review', allDay: false, start, end },
			timeText: '2:00 – 3:30 PM',
			view: { type: 'timeGridWeek' }
		});

		expect(content?.html).toContain('ec-event-title">Design review</h4>');
		expect(content?.html).toContain('ec-event-time" datetime="');
		expect(content?.html?.indexOf('ec-event-title')).toBeLessThan(
			content?.html?.indexOf('ec-event-time') ?? 0
		);
	});

	it('renders title only for 45-minute week-view events', () => {
		const start = new Date('2026-05-18T16:00:00');
		const end = new Date('2026-05-18T16:45:00');
		const content = createCalendarEventContent({
			event: { title: 'Sprint retro', allDay: false, start, end },
			timeText: '4:00 – 4:45 PM',
			view: { type: 'timeGridWeek' }
		});

		expect(content?.html).toContain('ec-event-title">Sprint retro</h4>');
		expect(content?.html).not.toContain('ec-event-time');
	});

	it('renders no labels for 15-minute week-view events', () => {
		const start = new Date('2026-05-18T10:00:00');
		const end = new Date('2026-05-18T10:15:00');
		const content = createCalendarEventContent({
			event: { title: 'Quick sync', allDay: false, start, end },
			timeText: '10:00 – 10:15 AM',
			view: { type: 'timeGridWeek' }
		});

		expect(content?.html).toBe('');
	});

	it('leaves month view events on the default layout', () => {
		const start = new Date('2026-05-18T14:00:00');
		const end = new Date('2026-05-18T15:00:00');
		const content = createCalendarEventContent({
			event: { title: 'Design review', allDay: false, start, end },
			timeText: '2:00 PM',
			view: { type: 'dayGridMonth' }
		});

		expect(content).toBeUndefined();
	});
});
