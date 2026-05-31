import {
	clearStoredFontSetId,
	defaultFontSetId,
	getFontSet,
	loadStoredFontSetId,
	storeFontSetId,
	type FontSetId,
	type FontSetTokens
} from './font-sets';
import { themeRoot } from './dom';

const TOKEN_MAP: Record<keyof FontSetTokens, string> = {
	sans: '--font-sans',
	display: '--font-display'
};

export function applyFontSetTokens(tokens: FontSetTokens, root?: HTMLElement) {
	const el = root ?? themeRoot();
	if (!el) return;

	for (const [key, cssVar] of Object.entries(TOKEN_MAP) as [keyof FontSetTokens, string][]) {
		el.style.setProperty(cssVar, tokens[key]);
	}
}

export function applyFontSet(id: FontSetId, persist = true) {
	const el = themeRoot();
	if (!el) return;

	const fontSet = getFontSet(id);
	el.dataset.fontSet = id;
	applyFontSetTokens(fontSet.tokens, el);
	if (persist) storeFontSetId(id);
}

export function resetFontSet() {
	const el = themeRoot();
	if (!el) return;

	const fontSet = getFontSet(defaultFontSetId);
	delete el.dataset.fontSet;
	applyFontSetTokens(fontSet.tokens, el);
	clearStoredFontSetId();
}

export function initLandingFontSet(): FontSetId {
	const id = loadStoredFontSetId() ?? defaultFontSetId;
	applyFontSet(id, false);
	return id;
}
