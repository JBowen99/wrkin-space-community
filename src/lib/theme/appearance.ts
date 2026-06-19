export type AppearancePreference = 'light' | 'dark' | 'system';
export type ResolvedAppearance = 'light' | 'dark';

const STORAGE_KEY = 'wrkin-appearance';
const COOKIE_KEY = 'wrkin-appearance';

export function isAppearancePreference(
	value: string | null | undefined
): value is AppearancePreference {
	return value === 'light' || value === 'dark' || value === 'system';
}

export function loadStoredAppearance(): AppearancePreference {
	if (typeof localStorage === 'undefined') return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	return isAppearancePreference(stored) ? stored : 'system';
}

export function storeAppearance(preference: AppearancePreference): void {
	localStorage.setItem(STORAGE_KEY, preference);
	if (typeof document !== 'undefined') {
		document.cookie = `${COOKIE_KEY}=${preference};path=/;max-age=31536000;SameSite=Lax`;
	}
}

export function resolveAppearance(preference: AppearancePreference): ResolvedAppearance {
	if (preference === 'light') return 'light';
	if (preference === 'dark') return 'dark';
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Inline script string for app.html — prevents flash of wrong theme. */
export const appearanceBootScript = `(function(){try{var k='wrkin-appearance';var s=localStorage.getItem(k);var p=s==='light'||s==='dark'||s==='system'?s:'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.appearance=d?'dark':'light';}catch(e){document.documentElement.dataset.appearance='light';}})();`;
