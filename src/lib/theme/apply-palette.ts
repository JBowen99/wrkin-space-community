import {
	clearStoredPaletteId,
	defaultPaletteId,
	getPalette,
	loadStoredPaletteId,
	storePaletteId,
	type PaletteId,
	type PaletteTokens
} from './palettes';
import { themeRoot } from './dom';

const TOKEN_MAP: Record<keyof PaletteTokens, string> = {
	ink: '--color-ink',
	inkMuted: '--color-ink-muted',
	surface: '--color-surface',
	surfaceRaised: '--color-surface-raised',
	border: '--color-border',
	accent: '--color-accent',
	accentHover: '--color-accent-hover',
	accentMuted: '--color-accent-muted'
};

export function applyPaletteTokens(tokens: PaletteTokens, root?: HTMLElement) {
	const el = root ?? themeRoot();
	if (!el) return;

	for (const [key, cssVar] of Object.entries(TOKEN_MAP) as [keyof PaletteTokens, string][]) {
		el.style.setProperty(cssVar, tokens[key]);
	}
}

export function applyPalette(id: PaletteId, persist = true) {
	const el = themeRoot();
	if (!el) return;

	const palette = getPalette(id);
	el.dataset.palette = id;
	applyPaletteTokens(palette.tokens, el);
	if (persist) storePaletteId(id);
}

export function resetPalette() {
	const el = themeRoot();
	if (!el) return;

	const palette = getPalette(defaultPaletteId);
	delete el.dataset.palette;
	applyPaletteTokens(palette.tokens, el);
	clearStoredPaletteId();
}

export function initLandingPalette(): PaletteId {
	const id = loadStoredPaletteId() ?? defaultPaletteId;
	applyPalette(id, false);
	return id;
}
