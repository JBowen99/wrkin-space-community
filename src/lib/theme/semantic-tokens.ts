/** Shared semantic tokens that supplement palette-specific colors. */

export const lightSemanticExtensions = {
	surfaceHover: '#e7e5e4',
	surfaceMuted: '#f5f5f4',
	surfaceInset: '#d6d3d1',
	danger: '#be123c',
	dangerMuted: '#ffe4e6',
	warning: '#92400e',
	warningMuted: '#fef3c7',
	success: '#047857',
	successMuted: '#ecfdf5'
} as const;

export const darkSemanticExtensions = {
	surfaceHover: '#27272a',
	surfaceMuted: '#27272a',
	surfaceInset: '#3f3f46',
	danger: '#f87171',
	dangerMuted: 'rgb(127 29 29 / 0.35)',
	warning: '#fbbf24',
	warningMuted: 'rgb(120 53 15 / 0.35)',
	success: '#34d399',
	successMuted: 'rgb(6 78 59 / 0.35)'
} as const;

export type SemanticTokenKey = keyof typeof lightSemanticExtensions;
