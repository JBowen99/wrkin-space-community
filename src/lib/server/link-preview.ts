import type { LinkPreviewData } from '../shared/link-preview';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512_000;

const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function isPrivateIpv4(host: string): boolean {
	const parts = host.split('.').map(Number);
	if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
	const [a, b] = parts;
	if (a === 10) return true;
	if (a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

export function parsePreviewUrl(raw: string): URL | null {
	try {
		const url = new URL(raw);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		const host = url.hostname.toLowerCase();
		if (BLOCKED_HOSTNAMES.has(host)) return null;
		if (host.endsWith('.local') || host.endsWith('.internal')) return null;
		if (isPrivateIpv4(host)) return null;
		return url;
	} catch {
		return null;
	}
}

function decodeMetaContent(value: string): string {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.trim();
}

function readMetaTag(html: string, key: string, attr: 'property' | 'name'): string | null {
	const pattern = new RegExp(
		`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
		'i'
	);
	const reverse = new RegExp(
		`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["'][^>]*>`,
		'i'
	);
	const match = html.match(pattern) ?? html.match(reverse);
	return match?.[1] ? decodeMetaContent(match[1]) : null;
}

function readTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	return match?.[1] ? decodeMetaContent(match[1]) : null;
}

function resolveImageUrl(image: string | null, base: URL): string | null {
	if (!image) return null;
	try {
		return new URL(image, base).href;
	} catch {
		return null;
	}
}

function extractPreviewData(html: string, url: URL): LinkPreviewData {
	const title =
		readMetaTag(html, 'og:title', 'property') ??
		readMetaTag(html, 'twitter:title', 'name') ??
		readTitle(html);
	const description =
		readMetaTag(html, 'og:description', 'property') ??
		readMetaTag(html, 'description', 'name') ??
		readMetaTag(html, 'twitter:description', 'name');
	const image = resolveImageUrl(
		readMetaTag(html, 'og:image', 'property') ?? readMetaTag(html, 'twitter:image', 'name'),
		url
	);
	const siteName =
		readMetaTag(html, 'og:site_name', 'property') ?? url.hostname.replace(/^www\./, '');

	return {
		url: url.href,
		title,
		description,
		image,
		siteName
	};
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewData | null> {
	const url = parsePreviewUrl(rawUrl);
	if (!url) return null;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(url.href, {
			signal: controller.signal,
			headers: {
				Accept: 'text/html,application/xhtml+xml',
				'User-Agent': 'wrkin-space-link-preview/1.0'
			},
			redirect: 'follow'
		});

		if (!res.ok) return null;

		const contentType = res.headers.get('content-type') ?? '';
		if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
			return {
				url: url.href,
				title: url.hostname,
				description: null,
				image: null,
				siteName: url.hostname.replace(/^www\./, '')
			};
		}

		const reader = res.body?.getReader();
		if (!reader) return null;

		let html = '';
		let bytes = 0;
		const decoder = new TextDecoder();

		while (bytes < MAX_HTML_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			html += decoder.decode(value, { stream: true });
			if (/<\/head>/i.test(html)) break;
		}

		reader.cancel().catch(() => undefined);
		return extractPreviewData(html, url);
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
