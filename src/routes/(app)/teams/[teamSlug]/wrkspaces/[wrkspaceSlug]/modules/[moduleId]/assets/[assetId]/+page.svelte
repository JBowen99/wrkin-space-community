<script lang="ts">
	import type { PageData } from './$types';
	import ModuleHeader from '$lib/components/modules/module-header.svelte';
	import DocsAssetPreview from '$lib/components/modules/docs/docs-asset-preview.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div>
	<ModuleHeader
		backHref={data.modulePath}
		backLabel={data.module.title}
		typeLabel="Docs"
		title={data.asset.title}
		moduleId={data.module.id}
	/>

	<DocsAssetPreview asset={data.asset} downloadUrl={data.downloadUrl} />
</div>
