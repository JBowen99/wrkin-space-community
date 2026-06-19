export type ActivitySparkPoint = {
	day: string;
	count: number;
};

export function groupActivityTimestampsByDay(
	events: { createdAt: Date }[],
	maxDays = 14
): ActivitySparkPoint[] {
	const counts = new Map<string, number>();

	for (const event of events) {
		const key = event.createdAt.toISOString().slice(0, 10);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const keys = [...counts.keys()].sort();
	const recent = keys.slice(-maxDays);

	return recent.map((key) => ({
		day: key.slice(5),
		count: counts.get(key) ?? 0
	}));
}
