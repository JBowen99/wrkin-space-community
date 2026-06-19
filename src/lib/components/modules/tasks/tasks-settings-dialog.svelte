<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Dialog from '../../ui/dialog.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import ColorPicker from '../../ui/color-picker.svelte';
	import type { TaskModuleSettings } from '$lib/server/tasks';
	import { DEFAULT_TASK_MODULE_SETTINGS } from '$lib/shared/tasks-colors';
	import {
		TASK_COLOR_BY_OPTIONS,
		TASK_PRIORITIES,
		TASK_STATUSES,
		taskPriorityLabel,
		taskStatusLabel,
		type TaskColorBy
	} from '$lib/shared/tasks';
	import { recordStringsEqual } from '$lib/shared/form-changes';
	import RadioGroup from '../../ui/radio-group.svelte';

	type Props = {
		open?: boolean;
		settings: TaskModuleSettings;
		onClose?: () => void;
	};

	let { open = $bindable(false), settings, onClose }: Props = $props();

	let colorBy = $state<TaskColorBy>('priority');
	let statusColors = $state({ ...DEFAULT_TASK_MODULE_SETTINGS.statusColors });
	let priorityColors = $state({ ...DEFAULT_TASK_MODULE_SETTINGS.priorityColors });

	$effect(() => {
		if (!open) return;

		untrack(() => {
			colorBy = settings.colorBy;
			statusColors = { ...settings.statusColors };
			priorityColors = { ...settings.priorityColors };
		});
	});

	function handleClose() {
		open = false;
		onClose?.();
	}

	function resetToDefaults() {
		const defaults = DEFAULT_TASK_MODULE_SETTINGS;
		colorBy = defaults.colorBy;
		statusColors = { ...defaults.statusColors };
		priorityColors = { ...defaults.priorityColors };
	}

	const canSave = $derived(
		colorBy !== settings.colorBy ||
			!recordStringsEqual(statusColors, settings.statusColors, TASK_STATUSES) ||
			!recordStringsEqual(priorityColors, settings.priorityColors, TASK_PRIORITIES)
	);
</script>

<Dialog bind:open title="Task module settings" onOpenChange={(value) => !value && handleClose()}>
	<form
		method="POST"
		action="?/updateTaskModuleSettings"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="max-h-[min(80vh,36rem)] space-y-5 overflow-y-auto pr-1"
	>
		<fieldset class="space-y-2">
			<legend class="text-ink text-sm font-medium">Color tasks by</legend>
			<RadioGroup
				name="colorBy"
				bind:value={colorBy}
				items={TASK_COLOR_BY_OPTIONS.map((option) => ({
					value: option,
					label: option.charAt(0).toUpperCase() + option.slice(1)
				}))}
			/>
		</fieldset>

		<div class="space-y-3">
			<p class="text-ink text-sm font-medium">Status colors</p>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each TASK_STATUSES as status (status)}
					<div
						class="border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
					>
						<Label for="status-color-{status}" class="text-sm">{taskStatusLabel(status)}</Label>
						<ColorPicker
							id="status-color-{status}"
							name="statusColor_{status}"
							bind:value={statusColors[status]}
							compact
							ariaLabel={`${taskStatusLabel(status)} color`}
						/>
					</div>
				{/each}
			</div>
		</div>

		<div class="space-y-3">
			<p class="text-ink text-sm font-medium">Priority colors</p>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each TASK_PRIORITIES as priority (priority)}
					<div
						class="border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
					>
						<Label for="priority-color-{priority}" class="text-sm"
							>{taskPriorityLabel(priority)}</Label
						>
						<ColorPicker
							id="priority-color-{priority}"
							name="priorityColor_{priority}"
							bind:value={priorityColors[priority]}
							compact
							ariaLabel={`${taskPriorityLabel(priority)} color`}
						/>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2 pt-2">
			<ButtonUi type="button" variant="ghost" onclick={resetToDefaults}>Reset to defaults</ButtonUi>
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={!canSave}>Save settings</ButtonUi>
			</div>
		</div>
	</form>
</Dialog>
