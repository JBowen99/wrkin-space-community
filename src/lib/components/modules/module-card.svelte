<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { WrkspaceModuleWithPreview } from '$lib/server/modules';
	import ContextMenu from '../ui/context-menu.svelte';
	import DeleteModuleDialog from './delete-module-dialog.svelte';
	import ModuleTitleEditor from './module-title-editor.svelte';
	import ChatPreview from './previews/chat-preview.svelte';
	import CalendarPreview from './previews/calendar-preview.svelte';
	import CardsPreview from './previews/cards-preview.svelte';
	import DocsPreview from './previews/docs-preview.svelte';
	import ForumPreview from './previews/forum-preview.svelte';
	import TasksPreview from './previews/tasks-preview.svelte';
	import DecisionsPreview from './previews/decisions-preview.svelte';
	import ReportsPreview from './previews/reports-preview.svelte';
	import { getModuleCatalogEntry } from '$lib/shared/modules';
	import { getModuleTypeIcon } from '$lib/shared/module-icons';
	import { REPORT_TYPE_LABELS, isReportType } from '$lib/shared/reports';

	type Props = {
		module: WrkspaceModuleWithPreview;
		href: string;
	};

	let { module: mod, href }: Props = $props();

	const entry = $derived(getModuleCatalogEntry(mod.type));
	const typeIcon = $derived(getModuleTypeIcon(mod.type));
	const typeLabel = $derived.by(() => {
		if (
			mod.preview.type === 'reports' &&
			mod.preview.reportType &&
			isReportType(mod.preview.reportType)
		) {
			return `${entry.label} - ${REPORT_TYPE_LABELS[mod.preview.reportType]}`;
		}
		return entry.label;
	});
	let deleteOpen = $state(false);
</script>

<ContextMenu
	items={[
		{
			label: 'Delete module',
			destructive: true,
			onclick: () => {
				deleteOpen = true;
			}
		}
	]}
>
	<div class="module-grid-item grid w-full grid-rows-[auto_auto] gap-1.5">
		<ModuleTitleEditor
			title={mod.title}
			moduleId={mod.id}
			variant="card"
			ariaLabel="Module title"
		/>
		<a {href} draggable="false" class="group/card block w-full shrink-0 self-start">
			<div
				class="border-border bg-surface-raised group-hover/card:border-accent/40 flex aspect-square w-full shrink-0 flex-col overflow-hidden rounded-xl border p-6 shadow-sm transition group-hover/card:shadow-md"
			>
				<div class="flex min-h-0 flex-1 flex-col">
					{#if mod.preview.type === 'chat'}
						<ChatPreview preview={mod.preview} />
					{:else if mod.preview.type === 'calendar'}
						<CalendarPreview preview={mod.preview} />
					{:else if mod.preview.type === 'cards'}
						<CardsPreview preview={mod.preview} />
					{:else if mod.preview.type === 'docs'}
						<DocsPreview preview={mod.preview} />
					{:else if mod.preview.type === 'forum'}
						<ForumPreview preview={mod.preview} />
					{:else if mod.preview.type === 'tasks'}
						<TasksPreview preview={mod.preview} />
					{:else if mod.preview.type === 'decisions'}
						<DecisionsPreview preview={mod.preview} />
					{:else if mod.preview.type === 'reports'}
						<ReportsPreview preview={mod.preview} />
					{:else}
						<p class="text-ink-muted text-sm">Coming soon</p>
					{/if}
				</div>
				<div class="text-ink-muted mt-2 flex shrink-0 items-center gap-1.5">
					<HugeiconsIcon
						icon={typeIcon}
						size={14}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
					<p class="truncate text-xs font-medium tracking-wide uppercase">{typeLabel}</p>
				</div>
			</div>
		</a>
	</div>
</ContextMenu>

<DeleteModuleDialog bind:open={deleteOpen} moduleId={mod.id} moduleTitle={mod.title} />
