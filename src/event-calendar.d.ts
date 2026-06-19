declare module '@event-calendar/core' {
	import type { Component } from 'svelte';

	type CalendarProps = {
		plugins?: unknown[];
		options?: Record<string, unknown>;
	};

	export const Calendar: Component<CalendarProps>;
	export const DayGrid: unknown;
	export const Interaction: unknown;
	export const List: unknown;
	export const TimeGrid: unknown;
}
