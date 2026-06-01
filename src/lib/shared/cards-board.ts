import type { BoardCardRow, CardColumnRow } from '$lib/server/modules';

export function cloneBoard(columns: CardColumnRow[]): CardColumnRow[] {
	return columns.map((col) => ({
		...col,
		cards: col.cards.map((card) => ({ ...card }))
	}));
}

export function reorderColumns(
	columns: CardColumnRow[],
	columnId: string,
	targetPosition: number
): CardColumnRow[] {
	const fromIndex = columns.findIndex((c) => c.id === columnId);
	if (fromIndex === -1) return columns;

	const next = cloneBoard(columns);
	const [moved] = next.splice(fromIndex, 1);
	const pos = Math.max(0, Math.min(Math.floor(targetPosition), next.length));
	next.splice(pos, 0, moved);

	return next.map((col, index) => ({ ...col, position: index }));
}

export function moveCardInBoard(
	columns: CardColumnRow[],
	cardId: string,
	targetColumnId: string,
	targetPosition: number
): CardColumnRow[] {
	const next = cloneBoard(columns);
	let card: BoardCardRow | undefined;

	for (const col of next) {
		const index = col.cards.findIndex((c) => c.id === cardId);
		if (index !== -1) {
			card = col.cards[index];
			col.cards = col.cards.filter((c) => c.id !== cardId);
			break;
		}
	}

	if (!card) return columns;

	const targetCol = next.find((c) => c.id === targetColumnId);
	if (!targetCol) return columns;

	const pos = Math.max(0, Math.min(Math.floor(targetPosition), targetCol.cards.length));
	targetCol.cards = [...targetCol.cards];
	targetCol.cards.splice(pos, 0, card);

	return next.map((col) => ({
		...col,
		cards: col.cards.map((c, index) => ({ ...c, position: index }))
	}));
}
