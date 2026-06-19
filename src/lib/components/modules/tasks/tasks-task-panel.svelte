<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { Dialog } from 'bits-ui';
	import { Time, type DateValue } from '@internationalized/date';
	import ButtonUi from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import DatePickerUi from '../../ui/date-picker.svelte';
	import TimeFieldUi from '../../ui/time-field.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import Select from '../../ui/select.svelte';
	import Checkbox from '../../ui/checkbox.svelte';
	import Combobox from '../../ui/combobox.svelte';
	import Slider from '../../ui/slider.svelte';
	import { iconButtonClass } from '../../../icon-button-styles';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import Sheet from '../../ui/sheet.svelte';
	import AlertDialog from '../../ui/alert-dialog.svelte';
	import type { TaskAttachmentRow, TaskRow, TeamMemberOption } from '$lib/server/tasks';
	import {
		TASK_PRIORITIES,
		TASK_STATUSES,
		clampPercentDone,
		taskPriorityLabel,
		taskStatusLabel,
		type TaskPriority,
		type TaskStatus
	} from '$lib/shared/tasks';
	import { localDateTimeToIso, toDateInputValue, toTimeInputValue } from '$lib/shared/calendar';
	import { stringArraysEqual, textChanged } from '$lib/shared/form-changes';
	import { displayTitleClass } from '../../ui/ui-styles';
	import { calendarDateFromDate, dateInputStringFromValue } from '../../../date-values';
	import { timeFromDate, timeInputStringFromValue } from '../../../time-values';
	import TasksAttachments from '../tasks/tasks-attachments.svelte';
	import TasksTagPicker from './tasks-tag-picker.svelte';
	import TasksLinkPicker, { type SelectedTaskLink } from './tasks-link-picker.svelte';
	import TasksBacklinks from './tasks-backlinks.svelte';
	import TasksComments from './tasks-comments.svelte';
	import TasksTaskColorButton from './tasks-task-color-button.svelte';
	import BookmarkToggle from '../../bookmarks/bookmark-toggle.svelte';
	import LabelInfoTooltip from '../../ui/label-info-tooltip.svelte';
	import { getBookmarkContext } from '../../bookmarks/bookmark-context.svelte';
	import type {
		LinkableTarget,
		TaskBacklinkRow,
		TaskCommentRow,
		TaskModuleSettings
	} from '$lib/server/tasks';
	import type { TaskTagRow } from '$lib/shared/task-links';

	type Props = {
		open?: boolean;
		mode: 'create' | 'edit';
		task?: TaskRow | null;
		tasks: TaskRow[];
		teamMembers: TeamMemberOption[];
		taskModuleSettings: TaskModuleSettings;
		wrkspaceTags?: TaskTagRow[];
		linkableTargets?: LinkableTarget[];
		taskComments?: TaskCommentRow[];
		taskBacklinks?: TaskBacklinkRow[];
		onAttachmentsChange?: (taskId: string, attachments: TaskAttachmentRow[]) => void;
		onCommentPosted?: () => void;
		onClose?: () => void;
	};

	let {
		open = $bindable(false),
		mode,
		task = null,
		tasks,
		teamMembers,
		taskModuleSettings,
		wrkspaceTags = [],
		linkableTargets = [],
		taskComments = [],
		taskBacklinks = [],
		onAttachmentsChange,
		onCommentPosted,
		onClose
	}: Props = $props();

	const bmCtx = getBookmarkContext();

	let titleValue = $state('');
	let descriptionValue = $state('');
	let notesValue = $state('');
	let statusValue = $state<TaskStatus>('todo');
	let priorityValue = $state<TaskPriority>('medium');
	let startDate = $state<DateValue | undefined>(undefined);
	let startTime = $state<Time | undefined>(new Time(9, 0));
	let assigneeIds = $state<string[]>([]);
	let hasStart = $state(false);
	let hasDue = $state(false);
	let scheduleOpen = $state(false);
	let workOpen = $state(false);
	let detailsOpen = $state(false);
	let dueDate = $state<DateValue | undefined>(undefined);
	let dueTime = $state<Time | undefined>(new Time(17, 0));
	let hasCompleted = $state(false);
	let completedDate = $state<DateValue | undefined>(undefined);
	let completedTime = $state<Time | undefined>(undefined);
	let blockedByIds = $state<string[]>([]);
	let colorMode = $state<'module' | 'custom'>('module');
	let customColorValue = $state('#3b82f6');
	let percentDoneValue = $state(0);
	let selectedTagIds = $state<string[]>([]);
	let newTagNames = $state<string[]>([]);
	let selectedLinks = $state<SelectedTaskLink[]>([]);
	let panelSessionKey = $state<string | null>(null);

	function applyTaskToForm(t: TaskRow) {
		if (t.startsAt) {
			hasStart = true;
			startDate = calendarDateFromDate(new Date(t.startsAt));
			startTime = timeFromDate(new Date(t.startsAt));
		} else {
			hasStart = false;
			startDate = undefined;
			startTime = new Time(9, 0);
		}
		if (t.dueAt) {
			hasDue = true;
			dueDate = calendarDateFromDate(new Date(t.dueAt));
			dueTime = timeFromDate(new Date(t.dueAt));
		} else {
			hasDue = false;
			dueDate = undefined;
			dueTime = new Time(17, 0);
		}
		if (t.completedAt) {
			hasCompleted = true;
			completedDate = calendarDateFromDate(new Date(t.completedAt));
			completedTime = timeFromDate(new Date(t.completedAt));
		} else {
			hasCompleted = false;
			completedDate = undefined;
			completedTime = undefined;
		}
		assigneeIds = t.assignees.map((a) => a.userId);
		blockedByIds = [...t.blockedByIds];
		colorMode = t.customColor ? 'custom' : 'module';
		customColorValue = t.customColor ?? '#3b82f6';
		percentDoneValue = t.percentDone;
		selectedTagIds = t.tags.map((tag) => tag.id);
		newTagNames = [];
		selectedLinks = t.links.map((link) => ({
			targetType: link.targetType,
			targetId: link.targetId,
			moduleId: link.moduleId,
			title: link.title,
			moduleTitle: link.moduleTitle,
			href: link.href
		}));
	}

	function initCollapsibleDefaults(t: TaskRow) {
		scheduleOpen = !!(t.startsAt || t.dueAt || t.completedAt);
		workOpen = t.assignees.length > 0 || t.percentDone > 0 || t.blockedByIds.length > 0;
		detailsOpen =
			!!t.notes.trim() || t.tags.length > 0 || t.links.length > 0 || t.attachments.length > 0;
	}

	function resetCreateForm(currentTask: TaskRow | null | undefined) {
		titleValue = '';
		descriptionValue = '';
		notesValue = '';
		statusValue = currentTask?.status ?? 'todo';
		priorityValue = currentTask?.priority ?? 'medium';
		hasStart = false;
		startDate = undefined;
		startTime = new Time(9, 0);
		hasDue = false;
		dueDate = undefined;
		dueTime = new Time(17, 0);
		scheduleOpen = false;
		workOpen = false;
		detailsOpen = false;
		hasCompleted = false;
		completedDate = undefined;
		completedTime = undefined;
		assigneeIds = [];
		blockedByIds = [];
		colorMode = 'module';
		customColorValue = '#3b82f6';
		percentDoneValue = 0;
		selectedTagIds = [];
		newTagNames = [];
		selectedLinks = [];
	}

	$effect.pre(() => {
		const currentMode = mode;
		const taskId = task?.id;
		const isOpen = open;

		if (!isOpen) {
			untrack(() => {
				panelSessionKey = null;
			});
			return;
		}

		const sessionKey = currentMode === 'edit' && taskId ? `edit:${taskId}` : 'create';

		if (sessionKey === panelSessionKey) return;

		untrack(() => {
			panelSessionKey = sessionKey;
			const currentTask = task;

			if (currentMode === 'edit' && taskId && currentTask) {
				titleValue = currentTask.title;
				descriptionValue = currentTask.description;
				notesValue = currentTask.notes;
				statusValue = currentTask.status;
				priorityValue = currentTask.priority;
				applyTaskToForm(currentTask);
				initCollapsibleDefaults(currentTask);
			} else if (currentMode === 'create') {
				resetCreateForm(currentTask);
			}
		});
	});

	const otherTasks = $derived(tasks.filter((t) => t.id && (mode !== 'edit' || t.id !== task?.id)));
	const blockedByOptions = $derived(
		otherTasks.map((other) => ({ value: other.id, label: other.title }))
	);
	const assigneeOptions = $derived(
		teamMembers.map((member) => ({ value: member.id, label: member.name }))
	);

	const submitAction = $derived(mode === 'create' ? '?/createTask' : '?/updateTask');

	const linksJson = $derived(
		JSON.stringify(
			selectedLinks.map((l) => ({
				targetType: l.targetType,
				targetId: l.targetId,
				moduleId: l.moduleId
			}))
		)
	);

	const taskShareHref = $derived(
		task && bmCtx?.teamSlug && bmCtx?.wrkspaceSlug && bmCtx?.moduleId
			? `/teams/${bmCtx.teamSlug}/wrkspaces/${bmCtx.wrkspaceSlug}/modules/${bmCtx.moduleId}?task=${task.id}`
			: ''
	);

	let copyFeedback = $state('');
	let deleteDialogOpen = $state(false);
	let deleteFormRef = $state<HTMLFormElement | null>(null);
	let percentEditing = $state(false);
	let percentInputValue = $state('');

	function startPercentEdit() {
		percentInputValue = String(percentDoneValue);
		percentEditing = true;
		queueMicrotask(() => {
			const el = document.getElementById('task-percent-done-input') as HTMLInputElement | null;
			el?.focus();
			el?.select();
		});
	}

	function commitPercentInput() {
		const parsed = Number(percentInputValue);
		percentDoneValue = clampPercentDone(Number.isNaN(parsed) ? percentDoneValue : parsed);
		percentEditing = false;
	}

	function cancelPercentEdit() {
		percentEditing = false;
	}

	async function copyTaskLink() {
		if (!taskShareHref) return;
		const fullUrl = `${window.location.origin}${taskShareHref}`;
		try {
			await navigator.clipboard.writeText(fullUrl);
			copyFeedback = 'Copied';
			setTimeout(() => {
				copyFeedback = '';
			}, 2000);
		} catch {
			copyFeedback = 'Copy failed';
		}
	}

	function nowForCompletionInputs() {
		const now = new Date();
		completedDate = calendarDateFromDate(now);
		completedTime = timeFromDate(now);
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
		}
	});

	function handleClose() {
		open = false;
		onClose?.();
	}

	function isoFromTaskDate(value: Date | null): string | null {
		if (!value) return null;
		return localDateTimeToIso(toDateInputValue(value), toTimeInputValue(value));
	}

	function isoFromFormFields(
		hasValue: boolean,
		date: DateValue | undefined,
		time: Time | undefined
	): string | null {
		const dateStr = dateInputStringFromValue(date);
		const timeStr = timeInputStringFromValue(time);
		if (!hasValue || !dateStr || !timeStr) return null;
		return localDateTimeToIso(dateStr, timeStr);
	}

	function formCompletedAt(): string | null {
		return isoFromFormFields(hasCompleted, completedDate, completedTime);
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
		if (isoFromFormFields(hasStart, startDate, startTime) !== isoFromTaskDate(task.startsAt)) {
			return true;
		}
		if (isoFromFormFields(hasDue, dueDate, dueTime) !== isoFromTaskDate(task.dueAt)) {
			return true;
		}
		if (formCompletedAt() !== isoFromTaskDate(task.completedAt)) return true;
		if (
			!stringArraysEqual(
				assigneeIds,
				task.assignees.map((a) => a.userId)
			)
		) {
			return true;
		}
		if (!stringArraysEqual(blockedByIds, task.blockedByIds)) return true;
		if (
			!stringArraysEqual(
				selectedTagIds,
				task.tags.map((t) => t.id)
			)
		)
			return true;
		if (newTagNames.length > 0) return true;
		if (
			!stringArraysEqual(
				selectedLinks.map((l) => `${l.targetType}:${l.targetId}`).sort(),
				task.links.map((l) => `${l.targetType}:${l.targetId}`).sort()
			)
		) {
			return true;
		}

		return false;
	});
</script>

<Sheet
	bind:open
	title={titleValue.trim() || (mode === 'create' ? 'New task' : 'Task')}
	onOpenChange={(value) => !value && handleClose()}
	hideCloseButton={true}
	autoFocus={false}
>
	{#snippet header()}
		<div class="flex items-start gap-2">
			<span class="mt-1.5 shrink-0">
				<TasksTaskColorButton
					bind:colorMode
					bind:customColorValue
					{taskModuleSettings}
					status={statusValue}
					priority={priorityValue}
				/>
			</span>
			<div
				class="group/title hover:bg-surface-hover focus-within:bg-surface-hover min-w-0 flex-1 rounded-lg px-1 py-1 transition-colors"
			>
				<textarea
					id="task-title"
					form="task-panel-form"
					name="title"
					bind:value={titleValue}
					placeholder={mode === 'create' ? 'New task' : 'Task title'}
					required
					aria-label="Task title"
					class="{displayTitleClass} task-panel-title placeholder:text-ink-muted/40 w-full cursor-text resize-none appearance-none overflow-hidden border-0 bg-transparent p-0 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none"
				></textarea>
			</div>
			<div class="flex flex-col items-center gap-1">
				<Dialog.Close class={iconButtonClass('lg', 'subtle')} aria-label="Close panel">
					<HugeiconsIcon
						icon={Cancel01Icon}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</Dialog.Close>
				{#if mode === 'edit' && task?.id}
					<BookmarkToggle
						targetType="taskItem"
						targetId={task.id}
						label={task.title}
						size={18}
						class="size-10 shrink-0"
					/>
				{/if}
			</div>
		</div>
	{/snippet}

	<form
		id="task-panel-form"
		method="POST"
		action={submitAction}
		use:enhance={({ formData, cancel }) => {
			if (!titleValue.trim()) {
				cancel();
				return;
			}

			formData.delete('startsAt');
			formData.delete('dueAt');
			formData.delete('completedAt');
			const startDateStr = dateInputStringFromValue(startDate);
			const dueDateStr = dateInputStringFromValue(dueDate);
			const completedDateStr = dateInputStringFromValue(completedDate);
			const startTimeStr = timeInputStringFromValue(startTime);
			const dueTimeStr = timeInputStringFromValue(dueTime);
			const completedTimeStr = timeInputStringFromValue(completedTime);
			if (hasStart && startDateStr && startTimeStr) {
				formData.set('startsAt', localDateTimeToIso(startDateStr, startTimeStr));
			}
			if (hasDue && dueDateStr && dueTimeStr) {
				formData.set('dueAt', localDateTimeToIso(dueDateStr, dueTimeStr));
			}
			if (hasCompleted && completedDateStr && completedTimeStr) {
				formData.set('completedAt', localDateTimeToIso(completedDateStr, completedTimeStr));
			}

			formData.delete('customColor');
			if (colorMode === 'custom') {
				formData.set('customColor', customColorValue);
			}

			return async ({ update }) => {
				await update();
				handleClose();
			};
		}}
		class="flex min-h-0 flex-1 flex-col overflow-hidden"
	>
		<input type="hidden" name="links" value={linksJson} />

		<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
			{#if mode === 'edit' && task}
				<input type="hidden" name="taskId" value={task.id} />
			{/if}

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

			<div class="border-border bg-surface/50 rounded-lg border">
				<button
					type="button"
					class="group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-3 text-left"
					aria-expanded={scheduleOpen}
					onclick={() => (scheduleOpen = !scheduleOpen)}
				>
					<span class="text-ink text-sm font-medium">Schedule</span>
					<span
						class="text-ink-muted shrink-0 text-xs transition-transform duration-200"
						class:rotate-180={scheduleOpen}
						aria-hidden="true">▾</span
					>
				</button>
				{#if scheduleOpen}
					<div class="border-border space-y-6 border-t px-3 pt-3 pb-3">
						<div>
							<div class="flex items-center gap-1.5">
								<Label class="flex cursor-pointer items-center gap-2 text-sm font-normal">
									<Checkbox bind:checked={hasStart} />
									<span class="text-ink font-medium">Start date</span>
								</Label>
								<LabelInfoTooltip
									text="Shown as the start of the bar on the Gantt chart."
									ariaLabel="About start date"
								/>
							</div>
							{#if hasStart}
								<div class="mt-3 grid gap-3 sm:grid-cols-2">
									<DatePickerUi label="Date" bind:value={startDate} />
									<TimeFieldUi label="Time" bind:value={startTime} />
								</div>
							{/if}
						</div>

						<div>
							<div class="flex items-center gap-1.5">
								<Label class="flex cursor-pointer items-center gap-2 text-sm font-normal">
									<Checkbox bind:checked={hasDue} />
									<span class="text-ink font-medium">Due date</span>
								</Label>
								<LabelInfoTooltip
									text="Shown as the end of the bar on the Gantt chart."
									ariaLabel="About due date"
								/>
							</div>
							{#if hasDue}
								<div class="mt-3 grid gap-3 sm:grid-cols-2">
									<DatePickerUi label="Date" bind:value={dueDate} />
									<TimeFieldUi label="Time" bind:value={dueTime} />
								</div>
							{/if}
						</div>

						<div>
							<div class="flex items-center gap-1.5">
								<Label class="flex cursor-pointer items-center gap-2 text-sm font-normal">
									<Checkbox bind:checked={hasCompleted} />
									<span class="text-ink font-medium">Completion date</span>
								</Label>
								<LabelInfoTooltip
									text="Applied when status is Done."
									ariaLabel="About completion date"
								/>
							</div>
							{#if hasCompleted}
								<div class="mt-3 grid gap-3 sm:grid-cols-2">
									<DatePickerUi label="Date" bind:value={completedDate} />
									<TimeFieldUi label="Time" bind:value={completedTime} />
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<div class="border-border bg-surface/50 rounded-lg border">
				<button
					type="button"
					class="group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-3 text-left"
					aria-expanded={workOpen}
					onclick={() => (workOpen = !workOpen)}
				>
					<span class="text-ink text-sm font-medium">Work</span>
					<span
						class="text-ink-muted shrink-0 text-xs transition-transform duration-200"
						class:rotate-180={workOpen}
						aria-hidden="true">▾</span
					>
				</button>
				{#if workOpen}
					<div class="border-border space-y-6 border-t px-3 pt-3 pb-3">
						<div>
							<Label for="task-assignees">Assignees</Label>
							{#if assigneeOptions.length === 0}
								<p class="text-ink-muted mt-2 text-xs">No team members to assign yet.</p>
							{:else}
								<Combobox
									id="task-assignees"
									bind:value={assigneeIds}
									options={assigneeOptions}
									placeholder="Search members…"
									emptyMessage="No matching members."
									class="mt-1.5"
								/>
							{/if}
							{#each assigneeIds as userId (userId)}
								<input type="hidden" name="assigneeIds" value={userId} />
							{/each}
						</div>

						<div>
							<div class="flex items-center justify-between gap-2">
								<Label for="task-percent-done">Progress</Label>
								{#if percentEditing}
									<div class="flex items-center gap-0.5">
										<Input
											id="task-percent-done-input"
											type="number"
											min={0}
											max={100}
											step={1}
											variant="inline"
											class="h-7 w-14 px-1.5 text-right text-sm tabular-nums"
											bind:value={percentInputValue}
											aria-label="Progress percentage"
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													commitPercentInput();
												} else if (e.key === 'Escape') {
													e.preventDefault();
													cancelPercentEdit();
												}
											}}
											onblur={commitPercentInput}
										/>
										<span class="text-ink text-sm font-medium">%</span>
									</div>
								{:else}
									<ButtonUi
										type="button"
										variant="unstyled"
										class="text-ink hover:bg-surface-hover rounded px-1 text-sm font-medium tabular-nums hover:underline"
										aria-label="Edit progress percentage"
										onclick={startPercentEdit}
									>
										{percentDoneValue}%
									</ButtonUi>
								{/if}
							</div>
							<Slider id="task-percent-done" bind:value={percentDoneValue} step={5} class="mt-2" />
							<input type="hidden" name="percentDone" value={percentDoneValue} />
						</div>

						<div>
							<div class="flex items-center gap-1.5">
								<Label for="task-blocked-by">Blocked by</Label>
								<LabelInfoTooltip
									text="These tasks must finish before this one can start."
									ariaLabel="About blocked by"
								/>
							</div>
							{#if blockedByOptions.length === 0}
								<p class="text-ink-muted mt-2 text-xs">No other tasks to link yet.</p>
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
					</div>
				{/if}
			</div>

			<div class="border-border bg-surface/50 rounded-lg border">
				<button
					type="button"
					class="group flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-3 text-left"
					aria-expanded={detailsOpen}
					onclick={() => (detailsOpen = !detailsOpen)}
				>
					<span class="text-ink text-sm font-medium">Details</span>
					<span
						class="text-ink-muted shrink-0 text-xs transition-transform duration-200"
						class:rotate-180={detailsOpen}
						aria-hidden="true">▾</span
					>
				</button>
				{#if detailsOpen}
					<div class="border-border space-y-6 border-t px-3 pt-3 pb-3">
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

						{#if mode === 'edit' && task?.id}
							<TasksAttachments
								taskId={task.id}
								attachments={task.attachments}
								onChange={(attachments) => onAttachmentsChange?.(task.id, attachments)}
							/>
						{:else}
							<div
								class="border-border bg-surface-muted/50 rounded-lg border border-dashed px-3 py-2"
							>
								<div class="flex items-center gap-1.5">
									<p class="text-ink-muted text-sm font-medium">Attachments</p>
									<LabelInfoTooltip
										text="Save the task first, then add files here."
										ariaLabel="About attachments"
									/>
								</div>
							</div>
						{/if}

						<div>
							<p class="text-ink text-sm font-medium">Tags</p>
							<div class="mt-2">
								<TasksTagPicker {wrkspaceTags} bind:selectedTagIds bind:newTagNames />
							</div>
						</div>

						<div>
							<div class="flex items-center gap-1.5">
								<p class="text-ink text-sm font-medium">Links</p>
								<LabelInfoTooltip
									text="Connect this task to docs, forum threads, decisions, or other tasks."
									ariaLabel="About links"
								/>
							</div>
							<div class="mt-2">
								<TasksLinkPicker
									{linkableTargets}
									currentTaskId={task?.id ?? null}
									teamSlug={bmCtx?.teamSlug ?? ''}
									wrkspaceSlug={bmCtx?.wrkspaceSlug ?? ''}
									bind:selectedLinks
								/>
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if mode === 'edit' && taskBacklinks.length > 0}
				<div>
					<p class="text-ink text-sm font-medium">Linked from</p>
					<div class="mt-2">
						<TasksBacklinks backlinks={taskBacklinks} />
					</div>
				</div>
			{/if}

			{#if mode === 'edit' && task?.id}
				<div>
					<p class="text-ink text-sm font-medium">Comments</p>
					<div class="mt-2">
						<TasksComments taskId={task.id} comments={taskComments} {onCommentPosted} />
					</div>
				</div>
			{/if}
		</div>

		<footer
			class="border-border bg-surface-raised flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-4"
		>
			<div class="flex flex-wrap items-center gap-2">
				{#if mode === 'edit' && task}
					<ButtonUi
						type="button"
						variant="ghost"
						class="text-danger hover:bg-danger-muted"
						onclick={() => (deleteDialogOpen = true)}
					>
						Delete
					</ButtonUi>
					{#if taskShareHref}
						<ButtonUi type="button" variant="secondary" class="h-9 px-3" onclick={copyTaskLink}>
							{copyFeedback || 'Copy link'}
						</ButtonUi>
					{/if}
				{/if}
			</div>
			<div class="flex gap-2">
				<ButtonUi type="button" variant="secondary" onclick={handleClose}>Cancel</ButtonUi>
				<ButtonUi type="submit" disabled={mode === 'edit' && !canSave}>
					{mode === 'create' ? 'Create' : 'Save'}
				</ButtonUi>
			</div>
		</footer>
	</form>

	{#if mode === 'edit' && task?.id}
		<form
			bind:this={deleteFormRef}
			method="POST"
			action="?/deleteTask"
			class="hidden"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					deleteDialogOpen = false;
					handleClose();
				};
			}}
		>
			<input type="hidden" name="taskId" value={task.id} />
		</form>

		<AlertDialog
			bind:open={deleteDialogOpen}
			title="Delete task?"
			description={`“${task.title}” will be permanently deleted. This cannot be undone.`}
			actionLabel="Delete"
			cancelLabel="Cancel"
			destructive
			onConfirm={() => deleteFormRef?.requestSubmit()}
		/>
	{/if}
</Sheet>

<style>
	.task-panel-title {
		field-sizing: content;
		min-height: 1lh;
		overflow: hidden;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.task-panel-title::-webkit-scrollbar {
		display: none;
	}
</style>
