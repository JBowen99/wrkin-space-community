<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import Select from '../../ui/select.svelte';
	import Checkbox from '../../ui/checkbox.svelte';
	import Combobox from '../../ui/combobox.svelte';
	import Slider from '../../ui/slider.svelte';
	import RadioGroup from '../../ui/radio-group.svelte';
	import ColorPicker from '../../ui/color-picker.svelte';
	import Sheet from '../../ui/sheet.svelte';
	import type { TaskAttachmentRow, TaskRow, TeamMemberOption } from '$lib/server/tasks';
	import {
		TASK_PRIORITIES,
		TASK_STATUSES,
		taskPriorityLabel,
		taskStatusLabel,
		type TaskPriority,
		type TaskStatus
	} from '$lib/shared/tasks';
	import { localDateTimeToIso, toDateInputValue, toTimeInputValue } from '$lib/shared/calendar';
	import { stringArraysEqual, textChanged } from '$lib/shared/form-changes';
	import TasksAttachments from '../tasks/tasks-attachments.svelte';

	type Props = {
		open?: boolean;
		mode: 'create' | 'edit';
		task?: TaskRow | null;
		tasks: TaskRow[];
		teamMembers: TeamMemberOption[];
		onAttachmentsChange?: (taskId: string, attachments: TaskAttachmentRow[]) => void;
		onClose?: () => void;
	};

	let {
		open = $bindable(false),
		mode,
		task = null,
		tasks,
		teamMembers,
		onAttachmentsChange,
		onClose
	}: Props = $props();

	let titleValue = $state('');
	let descriptionValue = $state('');
	let notesValue = $state('');
	let statusValue = $state<TaskStatus>('todo');
	let priorityValue = $state<TaskPriority>('medium');
	let dateValue = $state('');
	let startTimeValue = $state('');
	let selectedAssignees = $state<Set<string>>(new Set());
	let hasStart = $state(false);
	let hasDue = $state(false);
	let dueDateValue = $state('');
	let dueTimeValue = $state('17:00');
	let hasCompleted = $state(false);
	let completedDateValue = $state('');
	let completedTimeValue = $state('');
	let blockedByIds = $state<string[]>([]);
	let colorMode = $state<'module' | 'custom'>('module');
	let customColorValue = $state('#3b82f6');
	let percentDoneValue = $state(0);

	function taskToFormDefaults(t: TaskRow) {
		const assigneeSet = new Set(t.assignees.map((a) => a.userId));
		if (t.startsAt) {
			hasStart = true;
			dateValue = toDateInputValue(t.startsAt);
			startTimeValue = toTimeInputValue(t.startsAt);
		} else {
			hasStart = false;
			dateValue = '';
			startTimeValue = '09:00';
		}
		if (t.dueAt) {
			hasDue = true;
			dueDateValue = toDateInputValue(t.dueAt);
			dueTimeValue = toTimeInputValue(t.dueAt);
		} else {
			hasDue = false;
			dueDateValue = '';
			dueTimeValue = '17:00';
		}
		if (t.completedAt) {
			hasCompleted = true;
			completedDateValue = toDateInputValue(t.completedAt);
			completedTimeValue = toTimeInputValue(t.completedAt);
		} else {
			hasCompleted = false;
			completedDateValue = '';
			completedTimeValue = '';
		}
		selectedAssignees = assigneeSet;
		blockedByIds = [...t.blockedByIds];
		colorMode = t.customColor ? 'custom' : 'module';
		customColorValue = t.customColor ?? '#3b82f6';
		percentDoneValue = t.percentDone;
	}

	$effect(() => {
		const currentMode = mode;
		const taskId = task?.id;

		untrack(() => {
			const currentTask = task;

			if (currentMode === 'edit' && taskId && currentTask) {
				titleValue = currentTask.title;
				descriptionValue = currentTask.description;
				notesValue = currentTask.notes;
				statusValue = currentTask.status;
				priorityValue = currentTask.priority;
				taskToFormDefaults(currentTask);
			} else if (currentMode === 'create') {
				titleValue = '';
				descriptionValue = '';
				notesValue = '';
				statusValue = currentTask?.status ?? 'todo';
				priorityValue = currentTask?.priority ?? 'medium';
				hasStart = false;
				dateValue = '';
				startTimeValue = '09:00';
				hasDue = false;
				dueDateValue = '';
				dueTimeValue = '17:00';
				hasCompleted = false;
				completedDateValue = '';
				completedTimeValue = '';
				selectedAssignees = new Set();
				blockedByIds = [];
				colorMode = 'module';
				customColorValue = '#3b82f6';
				percentDoneValue = 0;
			}
		});
	});

	const otherTasks = $derived(tasks.filter((t) => t.id && (mode !== 'edit' || t.id !== task?.id)));
	const blockedByOptions = $derived(
		otherTasks.map((other) => ({ value: other.id, label: other.title }))
	);

	const panelTitle = $derived(mode === 'create' ? 'New task' : 'Task details');
	const panelDescription = $derived(
		mode === 'edit' && task
			? `${taskStatusLabel(task.status)} · ${taskPriorityLabel(task.priority)}`
			: undefined
	);
	const submitAction = $derived(mode === 'create' ? '?/createTask' : '?/updateTask');

	function nowForCompletionInputs() {
		const now = new Date();
		completedDateValue = toDateInputValue(now);
		completedTimeValue = toTimeInputValue(now);
	}

	let previousStatusValue = $state<TaskStatus | null>(null);

	$effect(() => {
		const previous = previousStatusValue;
		previousStatusValue = statusValue;

		if (statusValue === 'done' && previous !== null && previous !== 'done') {
			if (!hasCompleted) {
				hasCompleted = true;
				nowForCompletionInputs();
			}
		} else if (previous === 'done' && statusValue !== 'done') {
			hasCompleted = false;
			completedDateValue = '';
			completedTimeValue = '';
		}
	});

	function toggleAssignee(userId: string) {
		const next = new Set(selectedAssignees);
		if (next.has(userId)) {
			next.delete(userId);
		} else {
			next.add(userId);
		}
		selectedAssignees = next;
	}

	function handleClose() {
		open = false;
		onClose?.();
	}

	function isoFromTaskDate(value: Date | null): string | null {
		if (!value) return null;
		return localDateTimeToIso(toDateInputValue(value), toTimeInputValue(value));
	}

	function isoFromFormFields(hasValue: boolean, date: string, time: string): string | null {
		if (!hasValue || !date || !time) return null;
		return localDateTimeToIso(date, time);
	}

	function formCompletedAt(): string | null {
		if (statusValue !== 'done' || !hasCompleted || !completedDateValue || !completedTimeValue) {
			return null;
		}
		return localDateTimeToIso(completedDateValue, completedTimeValue);
	}

	function formCustomColor(): string | null {
		return colorMode === 'custom' ? customColorValue : null;
	}

	const canSave = $derived.by(() => {
		if (mode !== 'edit' || !task) return false;

		if (textChanged(titleValue, task.title)) return true;
		if (descriptionValue !== task.description) return true;
		if (notesValue !== task.notes) return true;
		if (statusValue !== task.status) return true;
		if (priorityValue !== task.priority) return true;
		if (percentDoneValue !== task.percentDone) return true;
		if (formCustomColor() !== task.customColor) return true;
		if (isoFromFormFields(hasStart, dateValue, startTimeValue) !== isoFromTaskDate(task.startsAt)) {
			return true;
		}
		if (isoFromFormFields(hasDue, dueDateValue, dueTimeValue) !== isoFromTaskDate(task.dueAt)) {
			return true;
		}
		if (formCompletedAt() !== isoFromTaskDate(task.completedAt)) return true;
		if (
			!stringArraysEqual(
				[...selectedAssignees],
				task.assignees.map((a) => a.userId)
			)
		) {
			return true;
		}
		if (!stringArraysEqual(blockedByIds, task.blockedByIds)) return true;

		return false;
	});
</script>

<Sheet
	bind:open
	title={panelTitle}
	description={panelDescription}
	onOpenChange={(value) => !value && handleClose()}
>
	<form
		method="POST"
		action={submitAction}
		use:enhance={({ formData, submitter, cancel }) => {
			const action = submitter?.getAttribute('formaction') ?? '';
			const isDelete = action.includes('deleteTask');

			if (!isDelete && !titleValue.trim()) {
				cancel();
				return;
			}

			if (!isDelete) {
				formData.delete('startsAt');
				formData.delete('dueAt');
				formData.delete('completedAt');
				if (hasStart && dateValue && startTimeValue) {
					formData.set('startsAt', localDateTimeToIso(dateValue, startTimeValue));
				}
				if (hasDue && dueDateValue && dueTimeValue) {
					formData.set('dueAt', localDateTimeToIso(dueDateValue, dueTimeValue));
				}
				if (statusValue === 'done' && hasCompleted && completedDateValue && completedTimeValue) {
					formData.set('completedAt', localDateTimeToIso(completedDateValue, completedTimeValue));
				}

				formData.delete('customColor');
				if (colorMode === 'custom') {
					formData.set('customColor', customColorValue);
				}
			}

			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="flex min-h-0 flex-1 flex-col overflow-hidden"
	>
		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
			{#if mode === 'edit' && task}
				<input type="hidden" name="taskId" value={task.id} />
			{/if}

			<div>
				<Label for="task-title">Title</Label>
				<Input
					id="task-title"
					name="title"
					bind:value={titleValue}
					placeholder="Task title"
					required
				/>
			</div>

			<div>
				<Label for="task-description">Description</Label>
				<Textarea
					id="task-description"
					name="description"
					rows={4}
					bind:value={descriptionValue}
					placeholder="What needs to be done?"
				/>
			</div>

			<div>
				<div class="flex items-center justify-between gap-2">
					<Label for="task-percent-done">Progress</Label>
					<span class="text-sm font-medium text-ink tabular-nums">{percentDoneValue}%</span>
				</div>
				<Slider id="task-percent-done" bind:value={percentDoneValue} class="mt-2" />
				<input type="hidden" name="percentDone" value={percentDoneValue} />
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<Label for="task-status">Status</Label>
					<Select
						id="task-status"
						name="status"
						bind:value={statusValue}
						options={TASK_STATUSES.map((status) => ({
							value: status,
							label: taskStatusLabel(status)
						}))}
					/>
				</div>
				<div>
					<Label for="task-priority">Priority</Label>
					<Select
						id="task-priority"
						name="priority"
						bind:value={priorityValue}
						options={TASK_PRIORITIES.map((priority) => ({
							value: priority,
							label: taskPriorityLabel(priority)
						}))}
					/>
				</div>
			</div>

			<div class="space-y-3 rounded-lg border border-border bg-surface/50 p-3">
				<p class="text-sm font-medium text-ink">Schedule</p>
				<label class="flex items-center gap-2 text-sm">
					<Checkbox bind:checked={hasStart} />
					<span class="font-medium text-ink">Start date</span>
				</label>
				{#if hasStart}
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<Label for="task-start-date">Date</Label>
							<Input id="task-start-date" type="date" bind:value={dateValue} />
						</div>
						<div>
							<Label for="task-start-time">Time</Label>
							<Input id="task-start-time" type="time" bind:value={startTimeValue} />
						</div>
					</div>
				{/if}

				<label class="flex items-center gap-2 text-sm">
					<Checkbox bind:checked={hasDue} />
					<span class="font-medium text-ink">Due date</span>
				</label>
				<p class="text-xs text-ink-muted">Shown as the end of the bar on the Gantt chart.</p>
				{#if hasDue}
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<Label for="task-due-date">Date</Label>
							<Input id="task-due-date" type="date" bind:value={dueDateValue} />
						</div>
						<div>
							<Label for="task-due-time">Time</Label>
							<Input id="task-due-time" type="time" bind:value={dueTimeValue} />
						</div>
					</div>
				{/if}
			</div>

			{#if statusValue === 'done'}
				<div class="space-y-3 rounded-lg border border-border bg-surface/50 p-3">
					<label class="flex items-center gap-2 text-sm">
						<Checkbox bind:checked={hasCompleted} />
						<span class="font-medium text-ink">Completion date</span>
					</label>
					{#if hasCompleted}
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<Label for="task-completed-date">Date</Label>
								<Input id="task-completed-date" type="date" bind:value={completedDateValue} />
							</div>
							<div>
								<Label for="task-completed-time">Time</Label>
								<Input id="task-completed-time" type="time" bind:value={completedTimeValue} />
							</div>
						</div>
					{:else}
						<p class="text-xs text-ink-muted">
							Will be set automatically when you save with status Done.
						</p>
					{/if}
				</div>
			{/if}

			<div>
				<Label for="task-notes">Notes</Label>
				<Textarea
					id="task-notes"
					name="notes"
					rows={3}
					bind:value={notesValue}
					placeholder="Internal notes…"
				/>
			</div>

			<div>
				<Label for="task-blocked-by">Blocked by</Label>
				<p class="mt-0.5 text-xs text-ink-muted">
					These tasks must finish before this one can start.
				</p>
				{#if blockedByOptions.length === 0}
					<p class="mt-2 text-xs text-ink-muted">No other tasks to link yet.</p>
				{:else}
					<Combobox
						id="task-blocked-by"
						bind:value={blockedByIds}
						options={blockedByOptions}
						placeholder="Search tasks…"
						emptyMessage="No matching tasks."
						class="mt-1.5"
					/>
				{/if}
				{#each blockedByIds as predecessorId (predecessorId)}
					<input type="hidden" name="blockedByIds" value={predecessorId} />
				{/each}
			</div>

			<div class="space-y-2 rounded-lg border border-border bg-surface/50 p-3">
				<p class="text-sm font-medium text-ink">Color</p>
				<RadioGroup
					bind:value={colorMode}
					items={[
						{ value: 'module', label: 'Use module color' },
						{ value: 'custom', label: 'Custom' }
					]}
				/>
				{#if colorMode === 'custom'}
					<div class="flex items-center gap-3">
						<ColorPicker bind:value={customColorValue} compact ariaLabel="Task color" />
						<span class="text-xs text-ink-muted">{customColorValue}</span>
					</div>
				{/if}
			</div>

			<div>
				<p class="text-sm font-medium text-ink">Assignees</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each teamMembers as member (member.id)}
						<label
							class="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm transition hover:bg-stone-50 {selectedAssignees.has(
								member.id
							)
								? 'border-accent/50 bg-accent-muted/30'
								: ''}"
						>
							<Checkbox
								checked={selectedAssignees.has(member.id)}
								onCheckedChange={() => toggleAssignee(member.id)}
							/>
							<span>{member.name}</span>
						</label>
					{/each}
				</div>
				{#each [...selectedAssignees] as userId (userId)}
					<input type="hidden" name="assigneeIds" value={userId} />
				{/each}
			</div>

			{#if mode === 'edit' && task?.id}
				<TasksAttachments
					taskId={task.id}
					attachments={task.attachments}
					onChange={(attachments) => onAttachmentsChange?.(task.id, attachments)}
				/>
			{:else}
				<div class="rounded-lg border border-dashed border-border bg-stone-50/50 px-3 py-2">
					<p class="text-sm font-medium text-ink-muted">Attachments</p>
					<p class="mt-0.5 text-xs text-ink-muted">Save the task first, then add files here.</p>
				</div>
			{/if}
		</div>

		<footer
			class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-raised px-5 py-4"
		>
			{#if mode === 'edit' && task}
				<ButtonUi
					type="submit"
					formaction="?/deleteTask"
					formmethod="POST"
					formnovalidate
					variant="ghost"
					class="text-red-700 hover:bg-red-50"
				>
					Delete
				</ButtonUi>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={mode === 'edit' && !canSave}>
					{mode === 'create' ? 'Create' : 'Save'}
				</ButtonUi>
			</div>
		</footer>
	</form>
</Sheet>
