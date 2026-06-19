import type { ActivityEventDisplay } from './activity-render';

export type ActivityDayGroup = {
	dayKey: string;
	dayLabel: string;
	events: ActivityEventDisplay[];
};

function formatDayLabel(date: Date): string {
	return date.toLocaleDateString(undefined, {
		weekday: 'long',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

function dayKeyFromDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function groupActivityByDay(events: ActivityEventDisplay[]): ActivityDayGroup[] {
	const byDay = new Map<string, ActivityEventDisplay[]>();

	for (const event of events) {
		const key = dayKeyFromDate(event.createdAt);
		const list = byDay.get(key) ?? [];
		list.push(event);
		byDay.set(key, list);
	}

	const keys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

	return keys.map((dayKey) => {
		const dayEvents = byDay.get(dayKey) ?? [];
		const sampleDate = dayEvents[0]?.createdAt ?? new Date();
		return {
			dayKey,
			dayLabel: formatDayLabel(sampleDate),
			events: dayEvents
		};
	});
}

export function countActivityByType(events: ActivityEventDisplay[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const event of events) {
		counts[event.type] = (counts[event.type] ?? 0) + 1;
	}
	return counts;
}
