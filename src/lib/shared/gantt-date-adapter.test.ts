import { describe, expect, it } from 'vitest';
import { WrkinGanttDateAdapter } from './gantt-date-adapter';

describe('WrkinGanttDateAdapter', () => {
	const adapter = new WrkinGanttDateAdapter();
	const may18 = Date.UTC(2026, 4, 18, 12);

	it('formats day/month without year', () => {
		expect(adapter.format(may18, 'D/M')).toBe('18/5');
	});

	it('formats month name', () => {
		expect(adapter.format(may18, 'MMMM')).toBe('May');
	});
});
