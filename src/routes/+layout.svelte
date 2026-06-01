<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import { googleFontsHref } from '$lib/theme/font-sets';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href={googleFontsHref} rel="stylesheet" />
</svelte:head>

{@render children()}
