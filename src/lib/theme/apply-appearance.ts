import { applyPaletteTokens } from './apply-palette';
import { deriveDarkTokens } from './derive-dark-tokens';
import {
	loadStoredAppearance,
	resolveAppearance,
	storeAppearance,
	type AppearancePreference,
	type ResolvedAppearance
} from './appearance';
import { themeRoot } from './dom';
import { defaultPaletteId, getPalette, type PaletteId } from './palettes';

let systemMedia: MediaQueryList | null = null;
let systemListener: ((event: MediaQueryListEvent) => void) | null = null;

function currentPaletteId(root: HTMLElement): PaletteId {
	const id = root.dataset.palette;
	return id && getPalette(id as PaletteId) ? (id as PaletteId) : defaultPaletteId;
}

function applyResolvedAppearance(resolved: ResolvedAppearance, root?: HTMLElement) {
	const el = root ?? themeRoot();
	if (!el) return;

	el.dataset.appearance = resolved;
	const palette = getPalette(currentPaletteId(el));
	const tokens = resolved === 'dark' ? deriveDarkTokens(palette.tokens) : palette.tokens;
	applyPaletteTokens(tokens, el);
}

export function applyAppearance(preference: AppearancePreference, persist = true) {
	const el = themeRoot();
	if (!el) return;

	if (persist) storeAppearance(preference);
	applyResolvedAppearance(resolveAppearance(preference), el);
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('wrkin-appearance-change', { detail: preference }));
	}
}

export function initAppearance(): AppearancePreference {
	const preference = loadStoredAppearance();
	applyAppearance(preference, false);
	return preference;
}

export function watchSystemAppearance(onChange?: (resolved: ResolvedAppearance) => void) {
	if (typeof window === 'undefined') return () => {};

	systemMedia = window.matchMedia('(prefers-color-scheme: dark)');
	systemListener = () => {
		if (loadStoredAppearance() !== 'system') return;
		const resolved = resolveAppearance('system');
		applyResolvedAppearance(resolved);
		onChange?.(resolved);
	};
	systemMedia.addEventListener('change', systemListener);

	return () => {
		if (systemMedia && systemListener) {
			systemMedia.removeEventListener('change', systemListener);
		}
		systemMedia = null;
		systemListener = null;
	};
}

export function refreshAppearanceTokens() {
	const el = themeRoot();
	if (!el) return;
	const resolved = (el.dataset.appearance as ResolvedAppearance | undefined) ?? 'light';
	applyResolvedAppearance(resolved, el);
}
