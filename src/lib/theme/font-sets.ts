export type FontSetId =
	| 'dm-sans'
	| 'inter'
	| 'jakarta'
	| 'plex-sans'
	| 'outfit'
	| 'manrope'
	| 'figtree'
	| 'work-sans'
	| 'lexend'
	| 'sora'
	| 'dm-outfit'
	| 'inter-jakarta'
	| 'lexend-inter'
	| 'sora-inter'
	| 'dm-fraunces'
	| 'inter-source'
	| 'jakarta-lora';

export type FontSetTokens = {
	sans: string;
	display: string;
};

export type FontSet = {
	id: FontSetId;
	body: string;
	heading: string;
	headingSerif: boolean;
	tokens: FontSetTokens;
};

const sans = (name: string) => `'${name}', ui-sans-serif, system-ui, sans-serif`;
const serif = (name: string) => `'${name}', ui-serif, Georgia, serif`;

/** Default fonts — also defined in layout.css @theme */
export const fontSets: FontSet[] = [
	// Sans + sans (same family)
	{
		id: 'dm-sans',
		body: 'DM Sans',
		heading: 'DM Sans',
		headingSerif: false,
		tokens: { sans: sans('DM Sans'), display: sans('DM Sans') }
	},
	{
		id: 'inter',
		body: 'Inter',
		heading: 'Inter',
		headingSerif: false,
		tokens: { sans: sans('Inter'), display: sans('Inter') }
	},
	{
		id: 'jakarta',
		body: 'Plus Jakarta Sans',
		heading: 'Plus Jakarta Sans',
		headingSerif: false,
		tokens: { sans: sans('Plus Jakarta Sans'), display: sans('Plus Jakarta Sans') }
	},
	{
		id: 'plex-sans',
		body: 'IBM Plex Sans',
		heading: 'IBM Plex Sans',
		headingSerif: false,
		tokens: { sans: sans('IBM Plex Sans'), display: sans('IBM Plex Sans') }
	},
	{
		id: 'outfit',
		body: 'Outfit',
		heading: 'Outfit',
		headingSerif: false,
		tokens: { sans: sans('Outfit'), display: sans('Outfit') }
	},
	{
		id: 'manrope',
		body: 'Manrope',
		heading: 'Manrope',
		headingSerif: false,
		tokens: { sans: sans('Manrope'), display: sans('Manrope') }
	},
	{
		id: 'figtree',
		body: 'Figtree',
		heading: 'Figtree',
		headingSerif: false,
		tokens: { sans: sans('Figtree'), display: sans('Figtree') }
	},
	{
		id: 'work-sans',
		body: 'Work Sans',
		heading: 'Work Sans',
		headingSerif: false,
		tokens: { sans: sans('Work Sans'), display: sans('Work Sans') }
	},
	{
		id: 'lexend',
		body: 'Lexend',
		heading: 'Lexend',
		headingSerif: false,
		tokens: { sans: sans('Lexend'), display: sans('Lexend') }
	},
	{
		id: 'sora',
		body: 'Sora',
		heading: 'Sora',
		headingSerif: false,
		tokens: { sans: sans('Sora'), display: sans('Sora') }
	},
	// Sans + sans (paired families)
	{
		id: 'dm-outfit',
		body: 'DM Sans',
		heading: 'Outfit',
		headingSerif: false,
		tokens: { sans: sans('DM Sans'), display: sans('Outfit') }
	},
	{
		id: 'inter-jakarta',
		body: 'Inter',
		heading: 'Plus Jakarta Sans',
		headingSerif: false,
		tokens: { sans: sans('Inter'), display: sans('Plus Jakarta Sans') }
	},
	{
		id: 'lexend-inter',
		body: 'Lexend',
		heading: 'Inter',
		headingSerif: false,
		tokens: { sans: sans('Lexend'), display: sans('Inter') }
	},
	{
		id: 'sora-inter',
		body: 'Inter',
		heading: 'Sora',
		headingSerif: false,
		tokens: { sans: sans('Inter'), display: sans('Sora') }
	},
	// Sans body + serif headings
	{
		id: 'dm-fraunces',
		body: 'DM Sans',
		heading: 'Fraunces',
		headingSerif: true,
		tokens: { sans: sans('DM Sans'), display: serif('Fraunces') }
	},
	{
		id: 'inter-source',
		body: 'Inter',
		heading: 'Source Serif 4',
		headingSerif: true,
		tokens: { sans: sans('Inter'), display: serif('Source Serif 4') }
	},
	{
		id: 'jakarta-lora',
		body: 'Plus Jakarta Sans',
		heading: 'Lora',
		headingSerif: true,
		tokens: { sans: sans('Plus Jakarta Sans'), display: serif('Lora') }
	}
];

export const defaultFontSetId: FontSetId = 'sora-inter';

export const googleFontsHref =
	'https://fonts.googleapis.com/css2?' +
	'family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&' +
	'family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&' +
	'family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700&' +
	'family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600&' +
	'family=Outfit:ital,wght@0,400;0,500;0,600;0,700&' +
	'family=Manrope:ital,wght@0,400;0,500;0,600;0,700&' +
	'family=Figtree:ital,wght@0,400;0,500;0,600;0,700&' +
	'family=Work+Sans:ital,wght@0,400;0,500;0,600;0,700&' +
	'family=Lexend:wght@400;500;600;700&' +
	'family=Sora:ital,wght@0,400;0,500;0,600;0,700&' +
	'family=Fraunces:opsz,wght@9..144,500;9..144,600&' +
	'family=Source+Serif+4:ital,opsz,wght@0,8..60,500;0,8..60,600&' +
	'family=Lora:ital,wght@0,500;0,600&' +
	'display=swap';

export function getFontSet(id: FontSetId): FontSet {
	return fontSets.find((f) => f.id === id) ?? fontSets[0];
}

export function fontSetLabel(fontSet: FontSet): string {
	return fontSet.body === fontSet.heading ? fontSet.body : `${fontSet.body} / ${fontSet.heading}`;
}

const STORAGE_KEY = 'wrkin-font-preview';

const LEGACY_FONT_IDS: Record<string, FontSetId> = {
	editorial: 'dm-fraunces',
	neutral: 'inter-source',
	warm: 'jakarta-lora',
	precise: 'plex-sans'
};

export function loadStoredFontSetId(): FontSetId | null {
	if (typeof localStorage === 'undefined') return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return null;
	if (fontSets.some((f) => f.id === stored)) return stored as FontSetId;
	return LEGACY_FONT_IDS[stored] ?? null;
}

export function storeFontSetId(id: FontSetId): void {
	localStorage.setItem(STORAGE_KEY, id);
}

export function clearStoredFontSetId(): void {
	localStorage.removeItem(STORAGE_KEY);
}
