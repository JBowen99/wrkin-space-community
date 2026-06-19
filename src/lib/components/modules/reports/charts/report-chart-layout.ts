export type ChartHeightOptions = {
	rowHeightRem?: number;
	baseRem?: number;
	minRem?: number;
	maxRem?: number;
	extraRem?: number;
};

export function chartHeightForRows(rowCount: number, options: ChartHeightOptions = {}): string {
	const {
		rowHeightRem = 2.25,
		baseRem = 3,
		minRem = 12,
		maxRem = 32,
		extraRem = 0
	} = options;
	const height = Math.min(maxRem, Math.max(minRem, baseRem + rowCount * rowHeightRem + extraRem));

	return `height: ${height.toFixed(2)}rem;`;
}
