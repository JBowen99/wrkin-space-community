export const SITE_NAME = 'wrkin.space';

export const DEFAULT_TITLE = `${SITE_NAME} — Calm project management for modular teams`;

export const DEFAULT_DESCRIPTION =
	'Modular project management for teams: tasks, docs, chat, and more per wrkspace. Async-first, self-hostable, and calm by design.';

export const DEFAULT_OG_IMAGE_PATH = '/landing/og.png';

export const THEME_COLOR = '#1c1917';

export const CONTACT_EMAIL = 'hello@wrkin.space';

export const ORGANIZATION_NAME = 'wrkin.space';

/** SameAs profile URLs — add when available. */
export const ORGANIZATION_SAME_AS: string[] = [];

/** Canonical public URL for meta tags when build/runtime origin is internal. */
export const PRODUCTION_SITE_ORIGIN = 'https://wrkin.space';

export function normalizeOrigin(origin: string): string {
	return origin.replace(/\/$/, '');
}

function isInternalOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		return (
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '::1' ||
			hostname === '0.0.0.0' ||
			hostname === 'sveltekit-prerender'
		);
	} catch {
		return true;
	}
}

/**
 * Prefer ORIGIN env; fall back to the request origin in dev.
 * In production, never emit localhost/internal URLs for canonicals or OG tags
 * (common when HTML is prerendered behind a reverse proxy).
 */
export function resolveSiteOrigin(envOrigin: string | undefined, requestOrigin: string): string {
	if (envOrigin?.trim()) {
		return normalizeOrigin(envOrigin);
	}
	if (isInternalOrigin(requestOrigin)) {
		return PRODUCTION_SITE_ORIGIN;
	}
	return normalizeOrigin(requestOrigin);
}

export function absoluteUrl(origin: string, path: string): string {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	return `${normalizeOrigin(origin)}${normalized}`;
}

export function pageTitle(title: string, suffix = SITE_NAME): string {
	if (title === suffix || title.endsWith(` · ${suffix}`)) return title;
	return `${title} · ${suffix}`;
}

export function canonicalUrl(origin: string, pathname: string): string {
	return absoluteUrl(origin, pathname);
}

/** Serialized JSON-LD object safe for embedding in HTML. */
export function serializeJsonLd(data: Record<string, unknown>): string {
	return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Head markup for one JSON-LD block (kept in .ts so Svelte/ESLint do not parse `<script>`). */
export function toJsonLdHeadHtml(serializedJson: string): string {
	return `<script type="application/ld+json">${serializedJson}</script>`;
}
