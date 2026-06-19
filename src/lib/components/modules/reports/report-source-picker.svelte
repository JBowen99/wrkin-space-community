<script lang="ts">
	import type { ReportSourceModuleOption } from '$lib/server/reports';
	import Checkbox from '../../ui/checkbox.svelte';
	import Label from '../../ui/label.svelte';

	type Props = {
		taskModules?: ReportSourceModuleOption[];
		calendarModules?: ReportSourceModuleOption[];
		/** @deprecated use taskModules */
		sourceModules?: ReportSourceModuleOption[];
		selectedIds?: string[];
		showTasks?: boolean;
		showCalendar?: boolean;
	};

	let {
		taskModules = [],
		calendarModules = [],
		sourceModules = [],
		selectedIds = $bindable<string[]>([]),
		showTasks = true,
		showCalendar = false
	}: Props = $props();

	const taskList = $derived(
		taskModules.length > 0 ? taskModules : showCalendar ? [] : sourceModules
	);

	function toggle(id: string, checked: boolean) {
		if (checked) {
			if (!selectedIds.includes(id)) {
				selectedIds = [...selectedIds, id];
			}
		} else {
			selectedIds = selectedIds.filter((x) => x !== id);
		}
	}
</script>

{#if showTasks}
	{#if taskList.length === 0}
		<p class="text-ink-muted text-sm">No task modules in this wrkspace yet.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each taskList as mod (mod.id)}
				<li class="flex items-center gap-2">
					<Checkbox
						id="task-source-{mod.id}"
						checked={selectedIds.includes(mod.id)}
						onCheckedChange={(v) => toggle(mod.id, v === true)}
					/>
					<Label for="task-source-{mod.id}" class="text-ink cursor-pointer text-sm font-normal">
						{mod.title}
					</Label>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if showCalendar}
	{#if calendarModules.length === 0}
		<p class="text-ink-muted text-sm">No calendar modules in this wrkspace yet.</p>
	{:else}
		<ul class="mt-2 flex flex-col gap-2">
			{#each calendarModules as mod (mod.id)}
				<li class="flex items-center gap-2">
					<Checkbox
						id="cal-source-{mod.id}"
						checked={selectedIds.includes(mod.id)}
						onCheckedChange={(v) => toggle(mod.id, v === true)}
					/>
					<Label for="cal-source-{mod.id}" class="text-ink cursor-pointer text-sm font-normal">
						{mod.title}
					</Label>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
