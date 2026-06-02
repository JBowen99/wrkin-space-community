export type PaletteId =
	| 'forest'
	| 'dusk'
	| 'clay'
	| 'harbor'
	| 'orbit'
	| 'nebula'
	| 'stellar'
	| 'void'
	| 'cosmos'
	| 'zenith';

export type PaletteTokens = {
	ink: string;
	inkMuted: string;
	surface: string;
	surfaceRaised: string;
	border: string;
	accent: string;
	accentHover: string;
	accentMuted: string;
};

export type Palette = {
	id: PaletteId;
	name: string;
	description: string;
	swatches: [string, string, string];
	tokens: PaletteTokens;
};

/** Default palette — also defined in layout.css @theme */
export const palettes: Palette[] = [
	{
		id: 'forest',
		name: 'Forest',
		description: 'Warm stone neutrals with sage green — calm and natural.',
		swatches: ['#fafaf9', '#3d6b4f', '#1c1917'],
		tokens: {
			ink: '#1c1917',
			inkMuted: '#57534e',
			surface: '#fafaf9',
			surfaceRaised: '#ffffff',
			border: '#e7e5e4',
			accent: '#3d6b4f',
			accentHover: '#2f5540',
			accentMuted: '#e8f0eb'
		}
	},
	{
		id: 'dusk',
		name: 'Dusk',
		description: 'Cool slate surfaces with soft indigo — quiet and focused.',
		swatches: ['#f8fafc', '#5b6eae', '#1e293b'],
		tokens: {
			ink: '#1e293b',
			inkMuted: '#64748b',
			surface: '#f8fafc',
			surfaceRaised: '#ffffff',
			border: '#e2e8f0',
			accent: '#5b6eae',
			accentHover: '#4a5a9a',
			accentMuted: '#eef2ff'
		}
	},
	{
		id: 'clay',
		name: 'Clay',
		description: 'Creamy warmth with terracotta accent — approachable and human.',
		swatches: ['#faf8f5', '#b45309', '#292524'],
		tokens: {
			ink: '#292524',
			inkMuted: '#78716c',
			surface: '#faf8f5',
			surfaceRaised: '#ffffff',
			border: '#ebe6df',
			accent: '#b45309',
			accentHover: '#92400e',
			accentMuted: '#ffedd5'
		}
	},
	{
		id: 'harbor',
		name: 'Harbor',
		description: 'Mist-gray base with teal accent — fresh and uncluttered.',
		swatches: ['#f4f9f9', '#0d9488', '#1e3a3a'],
		tokens: {
			ink: '#1e3a3a',
			inkMuted: '#5f6b6b',
			surface: '#f4f9f9',
			surfaceRaised: '#ffffff',
			border: '#d1e0e0',
			accent: '#0d9488',
			accentHover: '#0f766e',
			accentMuted: '#ccfbf1'
		}
	},
	{
		id: 'orbit',
		name: 'Orbit',
		description: 'Cool slate workspace with orbital blue — wrkin.space at altitude.',
		swatches: ['#f8fafc', '#2563eb', '#0f172a'],
		tokens: {
			ink: '#0f172a',
			inkMuted: '#64748b',
			surface: '#f8fafc',
			surfaceRaised: '#ffffff',
			border: '#e2e8f0',
			accent: '#2563eb',
			accentHover: '#1d4ed8',
			accentMuted: '#dbeafe'
		}
	},
	{
		id: 'nebula',
		name: 'Nebula',
		description: 'Lavender mist with violet glow — cosmic dust and quiet focus.',
		swatches: ['#f5f3ff', '#7c3aed', '#1e1b4b'],
		tokens: {
			ink: '#1e1b4b',
			inkMuted: '#6b7280',
			surface: '#f5f3ff',
			surfaceRaised: '#ffffff',
			border: '#ddd6fe',
			accent: '#7c3aed',
			accentHover: '#6d28d9',
			accentMuted: '#ede9fe'
		}
	},
	{
		id: 'stellar',
		name: 'Stellar',
		description: 'Neutral void with amber starlight — warmth against deep space.',
		swatches: ['#fafafa', '#d97706', '#18181b'],
		tokens: {
			ink: '#18181b',
			inkMuted: '#71717a',
			surface: '#fafafa',
			surfaceRaised: '#ffffff',
			border: '#e4e4e7',
			accent: '#d97706',
			accentHover: '#b45309',
			accentMuted: '#fef3c7'
		}
	},
	{
		id: 'void',
		name: 'Void',
		description: 'Pale sky surfaces with cyan signal — deep field, clear comms.',
		swatches: ['#f0f9ff', '#0891b2', '#0c4a6e'],
		tokens: {
			ink: '#0c4a6e',
			inkMuted: '#64748b',
			surface: '#f0f9ff',
			surfaceRaised: '#ffffff',
			border: '#bae6fd',
			accent: '#0891b2',
			accentHover: '#0e7490',
			accentMuted: '#cffafe'
		}
	},
	{
		id: 'cosmos',
		name: 'Cosmos',
		description: 'Midnight ink on soft periwinkle — the .space in wrkin.space.',
		swatches: ['#eef2ff', '#4f46e5', '#312e81'],
		tokens: {
			ink: '#312e81',
			inkMuted: '#64748b',
			surface: '#eef2ff',
			surfaceRaised: '#ffffff',
			border: '#c7d2fe',
			accent: '#4f46e5',
			accentHover: '#4338ca',
			accentMuted: '#e0e7ff'
		}
	},
	{
		id: 'zenith',
		name: 'Zenith',
		description: 'Horizon gray with rose flare — sunrise over the workspace.',
		swatches: ['#fafafa', '#e11d48', '#1f2937'],
		tokens: {
			ink: '#1f2937',
			inkMuted: '#6b7280',
			surface: '#fafafa',
			surfaceRaised: '#ffffff',
			border: '#e5e7eb',
			accent: '#e11d48',
			accentHover: '#be123c',
			accentMuted: '#ffe4e6'
		}
	}
];

export const defaultPaletteId: PaletteId = 'zenith';

export function getPalette(id: PaletteId): Palette {
	return palettes.find((p) => p.id === id) ?? palettes[0];
}

const STORAGE_KEY = 'wrkin-palette-preview';

export function loadStoredPaletteId(): PaletteId | null {
	if (typeof localStorage === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	return palettes.some((p) => p.id === stored) ? (stored as PaletteId) : null;
}

export function storePaletteId(id: PaletteId): void {
	localStorage.setItem(STORAGE_KEY, id);
}

export function clearStoredPaletteId(): void {
	localStorage.removeItem(STORAGE_KEY);
}
