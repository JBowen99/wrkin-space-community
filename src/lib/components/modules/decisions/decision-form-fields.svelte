<script lang="ts">
	import type { DateValue } from '@internationalized/date';
	import type { DecisionStatus } from '$lib/shared/decisions';
	import {
		DECISION_STATUSES,
		DECISION_STATUS_LABELS,
		DEFAULT_DECISION_STATUS
	} from '$lib/shared/decisions';
	import type { LinkableTarget } from '$lib/server/decisions';
	import FieldShell from '../../ui/field-shell.svelte';
	import Input from '../../ui/input.svelte';
	import Label from '../../ui/label.svelte';
	import Select from '../../ui/select.svelte';
	import Textarea from '../../ui/textarea.svelte';
	import DatePickerUi from '../../ui/date-picker.svelte';
	import Combobox from '../../ui/combobox.svelte';
	import DecisionLinkPicker, { type SelectedLink } from './decision-link-picker.svelte';
	import {
		calendarDateFromDate,
		calendarDateFromInputString,
		dateInputStringFromValue
	} from '../../../date-values';

	type TeamMember = { id: string; name: string; image: string | null };

	type Props = {
		idPrefix?: string;
		title?: string;
		summary?: string;
		rationale?: string;
		status?: DecisionStatus;
		decidedAt?: Date | null;
		participantIds?: string[];
		supersedesId?: string | null;
		selectedLinks?: SelectedLink[];
		teamMembers: TeamMember[];
		linkableTargets: LinkableTarget[];
		supersedesOptions?: { id: string; title: string }[];
		showTitle?: boolean;
		showSummary?: boolean;
		showRationale?: boolean;
		showLinks?: boolean;
	};

	let {
		idPrefix = 'decision',
		title = $bindable(''),
		summary = $bindable(''),
		rationale = $bindable(''),
		status = $bindable<DecisionStatus>(DEFAULT_DECISION_STATUS),
		decidedAt = $bindable<Date | null>(null),
		participantIds = $bindable<string[]>([]),
		supersedesId = $bindable<string | null>(null),
		selectedLinks = $bindable<SelectedLink[]>([]),
		teamMembers,
		linkableTargets,
		supersedesOptions = [],
		showTitle = true,
		showSummary = true,
		showRationale = true,
		showLinks = true
	}: Props = $props();

	let decidedDate = $state<DateValue | undefined>(undefined);

	// Keep `decidedAt` (Date) and `decidedDate` (DateValue) in sync without looping.
	// Each conversion produces a brand-new object, so we compare by value (date string)
	// and skip no-op writes; otherwise the two effects would ping-pong forever and freeze.
	$effect(() => {
		const target = decidedAt ? calendarDateFromDate(decidedAt) : undefined;
		if (dateInputStringFromValue(target) === dateInputStringFromValue(decidedDate)) return;
		decidedDate = target;
	});

	$effect(() => {
		const s = dateInputStringFromValue(decidedDate);
		const currentStr = decidedAt ? dateInputStringFromValue(calendarDateFromDate(decidedAt)) : '';
		if (s === currentStr) return;
		if (!s) {
			decidedAt = null;
			return;
		}
		const parsed = calendarDateFromInputString(s);
		if (parsed) {
			decidedAt = new Date(parsed.year, parsed.month - 1, parsed.day);
		}
	});

	const memberOptions = $derived(teamMembers.map((m) => ({ value: m.id, label: m.name })));

	const statusOptions = $derived(
		DECISION_STATUSES.map((s) => ({ value: s, label: DECISION_STATUS_LABELS[s] }))
	);

	const supersedesSelectOptions = $derived([
		{ value: '', label: 'None' },
		...supersedesOptions.map((o) => ({ value: o.id, label: o.title }))
	]);

	let supersedesSelectValue = $state('');

	$effect(() => {
		supersedesSelectValue = supersedesId ?? '';
	});

	const linksJson = $derived(
		JSON.stringify(
			selectedLinks.map((l) => ({
				targetType: l.targetType,
				targetId: l.targetId,
				moduleId: l.moduleId
			}))
		)
	);
</script>

<input type="hidden" name="links" value={linksJson} />

<div class="flex flex-col gap-4">
	{#if showTitle}
		<div>
			<Label for="{idPrefix}-title">Title</Label>
			<FieldShell>
				<Input
					id="{idPrefix}-title"
					name="title"
					variant="plain"
					required
					bind:value={title}
					placeholder="What was decided?"
				/>
			</FieldShell>
		</div>
	{/if}

	{#if showSummary}
		<div>
			<Label for="{idPrefix}-summary">Summary</Label>
			<FieldShell>
				<Textarea
					id="{idPrefix}-summary"
					name="summary"
					variant="plain"
					rows={2}
					bind:value={summary}
					placeholder="Short summary for the list view"
				/>
			</FieldShell>
		</div>
	{/if}

	{#if showRationale}
		<div>
			<Label for="{idPrefix}-rationale">Rationale</Label>
			<Textarea
				id="{idPrefix}-rationale"
				name="rationale"
				rows={6}
				bind:value={rationale}
				placeholder="Context, alternatives considered, and why this choice was made…"
				class="mt-1.5"
			/>
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<div>
			<Label for="{idPrefix}-status">Status</Label>
			<Select
				id="{idPrefix}-status"
				name="status"
				options={statusOptions}
				bind:value={status}
				class="mt-1.5"
			/>
		</div>
		<div>
			<Label>Decided on</Label>
			<input type="hidden" name="decidedAt" value={decidedAt ? decidedAt.toISOString() : ''} />
			<DatePickerUi bind:value={decidedDate} class="mt-1.5" />
		</div>
	</div>

	<div>
		<Label for="{idPrefix}-participants">Participants</Label>
		{#each participantIds as pid (pid)}
			<input type="hidden" name="participantIds" value={pid} />
		{/each}
		<Combobox
			id="{idPrefix}-participants"
			options={memberOptions}
			bind:value={participantIds}
			placeholder="Add participants…"
			class="mt-1.5"
		/>
	</div>

	{#if supersedesOptions.length > 0}
		<div>
			<Label for="{idPrefix}-supersedes">Supersedes</Label>
			<Select
				id="{idPrefix}-supersedes"
				name="supersedesId"
				options={supersedesSelectOptions}
				bind:value={supersedesSelectValue}
				onValueChange={(v) => {
					supersedesId = v || null;
				}}
				class="mt-1.5"
			/>
		</div>
	{/if}

	{#if showLinks && linkableTargets.length > 0}
		<div>
			<Label>Related items</Label>
			<div class="mt-1.5">
				<DecisionLinkPicker {linkableTargets} bind:selectedLinks />
			</div>
		</div>
	{/if}
</div>
