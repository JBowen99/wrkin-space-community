<script lang="ts">
	import { enhance } from '$app/forms';
	import { Dialog } from 'bits-ui';
	import type {
		DecisionLinkRow,
		DecisionListRow,
		DecisionParticipantRow,
		LinkableTarget
	} from '$lib/server/decisions';
	import type { DecisionStatus } from '$lib/shared/decisions';
	import { DECISION_LINK_TARGET_LABELS, DEFAULT_DECISION_STATUS } from '$lib/shared/decisions';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import Sheet from '../../ui/sheet.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import ConfirmDialog from '../../ui/confirm-dialog.svelte';
	import DecisionStatusBadge from './decision-status-badge.svelte';
	import DecisionFormFields from './decision-form-fields.svelte';
	import type { SelectedLink } from './decision-link-picker.svelte';
	import { iconButtonClass } from '../../../icon-button-styles';

	type TeamMember = { id: string; name: string; image: string | null };

	type Props = {
		open?: boolean;
		mode: 'create' | 'view';
		decision?: DecisionListRow | null;
		canEdit?: boolean;
		participants?: DecisionParticipantRow[];
		links?: DecisionLinkRow[];
		teamMembers: TeamMember[];
		linkableTargets: LinkableTarget[];
		supersedesOptions?: { id: string; title: string }[];
		onClose: () => void;
	};

	let {
		open = $bindable(false),
		mode,
		decision = null,
		canEdit = false,
		participants = [],
		links = [],
		teamMembers,
		linkableTargets,
		supersedesOptions = [],
		onClose
	}: Props = $props();

	let deleteOpen = $state(false);

	let title = $state('');
	let summary = $state('');
	let rationale = $state('');
	let status = $state<DecisionStatus>(DEFAULT_DECISION_STATUS);
	let decidedAt = $state<Date | null>(null);
	let participantIds = $state<string[]>([]);
	let supersedesId = $state<string | null>(null);
	let selectedLinks = $state<SelectedLink[]>([]);

	let panelSessionKey = $state('');

	function applyDecisionToForm(nextDecision: DecisionListRow) {
		title = nextDecision.title;
		summary = nextDecision.summary;
		rationale = nextDecision.rationale;
		status = nextDecision.status;
		decidedAt = nextDecision.decidedAt;
		participantIds = participants.map((p) => p.id);
		supersedesId = nextDecision.supersedesId;
		selectedLinks = links.map((l) => ({
			targetType: l.targetType,
			targetId: l.targetId,
			moduleId: l.moduleId,
			title: l.title,
			moduleTitle: l.moduleTitle
		}));
	}

	function resetCreateForm() {
		title = '';
		summary = '';
		rationale = '';
		status = DEFAULT_DECISION_STATUS;
		decidedAt = null;
		participantIds = [];
		supersedesId = null;
		selectedLinks = [];
	}

	$effect(() => {
		if (!open) return;

		const newKey = mode === 'create' ? 'create' : `view-${decision?.id ?? ''}`;
		if (newKey === panelSessionKey) return;
		panelSessionKey = newKey;

		deleteOpen = false;

		if (mode === 'create') {
			resetCreateForm();
		} else if (decision) {
			applyDecisionToForm(decision);
		}
	});

	const showEditableForm = $derived(mode === 'create' || canEdit);
	const canSubmit = $derived(title.trim().length > 0);
	const formAction = $derived(mode === 'create' ? '?/createDecision' : '?/updateDecision');
	const panelTitle = $derived(mode === 'create' ? 'New decision' : (decision?.title ?? 'Decision'));

	const linksByType = $derived.by(() => {
		if (links.length === 0) return new Map<string, DecisionLinkRow[]>();
		const groups = new Map<string, DecisionLinkRow[]>();
		for (const link of links) {
			const label = DECISION_LINK_TARGET_LABELS[link.targetType];
			const list = groups.get(label) ?? [];
			list.push(link);
			groups.set(label, list);
		}
		return groups;
	});

	function formatDate(d: Date | null): string {
		if (!d) return '\u2014';
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function handleOpenChange(value: boolean) {
		if (!value) {
			onClose();
		}
	}

	const closeClass = iconButtonClass('lg', 'subtle');
</script>

<Sheet
	{open}
	onOpenChange={handleOpenChange}
	title={panelTitle}
	maxWidth="max-w-lg"
	hideCloseButton
>
	{#snippet header()}
		<div class="flex min-w-0 flex-1 items-start justify-between gap-2">
			<div class="min-w-0">
				{#if mode === 'view' && decision}
					<div class="flex items-center gap-2">
						<DecisionStatusBadge status={showEditableForm ? status : decision.status} />
					</div>
					<h2 class="text-ink mt-1 text-base leading-snug font-semibold">
						{showEditableForm ? title.trim() || 'Decision' : decision.title}
					</h2>
				{:else}
					<h2 class="text-ink text-base font-semibold">{panelTitle}</h2>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-1">
				<Dialog.Close class={closeClass} aria-label="Close panel">
					<HugeiconsIcon
						icon={Cancel01Icon}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</Dialog.Close>
			</div>
		</div>
	{/snippet}

	{#snippet children()}
		{#if showEditableForm}
			<form
				method="POST"
				action={formAction}
				use:enhance={() => {
					return async ({ update }) => {
						if (!title.trim()) return;
						await update();
						if (mode === 'create') {
							resetCreateForm();
							open = false;
							onClose();
						}
					};
				}}
				class="flex flex-1 flex-col overflow-hidden"
			>
				{#if mode === 'view'}
					<input type="hidden" name="decisionId" value={decision?.id} />
				{/if}

				<div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
					<DecisionFormFields
						idPrefix="decision"
						bind:title
						bind:summary
						bind:rationale
						bind:status
						bind:decidedAt
						bind:participantIds
						bind:supersedesId
						bind:selectedLinks
						{teamMembers}
						{linkableTargets}
						{supersedesOptions}
					/>
				</div>

				<div class="border-border flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3">
					{#if mode === 'view' && canEdit}
						<ButtonUi
							type="button"
							variant="ghost"
							class="text-danger hover:text-danger"
							onclick={() => (deleteOpen = true)}
						>
							Delete
						</ButtonUi>
					{:else}
						<span></span>
					{/if}
					<div class="flex justify-end gap-2">
						<ButtonUi type="button" variant="secondary" onclick={() => ((open = false), onClose())}>
							Cancel
						</ButtonUi>
						<ButtonUi type="submit" disabled={!canSubmit}>
							{mode === 'create' ? 'Create' : 'Save changes'}
						</ButtonUi>
					</div>
				</div>
			</form>
		{:else if decision}
			<div class="flex flex-1 flex-col overflow-hidden">
				<div class="flex-1 overflow-y-auto px-5 py-4">
					<div class="flex flex-col gap-5">
						<div class="text-ink-muted flex flex-wrap gap-x-4 gap-y-1 text-sm">
							<span>By {decision.authorName}</span>
							<span aria-hidden="true">&middot;</span>
							<span>Decided {formatDate(decision.decidedAt)}</span>
							<span aria-hidden="true">&middot;</span>
							<span>Updated {formatDate(decision.updatedAt)}</span>
						</div>

						<div>
							<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">
								Participants
							</h3>
							<p class="text-ink mt-1 text-sm">
								{#if participants.length > 0}
									{participants.map((p) => p.name).join(', ')}
								{:else}
									None
								{/if}
							</p>
						</div>

						{#if decision.supersedesId && decision.supersedesTitle}
							<p class="text-ink-muted text-sm">
								Supersedes
								<a
									href="?decision={decision.supersedesId}"
									class="text-accent font-medium hover:underline"
								>
									{decision.supersedesTitle}
								</a>
							</p>
						{/if}

						{#if decision.summary}
							<section>
								<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">Summary</h3>
								<p class="text-ink mt-2 text-sm leading-relaxed whitespace-pre-wrap">
									{decision.summary}
								</p>
							</section>
						{:else}
							<section>
								<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">Summary</h3>
								<p class="text-ink-muted mt-2 text-sm">No summary added.</p>
							</section>
						{/if}

						{#if decision.rationale}
							<section>
								<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">
									Rationale
								</h3>
								<p class="text-ink mt-2 text-sm leading-relaxed whitespace-pre-wrap">
									{decision.rationale}
								</p>
							</section>
						{:else}
							<section>
								<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">
									Rationale
								</h3>
								<p class="text-ink-muted mt-2 text-sm">No rationale added.</p>
							</section>
						{/if}

						{#if links.length > 0}
							<section>
								<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">Related</h3>
								<div class="mt-2 flex flex-col gap-3">
									{#each [...linksByType.entries()] as [groupLabel, groupLinks] (groupLabel)}
										<div>
											<p class="text-ink-muted text-xs font-medium">{groupLabel}</p>
											<ul class="mt-1 flex flex-col gap-1">
												{#each groupLinks as link (link.id)}
													<li>
														<a
															href={link.href}
															class="text-accent text-sm font-medium hover:underline"
														>
															{link.title}
														</a>
														<span class="text-ink-muted text-xs"> &middot; {link.moduleTitle}</span>
													</li>
												{/each}
											</ul>
										</div>
									{/each}
								</div>
							</section>
						{:else}
							<section>
								<h3 class="text-ink-muted text-xs font-medium tracking-wide uppercase">Related</h3>
								<p class="text-ink-muted mt-2 text-sm">No related items.</p>
							</section>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/snippet}
</Sheet>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete decision?"
	description="This decision record will be permanently removed."
	confirmLabel="Delete"
	destructive
	formAction="?/deleteDecision"
	hiddenFields={{ decisionId: decision?.id ?? '' }}
/>
