<script lang="ts">
	import { page } from '$app/state';
	import {
		DEFAULT_DESCRIPTION,
		DEFAULT_OG_IMAGE_PATH,
		DEFAULT_TITLE,
		SITE_NAME,
		THEME_COLOR,
		absoluteUrl,
		canonicalUrl,
		pageTitle,
		serializeJsonLd,
		toJsonLdHeadHtml
	} from '$lib/seo/site';

	type OgType = 'website' | 'article';

	type Props = {
		title?: string;
		description?: string;
		canonicalPath?: string;
		ogType?: OgType;
		ogImagePath?: string;
		noindex?: boolean;
		nofollow?: boolean;
		/** ISO 8601 date for article pages */
		modifiedTime?: string;
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
	};

	let {
		title = DEFAULT_TITLE,
		description = DEFAULT_DESCRIPTION,
		canonicalPath,
		ogType = 'website',
		ogImagePath = DEFAULT_OG_IMAGE_PATH,
		noindex = false,
		nofollow = false,
		modifiedTime,
		jsonLd
	}: Props = $props();

	const siteOrigin = $derived(page.data.siteOrigin as string);
	const resolvedTitle = $derived(
		title.includes(SITE_NAME) ? title : pageTitle(title.replace(/\s*·\s*wrkin\.space$/, ''))
	);
	const canonical = $derived(canonicalUrl(siteOrigin, canonicalPath ?? page.url.pathname));
	const ogImage = $derived(absoluteUrl(siteOrigin, ogImagePath));
	const robotsContent = $derived(
		noindex ? (nofollow ? 'noindex, nofollow' : 'noindex, follow') : undefined
	);
	const jsonLdScripts = $derived(
		jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((item) => serializeJsonLd(item)) : []
	);
</script>

<svelte:head>
	<title>{resolvedTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	{#if robotsContent}
		<meta name="robots" content={robotsContent} />
	{/if}
	<meta name="theme-color" content={THEME_COLOR} />

	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={resolvedTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={resolvedTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />

	{#if ogType === 'article' && modifiedTime}
		<meta property="article:modified_time" content={modifiedTime} />
	{/if}

	{#each jsonLdScripts as script, index (index)}
		{@html toJsonLdHeadHtml(script)}
	{/each}
</svelte:head>
