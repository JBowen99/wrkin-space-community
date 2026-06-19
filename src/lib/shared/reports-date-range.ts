export const REPORT_DATE_PRESETS = ['last_7_days', 'last_30_days', 'this_week'] as const;

export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number];

export function isReportDatePreset(value: string): value is ReportDatePreset {
	return (REPORT_DATE_PRESETS as readonly string[]).includes(value);
}

export type ReportDateRange = {
	preset: ReportDatePreset;
};

export function defaultReportDateRange(preset: ReportDatePreset = 'last_30_days'): ReportDateRange {
	return { preset };
}

export function parseReportDateRange(raw: unknown): ReportDateRange {
	if (!raw || typeof raw !== 'object') return defaultReportDateRange();
	const obj = raw as Record<string, unknown>;
	const presetRaw = obj.preset;
	if (typeof presetRaw === 'string' && isReportDatePreset(presetRaw)) {
		return { preset: presetRaw };
	}
	return defaultReportDateRange();
}

export function serializeReportDateRange(range: ReportDateRange): ReportDateRange {
	return { preset: range.preset };
}

/** Start of local calendar week (Monday). */
function startOfWeek(d: Date): Date {
	const copy = new Date(d);
	const day = copy.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	copy.setDate(copy.getDate() + diff);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

export function resolveReportDateRange(
	range: ReportDateRange,
	now: Date = new Date()
): { from: Date; to: Date } {
	const to = new Date(now);
	to.setHours(23, 59, 59, 999);

	if (range.preset === 'this_week') {
		const from = startOfWeek(now);
		return { from, to };
	}

	const from = new Date(now);
	from.setHours(0, 0, 0, 0);

	if (range.preset === 'last_7_days') {
		from.setDate(from.getDate() - 6);
		return { from, to };
	}

	// last_30_days
	from.setDate(from.getDate() - 29);
	return { from, to };
}

export const REPORT_DATE_PRESET_LABELS: Record<ReportDatePreset, string> = {
	last_7_days: 'Last 7 days',
	last_30_days: 'Last 30 days',
	this_week: 'This week'
};

export function parseDatePresetFromForm(formData: FormData): ReportDatePreset {
	const raw = formData.get('datePreset')?.toString() ?? '';
	return isReportDatePreset(raw) ? raw : 'last_30_days';
}
