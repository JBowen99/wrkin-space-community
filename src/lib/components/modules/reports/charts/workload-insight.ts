import type { WorkloadAssigneeRow } from '$lib/server/reports';

const CHART_CAP = 12;

export type WorkloadChartRow = WorkloadAssigneeRow & {
	nonOverdue: number;
};

export function buildWorkloadChartRows(byAssignee: WorkloadAssigneeRow[]): {
	rows: WorkloadChartRow[];
	othersCount: number;
} {
	const sorted = [...byAssignee].sort((a, b) => b.open - a.open);
	const top = sorted.slice(0, CHART_CAP).map((row) => ({
		...row,
		nonOverdue: Math.max(0, row.open - row.overdue)
	}));
	return {
		rows: top,
		othersCount: Math.max(0, sorted.length - CHART_CAP)
	};
}

export function workloadInsightLine(byAssignee: WorkloadAssigneeRow[]): string | null {
	if (byAssignee.length === 0) return null;

	const openCounts = byAssignee.map((r) => r.open).sort((a, b) => a - b);
	const median =
		openCounts.length % 2 === 1
			? openCounts[(openCounts.length - 1) / 2]!
			: (openCounts[openCounts.length / 2 - 1]! + openCounts[openCounts.length / 2]!) / 2;

	if (median <= 0) return null;

	const leader = [...byAssignee].sort((a, b) => b.open - a.open)[0];
	if (!leader || leader.open <= median) return null;

	const ratio = leader.open / median;
	const formatted = ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1);
	return `${leader.name} has ${formatted}× the team median open tasks.`;
}
