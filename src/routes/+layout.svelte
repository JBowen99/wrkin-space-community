<script lang="ts">
	import { onMount } from 'svelte';
	import { BitsConfig } from 'bits-ui';
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import { initAppearance, watchSystemAppearance } from '$lib/theme/apply-appearance';
	import { googleFontsHref } from '$lib/theme/font-sets';
	import type { LayoutData } from './$types';

	let { data: _data, children }: { data: LayoutData; children: import('svelte').Snippet } =
		$props();

	onMount(() => {
		initAppearance();
		return watchSystemAppearance();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href={googleFontsHref} rel="stylesheet" />
</svelte:head>

<BitsConfig defaultPortalTo="body">
	{@render children()}
</BitsConfig>
