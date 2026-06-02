import ICAL from 'ical.js';

const PRODID = '-//wrkin.space//Calendar//EN';
const DEFAULT_DURATION_MS = 60 * 60 * 1000;
const WRKIN_UID_DOMAIN = 'wrkin.space';

export type IcsEventDraft = {
	title: string;
	description: string;
	startsAt: Date;
	endsAt: Date | null;
	icalUid: string | null;
};

export type IcsExportEvent = {
	id: string;
	title: string;
	description: string;
	startsAt: Date;
	endsAt: Date | null;
	icalUid: string | null;
	createdAt: Date;
};

export function wrkinIcalUid(eventId: string): string {
	return `wrkin-${eventId}@${WRKIN_UID_DOMAIN}`;
}

export function resolveExportUid(event: Pick<IcsExportEvent, 'id' | 'icalUid'>): string {
	return event.icalUid?.trim() || wrkinIcalUid(event.id);
}

/** Map iCal DATE (all-day) to local midnight through end of that calendar day. */
function allDayBounds(startTime: InstanceType<typeof ICAL.Time>): { startsAt: Date; endsAt: Date } {
	const start = startTime.toJSDate();
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setHours(23, 59, 59, 999);
	return { startsAt: start, endsAt: end };
}

function icalTimeToDates(
	startTime: InstanceType<typeof ICAL.Time>,
	endTime: InstanceType<typeof ICAL.Time> | null,
	duration: InstanceType<typeof ICAL.Duration> | null
): { startsAt: Date; endsAt: Date | null } {
	if (startTime.isDate) {
		return allDayBounds(startTime);
	}

	const startsAt = startTime.toJSDate();
	if (endTime && !endTime.isDate) {
		return { startsAt, endsAt: endTime.toJSDate() };
	}
	if (endTime?.isDate) {
		const end = endTime.toJSDate();
		end.setHours(23, 59, 59, 999);
		return { startsAt, endsAt: end };
	}
	if (duration) {
		const end = startTime.clone();
		end.addDuration(duration);
		return { startsAt, endsAt: end.toJSDate() };
	}
	return {
		startsAt,
		endsAt: new Date(startsAt.getTime() + DEFAULT_DURATION_MS)
	};
}

export function parseIcsEvents(icsText: string): {
	events: IcsEventDraft[];
	skippedRecurring: number;
} {
	const root = ICAL.Component.fromString(icsText);
	const vevents = root.getAllSubcomponents('vevent');
	const events: IcsEventDraft[] = [];
	let skippedRecurring = 0;

	for (const component of vevents) {
		const icalEvent = new ICAL.Event(component);
		if (icalEvent.isRecurring()) {
			skippedRecurring += 1;
			continue;
		}

		const title = icalEvent.summary?.trim() ?? '';
		if (!title) continue;

		const { startsAt, endsAt } = icalTimeToDates(
			icalEvent.startDate,
			icalEvent.endDate ?? null,
			icalEvent.duration ?? null
		);

		const uid = icalEvent.uid?.trim() ?? null;
		events.push({
			title,
			description: icalEvent.description?.trim() ?? '',
			startsAt,
			endsAt,
			icalUid: uid || null
		});
	}

	return { events, skippedRecurring };
}

function dateToIcalTime(date: Date): InstanceType<typeof ICAL.Time> {
	return ICAL.Time.fromJSDate(date, true);
}

export function serializeIcsCalendar(events: IcsExportEvent[]): string {
	const cal = new ICAL.Component(['vcalendar', [], []]);
	cal.updatePropertyWithValue('version', '2.0');
	cal.updatePropertyWithValue('prodid', PRODID);

	for (const row of events) {
		const vevent = new ICAL.Component('vevent');
		const icalEvent = new ICAL.Event(vevent);
		icalEvent.uid = resolveExportUid(row);
		icalEvent.summary = row.title;
		if (row.description.trim()) {
			icalEvent.description = row.description;
		}
		icalEvent.startDate = dateToIcalTime(row.startsAt);
		const end = row.endsAt ?? new Date(row.startsAt.getTime() + DEFAULT_DURATION_MS);
		icalEvent.endDate = dateToIcalTime(end);
		vevent.updatePropertyWithValue('dtstamp', dateToIcalTime(row.createdAt));
		cal.addSubcomponent(vevent);
	}

	return cal.toString();
}
