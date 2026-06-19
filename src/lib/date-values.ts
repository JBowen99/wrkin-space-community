import { CalendarDate, type DateValue } from '@internationalized/date';

export function calendarDateFromDate(d: Date): CalendarDate {
	return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function calendarDateFromInputString(s: string): CalendarDate | undefined {
	if (!s) return undefined;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!match) return undefined;
	return new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function dateInputStringFromValue(v: DateValue | undefined): string {
	if (!v) return '';
	return `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`;
}
