import { applyPalette, initLandingPalette, resetPalette } from './apply-palette';
import { applyFontSet, initLandingFontSet, resetFontSet } from './apply-font-set';
import type { FontSetId } from './font-sets';
import type { PaletteId } from './palettes';

export type LandingThemeState = {
	paletteId: PaletteId;
	fontSetId: FontSetId;
};

export function initLandingTheme(): LandingThemeState {
	return {
		paletteId: initLandingPalette(),
		fontSetId: initLandingFontSet()
	};
}

export function resetLandingTheme(): void {
	resetPalette();
	resetFontSet();
}

export { applyPalette, applyFontSet };
