export type BrandSegment = { kind: 'text'; value: string } | { kind: 'brand'; suffix: string };

/** Matches brand terms longest-first so wrkin.space beats wrkin, wrkspaces beats wrkspace. */
const BRAND_RE = /wrkin\.space|wrkspaces|wrkspace|wrkin/gi;

export function splitBrandText(text: string): BrandSegment[] {
	const segments: BrandSegment[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(BRAND_RE)) {
		const matchIndex = match.index ?? 0;
		if (matchIndex > lastIndex) {
			segments.push({ kind: 'text', value: text.slice(lastIndex, matchIndex) });
		}

		const matched = match[0].toLowerCase();
		const suffix = matched.startsWith('wrkin.') ? 'in.space' : matched.slice(3);
		segments.push({ kind: 'brand', suffix });
		lastIndex = matchIndex + match[0].length;
	}

	if (lastIndex < text.length) {
		segments.push({ kind: 'text', value: text.slice(lastIndex) });
	}

	return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}
