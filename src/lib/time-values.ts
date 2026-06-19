import { Time } from '@internationalized/date';

export function timeFromDate(d: Date): Time {
	return new Time(d.getHours(), d.getMinutes());
}

export function timeFromInputString(s: string): Time | undefined {
	if (!s) return undefined;
	const match = /^(\d{1,2}):(\d{2})$/.exec(s);
	if (!match) return undefined;
	return new Time(Number(match[1]), Number(match[2]));
}

export function timeInputStringFromValue(v: Time | undefined): string {
	if (!v) return '';
	return `${String(v.hour).padStart(2, '0')}:${String(v.minute).padStart(2, '0')}`;
}
