interface SvelteGanttDateAdapter {
	format(date: number, format: string): string;
	roundTo(date: number, unit: string, offset: number): number;
}

function pad(value: number): string {
	return value.toString().padStart(2, '0');
}

function getWeekNumber(d: Date): number {
	const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil(((date.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7);
}

function getPeriodDuration(unit: string, offset: number): number {
	switch (unit) {
		case 'y':
		case 'year':
			return offset * 31536000000;
		case 'month':
			return offset * 30 * 24 * 60 * 60 * 1000;
		case 'week':
			return offset * 7 * 24 * 60 * 60 * 1000;
		case 'd':
		case 'day':
			return offset * 24 * 60 * 60 * 1000;
		case 'h':
		case 'hour':
			return offset * 60 * 60 * 1000;
		case 'm':
		case 'minute':
			return offset * 60 * 1000;
		case 's':
		case 'second':
			return offset * 1000;
		default:
			throw new Error(`Unknown unit: ${unit}`);
	}
}

function formatDayMonth(d: Date): string {
	return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatDefaultDate(d: Date): string {
	return formatDayMonth(d) + `/${d.getFullYear()}`;
}

/** Date adapter for svelte-gantt, including formats missing from the library default. */
export class WrkinGanttDateAdapter implements SvelteGanttDateAdapter {
	format(date: number, format: string): string {
		const d = new Date(date);
		switch (format) {
			case 'D/M':
				return formatDayMonth(d);
			case 'ddd D/M': {
				const weekday = d.toLocaleString('default', { weekday: 'short' });
				return `${weekday} ${formatDayMonth(d)}`;
			}
			case 'ddd D MMM': {
				const weekday = d.toLocaleString('default', { weekday: 'short' });
				const month = d.toLocaleString('default', { month: 'short' });
				return `${weekday} ${d.getDate()} ${month}`;
			}
			case 'H':
				return `${d.getHours()}`;
			case 'HH':
				return pad(d.getHours());
			case 'H:mm':
				return `${d.getHours()}:${pad(d.getMinutes())}`;
			case 'hh:mm':
				return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
			case 'hh:mm:ss':
				return `${d.getHours()}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
			case 'dd/MM/yyyy':
				return formatDefaultDate(d);
			case 'dd/MM/yyyy hh:mm':
				return `${formatDefaultDate(d)} ${d.getHours()}:${d.getMinutes()}`;
			case 'dd/MM/yyyy hh:mm:ss':
				return `${formatDefaultDate(d)} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
			case 'YYYY':
				return `${d.getFullYear()}`;
			case 'Q':
				return `${Math.floor(d.getMonth() / 3 + 1)}`;
			case '[Q]Q':
				return `Q${Math.floor(d.getMonth() / 3 + 1)}`;
			case 'YYYY[Q]Q':
				return `${d.getFullYear()}Q${Math.floor(d.getMonth() / 3 + 1)}`;
			case 'MM': {
				let month = String(d.getMonth() + 1);
				if (month.length === 1) month = `0${month}`;
				return month;
			}
			case 'MMMM': {
				const month = d.toLocaleString('default', { month: 'long' });
				return `${month.charAt(0).toUpperCase()}${month.substring(1)}`;
			}
			case 'MMMM - YYYY': {
				const month = d.toLocaleString('default', { month: 'long' });
				return `${month.charAt(0).toUpperCase()}${month.substring(1)}-${d.getFullYear()}`;
			}
			case 'MMMM YYYY': {
				const month = d.toLocaleString('default', { month: 'long' });
				return `${month.charAt(0).toUpperCase()}${month.substring(1)} ${d.getFullYear()}`;
			}
			case 'MMM': {
				const month = d.toLocaleString('default', { month: 'short' });
				return `${month.charAt(0).toUpperCase()}${month.substring(1)}`;
			}
			case 'MMM - YYYY': {
				const month = d.toLocaleString('default', { month: 'short' });
				return `${month.charAt(0).toUpperCase()}${month.substring(1)} - ${d.getFullYear()}`;
			}
			case 'MMM YYYY': {
				const month = d.toLocaleString('default', { month: 'short' });
				return `${month.charAt(0).toUpperCase()}${month.substring(1)} ${d.getFullYear()}`;
			}
			case 'W':
				return `${getWeekNumber(d)}`;
			case 'WW': {
				const weeknumber = getWeekNumber(d);
				return `${weeknumber.toString().length === 1 ? '0' : ''}${weeknumber}`;
			}
			default:
				return formatDefaultDate(d);
		}
	}

	roundTo(date: number, unit: string, offset: number): number {
		const magnetDuration = getPeriodDuration(unit, offset);
		return Math.round(date / magnetDuration) * magnetDuration;
	}
}

export const wrkinGanttDateAdapter = new WrkinGanttDateAdapter();
