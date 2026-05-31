<script lang="ts">
	import type { DocPageRow } from '$lib/server/docs';
	import DocCard from './doc-card.svelte';
	import DocAddCard from './doc-add-card.svelte';

	type Props = {
		documents: DocPageRow[];
		docHref: (docId: string) => string;
	};

	let { documents, docHref }: Props = $props();
</script>

<form method="POST" action="?/createDoc" class="mt-6">
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
		{#each documents as doc (doc.id)}
			<DocCard {doc} href={docHref(doc.id)} />
		{/each}
		<DocAddCard />
	</div>
</form>
