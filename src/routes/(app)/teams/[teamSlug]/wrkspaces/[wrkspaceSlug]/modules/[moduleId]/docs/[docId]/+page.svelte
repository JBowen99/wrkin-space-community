<script lang="ts">
	import type { PageData } from './$types';
	import type { CollabUser } from '$lib/shared/collab-user';
	import ModuleHeader from '$lib/components/modules/module-header.svelte';
	import DocsEditor from '$lib/components/modules/docs/docs-editor.svelte';
	import DocEditorPresence from '$lib/components/modules/docs/doc-editor-presence.svelte';

	let { data }: { data: PageData } = $props();

	let connectedUsers = $state<CollabUser[]>([]);
</script>

<div>
	<ModuleHeader
		backHref={data.moduleIndexUrl}
		backLabel={data.module.title}
		typeLabel={data.typeLabel}
		title={data.doc.title}
		moduleId={data.module.id}
		titleFormAction="?/updateDocTitle"
		titleAriaLabel="Document title"
	>
		{#snippet titleTrailing()}
			<DocEditorPresence users={connectedUsers} currentUserId={data.currentUser.id} />
		{/snippet}
	</ModuleHeader>

	<DocsEditor
		docId={data.doc.id}
		currentUser={data.currentUser}
		onConnectedUsersChange={(users) => {
			connectedUsers = users;
		}}
	/>
</div>
