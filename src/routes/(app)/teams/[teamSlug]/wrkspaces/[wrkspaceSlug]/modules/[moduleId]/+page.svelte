<script lang="ts">
	import type { PageData } from './$types';
	import ModuleHeader from '$lib/components/modules/module-header.svelte';
	import ChatModule from '$lib/components/modules/chat/chat-module.svelte';
	import CalendarModule from '$lib/components/modules/calendar/calendar-module.svelte';
	import CardsModule from '$lib/components/modules/cards/cards-module.svelte';
	import DocsModule from '$lib/components/modules/docs/docs-module.svelte';
	import ForumModule from '$lib/components/modules/forum/forum-module.svelte';
	import TasksModule from '$lib/components/modules/tasks/tasks-module.svelte';

	let { data }: { data: PageData } = $props();

	let taskColorsOpen = $state(false);

	const wrkspaceUrl = $derived(`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}`);

	const isTasksModule = $derived(data.module.type === 'tasks');

	const headerExtraMenuItems = $derived(
		isTasksModule
			? [
					{
						label: 'Colors',
						onclick: () => {
							taskColorsOpen = true;
						}
					}
				]
			: []
	);

	const docHref = $derived(
		(docId: string) =>
			`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}/modules/${data.module.id}/docs/${docId}`
	);

	const threadHref = $derived(
		(threadId: string) =>
			`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}/modules/${data.module.id}/threads/${threadId}`
	);
</script>

<div>
	<ModuleHeader
		backHref={wrkspaceUrl}
		backLabel={data.wrkspace.name}
		typeLabel={data.typeLabel}
		title={data.module.title}
		moduleId={data.module.id}
		extraMenuItems={headerExtraMenuItems}
	/>

	{#if data.module.type === 'chat' && data.messages && data.currentUserId}
		<ChatModule messages={data.messages} currentUserId={data.currentUserId} />
	{:else if data.module.type === 'calendar' && data.events}
		<CalendarModule
			events={data.events}
			teamSlug={data.wrkspace.teamSlug}
			wrkspaceSlug={data.wrkspace.slug}
			moduleId={data.module.id}
		/>
	{:else if data.module.type === 'cards' && data.board}
		<CardsModule board={data.board} />
	{:else if data.module.type === 'docs' && data.documents}
		<DocsModule documents={data.documents} {docHref} />
	{:else if data.module.type === 'forum' && data.threadsPage}
		<ForumModule threadsPage={data.threadsPage} {threadHref} />
	{:else if data.module.type === 'tasks' && data.tasks && data.taskModuleSettings}
		<TasksModule
			tasks={data.tasks}
			teamMembers={data.teamMembers ?? []}
			taskModuleSettings={data.taskModuleSettings}
			taskDependencies={data.taskDependencies ?? []}
			bind:settingsOpen={taskColorsOpen}
		/>
	{:else}
		<p class="mt-10 text-sm text-ink-muted">This module type is not implemented yet.</p>
	{/if}
</div>
