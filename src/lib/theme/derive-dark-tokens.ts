import { darkSemanticExtensions } from './semantic-tokens';
import type { PaletteTokens } from './palettes';

/** Derive dark appearance tokens from a light palette, preserving accent hues. */
export function deriveDarkTokens(light: PaletteTokens): PaletteTokens {
	return {
		ink: '#f4f4f5',
		inkMuted: '#a1a1aa',
		surface: '#18181b',
		surfaceRaised: '#27272a',
		border: '#3f3f46',
		accent: light.accent,
		accentHover: light.accentHover,
		accentMuted: `color-mix(in srgb, ${light.accent} 18%, #27272a)`,
		...darkSemanticExtensions,
		chart1: light.accent,
		chart2: darkSemanticExtensions.success,
		chart3: '#60a5fa',
		chart4: '#a78bfa',
		chart5: darkSemanticExtensions.warning,
		chart6: '#a1a1aa'
	};
}
