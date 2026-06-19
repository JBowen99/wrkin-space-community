<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type {
		DecisionLinkRow,
		DecisionListRow,
		DecisionParticipantRow,
		DecisionsPage,
		LinkableTarget
	} from '$lib/server/decisions';
	import type { DecisionSort, DecisionStatus, DecisionStatusTab } from '$lib/shared/decisions';
	import {
		DECISION_SORT_LABELS,
		DECISION_SORT_OPTIONS,
		DECISION_STATUS_TAB_LABELS,
		DECISION_STATUSES,
		DECISIONS_PER_PAGE
	} from '$lib/shared/decisions';
	import Input from '../../ui/input.svelte';
	import Select from '../../ui/select.svelte';
	import Pagination from '../../ui/pagination.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import DecisionRow from './decision-row.svelte';
	import DecisionPanel from './decision-panel.svelte';

	type TeamMember = { id: string; name: string; image: string | null };

	type Props = {
		decisionsPage: DecisionsPage;
		teamMembers: TeamMember[];
		linkableTargets: LinkableTarget[];
		participantsMap: Record<string, DecisionParticipantRow[]>;
		linksMap: Record<string, DecisionLinkRow[]>;
		supersedesOptions: { id: string; title: string }[];
		currentUserId: string;
		focusDecisionId?: string | null;
	};

	let {
		decisionsPage,
		teamMembers,
		linkableTargets,
		participantsMap,
		linksMap,
		supersedesOptions,
		currentUserId,
		focusDecisionId = null
	}: Props = $props();

	const { totalCount, perPage, q, sort, statusCounts } = $derived(decisionsPage);

	let decisions = $state<DecisionListRow[]>([]);

	$effect(() => {
		decisions = decisionsPage.decisions;
	});

	const sortOptions = $derived(
		DECISION_SORT_OPTIONS.map((s) => ({ value: s, label: DECISION_SORT_LABELS[s] }))
	);

	let searchInput = $state('');
	let searchDebounce: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		searchInput = q;
	});

	let panelOpen = $state(false);
	let panelMode = $state<'create' | 'view'>('create');
	let activeDecision = $state<DecisionListRow | null>(null);

	function syncDecisionUrl(decisionId: string | null) {
		const url = new URL(page.url);
		if (decisionId) {
			url.searchParams.set('decision', decisionId);
		} else {
			url.searchParams.delete('decision');
		}
		const search = url.searchParams.toString();
		goto(`${url.pathname}${search ? `?${search}` : ''}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function openCreate() {
		panelMode = 'create';
		activeDecision = null;
		panelOpen = true;
		syncDecisionUrl(null);
	}

	function openView(decision: DecisionListRow) {
		panelMode = 'view';
		activeDecision = decision;
		panelOpen = true;
		syncDecisionUrl(decision.id);
	}

	function closePanel() {
		panelOpen = false;
		activeDecision = null;
		syncDecisionUrl(null);
	}

	$effect(() => {
		const id = focusDecisionId;
		if (!id) return;
		if (untrack(() => panelOpen && activeDecision?.id === id)) return;
		const decision = decisions.find((d) => d.id === id);
		if (decision) {
			panelMode = 'view';
			activeDecision = decision;
			panelOpen = true;
		}
	});

	const panelParticipants = $derived(
		activeDecision?.id ? (participantsMap[activeDecision.id] ?? []) : []
	);
	const panelLinks = $derived(activeDecision?.id ? (linksMap[activeDecision.id] ?? []) : []);
	const canEdit = $derived(activeDecision ? activeDecision.authorId === currentUserId : false);

	function navigateList(updates: {
		q?: string;
		sort?: DecisionSort;
		status?: DecisionStatusTab;
		page?: number;
	}) {
		const url = new URL(page.url);

		const nextQ = updates.q !== undefined ? updates.q.trim() : q;
		if (nextQ) {
			url.searchParams.set('q', nextQ);
		} else {
			url.searchParams.delete('q');
		}

		const nextSort = updates.sort ?? sort;
		if (nextSort === 'newest') {
			url.searchParams.delete('sort');
		} else {
			url.searchParams.set('sort', nextSort);
		}

		const nextStatus = updates.status;
		if (nextStatus !== undefined) {
			if (nextStatus === 'all') {
				url.searchParams.delete('status');
			} else {
				url.searchParams.set('status', nextStatus);
			}
		}

		const nextPage = updates.page ?? 1;
		if (nextPage <= 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(nextPage));
		}

		const search = url.searchParams.toString();
		goto(`${url.pathname}${search ? `?${search}` : ''}`, { keepFocus: true, invalidateAll: true });
	}

	function onSearchInput() {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			if (searchInput.trim() === q.trim()) return;
			navigateList({ q: searchInput, page: 1 });
		}, 300);
	}

	function onSortChange(value: string) {
		navigateList({ sort: value as DecisionSort, page: 1 });
	}

	function goToPage(nextPage: number) {
		navigateList({ page: nextPage });
	}

	function onTabClick(tab: DecisionStatusTab) {
		navigateList({ status: tab, page: 1 });
	}

	const currentStatusTab = $derived(
		(() => {
			const s = page.url.searchParams.get('status');
			if (!s || s === 'all') return 'all' as DecisionStatusTab;
			if (DECISION_STATUSES.includes(s as DecisionStatus)) return s as DecisionStatusTab;
			return 'all' as DecisionStatusTab;
		})()
	);

	const tabs = $derived.by(() => {
		const result: { key: DecisionStatusTab; label: string; count: number }[] = [
			{ key: 'all', label: DECISION_STATUS_TAB_LABELS['all'], count: totalCount }
		];
		for (const status of DECISION_STATUSES) {
			result.push({
				key: status,
				label: DECISION_STATUS_TAB_LABELS[status],
				count: statusCounts[status] ?? 0
			});
		}
		return result;
	});

	const currentPage = $derived(decisionsPage.page);
</script>

<div class="mt-6 flex flex-col gap-4">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<Input
			type="search"
			placeholder="Search decisions…"
			bind:value={searchInput}
			oninput={onSearchInput}
			class="max-w-md"
		/>
		<div class="flex flex-wrap items-center gap-2">
			<Select options={sortOptions} value={sort} onValueChange={onSortChange} class="w-44" />
			<ButtonUi type="button" class="h-10 shrink-0" onclick={openCreate}>New decision</ButtonUi>
		</div>
	</div>

	<div class="flex gap-1 overflow-x-auto" role="tablist">
		{#each tabs as tab (tab.key)}
			<button
				type="button"
				role="tab"
				aria-selected={currentStatusTab === tab.key}
				onclick={() => onTabClick(tab.key)}
				class={[
					'rounded-lg px-3 py-1.5 text-sm font-medium transition',
					currentStatusTab === tab.key
						? 'bg-accent-muted text-accent'
						: 'text-ink-muted hover:bg-surface-hover hover:text-ink'
				]}
			>
				{tab.label}
				<span class="ml-1.5 text-xs opacity-70">{tab.count}</span>
			</button>
		{/each}
	</div>

	{#if decisions.length === 0}
		<div class="border-border rounded-xl border border-dashed px-6 py-12 text-center">
			<p class="text-ink text-sm font-medium">No decisions yet</p>
			<p class="text-ink-muted mt-1 text-sm">
				Record what your team decided and why — so context stays discoverable over time.
			</p>
		</div>
	{:else}
		<div class="divide-border border-border divide-y overflow-hidden rounded-xl border">
			{#each decisions as decision (decision.id)}
				<DecisionRow {decision} onClick={() => openView(decision)} />
			{/each}
		</div>

		{#if totalCount > perPage}
			<Pagination
				count={totalCount}
				{perPage}
				page={currentPage}
				onPageChange={goToPage}
				class="mt-2"
			/>
		{/if}
	{/if}
</div>

<DecisionPanel
	bind:open={panelOpen}
	mode={panelMode}
	decision={activeDecision}
	{canEdit}
	participants={panelParticipants}
	links={panelLinks}
	{teamMembers}
	{linkableTargets}
	{supersedesOptions}
	onClose={closePanel}
/>
