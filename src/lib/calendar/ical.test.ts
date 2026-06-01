import { describe, expect, it } from 'vitest';
import { parseIcsEvents, resolveExportUid, serializeIcsCalendar, wrkinIcalUid } from './ical';

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
UID:test-event-1@google.com
DTSTAMP:20260501T120000Z
DTSTART:20260515T140000Z
DTEND:20260515T153000Z
SUMMARY:Design review
DESCRIPTION:Agenda items:\\n- Walkthrough\\n- Q&A
END:VEVENT
END:VCALENDAR`;

describe('ical utilities', () => {
	it('parses SUMMARY, DESCRIPTION, DTSTART, DTEND, and UID', () => {
		const { events, skippedRecurring } = parseIcsEvents(SAMPLE_ICS);
		expect(skippedRecurring).toBe(0);
		expect(events).toHaveLength(1);
		expect(events[0].title).toBe('Design review');
		expect(events[0].description).toContain('Walkthrough');
		expect(events[0].icalUid).toBe('test-event-1@google.com');
		expect(events[0].startsAt.toISOString()).toBe('2026-05-15T14:00:00.000Z');
		expect(events[0].endsAt?.toISOString()).toBe('2026-05-15T15:30:00.000Z');
	});

	it('skips recurring VEVENTs', () => {
		const ics = `${SAMPLE_ICS.replace('END:VCALENDAR', '')}
BEGIN:VEVENT
UID:recur@google.com
DTSTAMP:20260501T120000Z
DTSTART:20260516T100000Z
DTEND:20260516T110000Z
SUMMARY:Weekly sync
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
END:VCALENDAR`;
		const { events, skippedRecurring } = parseIcsEvents(ics);
		expect(skippedRecurring).toBe(1);
		expect(events).toHaveLength(1);
	});

	it('round-trips export with stable UID', () => {
		const startsAt = new Date('2026-05-20T10:00:00.000Z');
		const endsAt = new Date('2026-05-20T11:00:00.000Z');
		const createdAt = new Date('2026-05-01T08:00:00.000Z');
		const ics = serializeIcsCalendar([
			{
				id: 'evt-1',
				title: 'Launch',
				description: 'Ship it',
				startsAt,
				endsAt,
				icalUid: null,
				createdAt
			}
		]);
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).toContain(`UID:${wrkinIcalUid('evt-1')}`);
		expect(ics).toContain('SUMMARY:Launch');
		expect(ics).toContain('DESCRIPTION:Ship it');

		const { events } = parseIcsEvents(ics);
		expect(events[0].title).toBe('Launch');
		expect(events[0].description).toBe('Ship it');
		expect(events[0].icalUid).toBe(wrkinIcalUid('evt-1'));
	});

	it('resolveExportUid prefers stored icalUid', () => {
		expect(resolveExportUid({ id: 'x', icalUid: 'external@cal.com' })).toBe('external@cal.com');
		expect(resolveExportUid({ id: 'x', icalUid: null })).toBe(wrkinIcalUid('x'));
	});
});
