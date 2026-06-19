<script lang="ts">
	import type { PageData } from './$types';
	import ModuleHeader from '$lib/components/modules/module-header.svelte';
	import ChatModule from '$lib/components/modules/chat/chat-module.svelte';
	import CalendarModule from '$lib/components/modules/calendar/calendar-module.svelte';
	import CardsModule from '$lib/components/modules/cards/cards-module.svelte';
	import CardsSetupWizard from '$lib/components/modules/cards/cards-setup-wizard.svelte';
	import CardsEmptyState from '$lib/components/modules/cards/cards-empty-state.svelte';
	import DocsLibrary from '$lib/components/modules/docs/docs-library.svelte';
	import ForumModule from '$lib/components/modules/forum/forum-module.svelte';
	import TasksModule from '$lib/components/modules/tasks/tasks-module.svelte';
	import DecisionsModule from '$lib/components/modules/decisions/decisions-module.svelte';
	import ReportsModuleHome from '$lib/components/modules/reports/reports-module-home.svelte';
	import ReportsSetupWizard from '$lib/components/modules/reports/reports-setup-wizard.svelte';
	import ReportsEmptyState from '$lib/components/modules/reports/reports-empty-state.svelte';
	import { setBookmarkContext } from '$lib/components/bookmarks/bookmark-context.svelte';

	let { data }: { data: PageData } = $props();

	let taskColorsOpen = $state(false);
	let cardFieldsOpen = $state(false);

	const bookmarkCtx = setBookmarkContext({
		teamSlug: data.wrkspace.teamSlug,
		wrkspaceSlug: data.wrkspace.slug,
		moduleId: data.module.id,
		moduleType: data.module.type,
		bookmarkedIds: data.bookmarkedIds ?? []
	});

	$effect(() => {
		bookmarkCtx.bookmarkedIds = data.bookmarkedIds ?? [];
	});

	const wrkspaceUrl = $derived(`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}`);

	const isTasksModule = $derived(data.module.type === 'tasks');
	const isCardsModule = $derived(data.module.type === 'cards');

	const headerExtraMenuItems = $derived.by(() => {
		if (isTasksModule) {
			return [
				{
					label: 'Colors',
					onclick: () => {
						taskColorsOpen = true;
					}
				}
			];
		}
		if (isCardsModule && data.canManageModules) {
			return [
				{
					label: 'Card fields',
					onclick: () => {
						cardFieldsOpen = true;
					}
				}
			];
		}
		return [];
	});

	const isChatModule = $derived(data.module.type === 'chat');
	const isCalendarModule = $derived(data.module.type === 'calendar');
	const needsFullHeight = $derived(isChatModule || isCalendarModule || isCardsModule);

	const moduleBasePath = $derived(
		`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}/modules/${data.module.id}`
	);

	const docHref = $derived((docId: string) => `${moduleBasePath}/docs/${docId}`);

	const assetHref = $derived((assetId: string) => `${moduleBasePath}/assets/${assetId}`);

	const threadHref = $derived(
		(threadId: string) =>
			`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}/modules/${data.module.id}/threads/${threadId}`
	);
</script>

<div class={needsFullHeight ? 'flex h-[calc(100vh-8rem)] flex-col' : ''}>
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
			eventInvitations={data.eventInvitations}
			eventAttachments={data.eventAttachments}
		/>
	{:else if data.module.type === 'cards' && data.cardsConfigured && data.board && data.cardModuleConfig}
		<CardsModule
			board={data.board}
			cardModuleConfig={data.cardModuleConfig}
			canManageModules={data.canManageModules ?? false}
			focusCardId={data.focusCardId ?? null}
			bind:settingsOpen={cardFieldsOpen}
		/>
	{:else if data.module.type === 'cards' && data.canManageModules}
		<CardsSetupWizard
			moduleTitle={data.module.title}
			presetOptions={data.cardsPresetOptions ?? []}
		/>
	{:else if data.module.type === 'cards'}
		<div class="mx-auto mt-6 flex max-w-lg flex-col items-center px-4 text-center">
			<CardsEmptyState />
			<p class="mt-6 text-sm text-ink-muted">
				This board has not been set up yet. Ask a wrkspace admin to choose a board preset.
			</p>
		</div>
	{:else if data.module.type === 'docs' && data.libraryPage}
		<DocsLibrary
			libraryPage={data.libraryPage}
			libraryMembers={data.libraryMembers ?? []}
			moveFolderTree={data.moveFolderTree ?? { canEditRoot: false, folders: [] }}
			{moduleBasePath}
			{docHref}
			{assetHref}
		/>
	{:else if data.module.type === 'forum' && data.threadsPage}
		<ForumModule threadsPage={data.threadsPage} {threadHref} />
	{:else if data.module.type === 'tasks' && data.tasks && data.taskModuleSettings}
		<TasksModule
			tasks={data.tasks}
			teamMembers={data.teamMembers ?? []}
			taskModuleSettings={data.taskModuleSettings}
			taskDependencies={data.taskDependencies ?? []}
			wrkspaceTags={data.wrkspaceTags ?? []}
			linkableTargets={data.linkableTargets ?? []}
			focusTaskId={data.focusTaskId ?? null}
			taskComments={data.taskComments ?? {}}
			taskBacklinks={data.taskBacklinks ?? {}}
			bind:settingsOpen={taskColorsOpen}
		/>
	{:else if data.module.type === 'decisions' && data.decisionsPage}
		<DecisionsModule
			decisionsPage={data.decisionsPage}
			teamMembers={data.teamMembers ?? []}
			linkableTargets={data.linkableTargets ?? []}
			participantsMap={data.relations?.participants ?? {}}
			linksMap={data.relations?.links ?? {}}
			supersedesOptions={data.supersedesOptions ?? []}
			currentUserId={data.currentUserId ?? ''}
			focusDecisionId={data.focusDecisionId ?? null}
		/>
	{:else if data.module.type === 'reports' && data.report}
		<ReportsModuleHome
			report={data.report}
			typeLabel={data.typeLabel}
			sourceOptions={data.sourceOptions ?? { taskModules: [], calendarModules: [] }}
			teamMembers={data.teamMembers ?? []}
			canEdit={data.canEdit ?? false}
			moduleTitle={data.module.title}
			teamSlug={data.teamSlug}
			wrkspaceSlug={data.wrkspaceSlug}
			progressData={data.progressData ?? null}
			timelineData={data.timelineData ?? null}
			workloadData={data.workloadData ?? null}
			personalData={data.personalData ?? null}
			digestData={data.digestData ?? null}
			summaryData={data.summaryData ?? null}
			moduleLinks={data.moduleLinks ?? []}
			digestModuleTypeLabel={data.digestModuleTypeLabel ?? null}
		/>
	{:else if data.module.type === 'reports' && data.canEdit}
		<ReportsSetupWizard
			moduleTitle={data.module.title}
			sourceOptions={data.sourceOptions ?? { taskModules: [], calendarModules: [] }}
			teamMembers={data.teamMembers ?? []}
			reportTypeOptions={data.reportTypeOptions ?? []}
		/>
	{:else if data.module.type === 'reports'}
		<div class="mt-6 max-w-3xl">
			<ReportsEmptyState />
			<p class="mt-6 text-sm text-ink-muted">
				This report has not been set up yet. Ask a wrkspace admin to choose a report type and
				connect source modules.
			</p>
		</div>
	{:else}
		<p class="mt-10 text-sm text-ink-muted">This module type is not implemented yet.</p>
	{/if}
</div>
