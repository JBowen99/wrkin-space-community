<script lang="ts">
	import type { PageData } from './$types';
	import ModuleHeader from '$lib/components/modules/module-header.svelte';
	import ForumThreadView from '$lib/components/modules/forum/forum-thread-view.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div>
	<ModuleHeader
		backHref={data.moduleIndexUrl}
		backLabel={data.module.title}
		typeLabel={data.typeLabel}
		title={data.thread.title}
		moduleId={data.module.id}
	/>

	<ForumThreadView thread={data.thread} postTree={data.postTree} canClose={data.canClose} />
</div>
