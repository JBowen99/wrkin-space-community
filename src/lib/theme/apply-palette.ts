import {
	clearStoredPaletteId,
	defaultPaletteId,
	getPalette,
	loadStoredPaletteId,
	storePaletteId,
	type PaletteId,
	type PaletteTokens
} from './palettes';
import { deriveDarkTokens } from './derive-dark-tokens';
import { themeRoot } from './dom';

const TOKEN_MAP: Record<keyof PaletteTokens, string> = {
	ink: '--color-ink',
	inkMuted: '--color-ink-muted',
	surface: '--color-surface',
	surfaceRaised: '--color-surface-raised',
	border: '--color-border',
	accent: '--color-accent',
	accentHover: '--color-accent-hover',
	accentMuted: '--color-accent-muted',
	surfaceHover: '--color-surface-hover',
	surfaceMuted: '--color-surface-muted',
	surfaceInset: '--color-surface-inset',
	danger: '--color-danger',
	dangerMuted: '--color-danger-muted',
	warning: '--color-warning',
	warningMuted: '--color-warning-muted',
	success: '--color-success',
	successMuted: '--color-success-muted',
	chart1: '--color-chart-1',
	chart2: '--color-chart-2',
	chart3: '--color-chart-3',
	chart4: '--color-chart-4',
	chart5: '--color-chart-5',
	chart6: '--color-chart-6'
};

export function applyPaletteTokens(tokens: PaletteTokens, root?: HTMLElement) {
	const el = root ?? themeRoot();
	if (!el) return;

	for (const [key, cssVar] of Object.entries(TOKEN_MAP) as [keyof PaletteTokens, string][]) {
		el.style.setProperty(cssVar, tokens[key]);
	}
}

function tokensForCurrentAppearance(paletteId: PaletteId, root: HTMLElement): PaletteTokens {
	const palette = getPalette(paletteId);
	if (root.dataset.appearance === 'dark') {
		return deriveDarkTokens(palette.tokens);
	}
	return palette.tokens;
}

export function applyPalette(id: PaletteId, persist = true) {
	const el = themeRoot();
	if (!el) return;

	el.dataset.palette = id;
	applyPaletteTokens(tokensForCurrentAppearance(id, el), el);
	if (persist) storePaletteId(id);
}

export function resetPalette() {
	const el = themeRoot();
	if (!el) return;

	delete el.dataset.palette;
	applyPaletteTokens(tokensForCurrentAppearance(defaultPaletteId, el), el);
	clearStoredPaletteId();
}

export function initLandingPalette(): PaletteId {
	const id = loadStoredPaletteId() ?? defaultPaletteId;
	applyPalette(id, false);
	return id;
}
