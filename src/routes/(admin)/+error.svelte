<script lang="ts">
	import ErrorPage from '$lib/components/error-page.svelte';
	import SeoHead from '$lib/components/seo/seo-head.svelte';
	import { page } from '$app/state';
</script>

<SeoHead title={page.status === 404 ? 'Not found' : 'Error'} noindex nofollow />

<ErrorPage status={page.status} error={page.error} homeHref="/admin" />
