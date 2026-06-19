<script lang="ts">
	import { Combobox } from 'bits-ui';
	import type { DecisionLinkTargetType } from '$lib/shared/decisions';
	import { DECISION_LINK_TARGET_LABELS, DECISION_LINK_TARGET_TYPES } from '$lib/shared/decisions';
	import type { LinkableTarget } from '$lib/server/decisions';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Delete02Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';

	export type SelectedLink = {
		targetType: DecisionLinkTargetType;
		targetId: string;
		moduleId: string;
		title: string;
		moduleTitle: string;
	};

	type Props = {
		linkableTargets: LinkableTarget[];
		selectedLinks?: SelectedLink[];
	};

	let { linkableTargets, selectedLinks = $bindable<SelectedLink[]>([]) }: Props = $props();

	let filterType = $state<DecisionLinkTargetType | 'all'>('all');
	let searchValue = $state('');

	const comboboxItems = $derived(
		linkableTargets.map((target) => ({
			value: `${target.targetType}:${target.targetId}`,
			label: `${target.title} · ${target.moduleTitle}`
		}))
	);

	const filteredTargets = $derived.by(() => {
		let list = linkableTargets;
		if (filterType !== 'all') {
			list = list.filter((t) => t.targetType === filterType);
		}
		const q = searchValue.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(t) => t.title.toLowerCase().includes(q) || t.moduleTitle.toLowerCase().includes(q)
		);
	});

	const filterPlaceholder = $derived(
		filterType === 'all'
			? 'Search links…'
			: `Search ${DECISION_LINK_TARGET_LABELS[filterType].toLowerCase()}…`
	);

	const selectedKeys = $derived(new Set(selectedLinks.map((l) => `${l.targetType}:${l.targetId}`)));

	function toggle(target: LinkableTarget) {
		const key = `${target.targetType}:${target.targetId}`;
		if (selectedKeys.has(key)) {
			selectedLinks = selectedLinks.filter(
				(l) => !(l.targetType === target.targetType && l.targetId === target.targetId)
			);
		} else {
			selectedLinks = [
				...selectedLinks,
				{
					targetType: target.targetType as DecisionLinkTargetType,
					targetId: target.targetId,
					moduleId: target.moduleId,
					title: target.title,
					moduleTitle: target.moduleTitle
				}
			];
		}
	}

	function removeLink(link: SelectedLink) {
		selectedLinks = selectedLinks.filter(
			(l) => !(l.targetType === link.targetType && l.targetId === link.targetId)
		);
	}

	const inputClass =
		'h-9 w-full rounded-lg border border-border bg-surface-raised py-2 pl-3 pr-10 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none';

	const triggerClass =
		'absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-hover hover:text-ink';

	const itemClass =
		'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-hover data-[highlighted]:bg-surface-muted';

	const filterButtonClass = 'h-7 px-2 text-xs';
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap gap-2" role="group" aria-label="Filter link type">
		<ButtonUi
			type="button"
			variant={filterType === 'all' ? 'primary' : 'secondary'}
			class={filterButtonClass}
			onclick={() => (filterType = 'all')}
		>
			All
		</ButtonUi>
		{#each DECISION_LINK_TARGET_TYPES as t (t)}
			<ButtonUi
				type="button"
				variant={filterType === t ? 'primary' : 'secondary'}
				class={filterButtonClass}
				onclick={() => (filterType = t)}
			>
				{DECISION_LINK_TARGET_LABELS[t]}
			</ButtonUi>
		{/each}
	</div>

	<Combobox.Root
		type="multiple"
		items={comboboxItems}
		onOpenChangeComplete={(open) => {
			if (!open) searchValue = '';
		}}
	>
		<div class="relative">
			<Combobox.Input
				placeholder={filterPlaceholder}
				aria-label="Search links"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
				data-1p-ignore
				data-lpignore="true"
				oninput={(event) => (searchValue = event.currentTarget.value)}
				class={inputClass}
			/>
			<Combobox.Trigger class={triggerClass} aria-label="Show link options">
				<span aria-hidden="true">▾</span>
			</Combobox.Trigger>
		</div>

		<Combobox.Portal>
			<Combobox.Content
				class="border-border bg-surface-raised z-[100] max-h-60 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-y-auto rounded-lg border p-1 shadow-md"
				sideOffset={4}
			>
				{#each filteredTargets as target (target.targetType + target.targetId)}
					{@const key = `${target.targetType}:${target.targetId}`}
					{@const isSelected = selectedKeys.has(key)}
					<button type="button" class={itemClass} onclick={() => toggle(target)}>
						<span class="min-w-0 truncate">
							{target.title}
							<span class="text-ink-muted"> · {target.moduleTitle}</span>
						</span>
						{#if isSelected}
							<span class="text-accent shrink-0" aria-hidden="true">✓</span>
						{/if}
					</button>
				{:else}
					<p class="text-ink-muted px-3 py-2 text-sm">No linkable items in this wrkspace.</p>
				{/each}
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>

	{#if selectedLinks.length > 0}
		<ul class="flex flex-col gap-1.5">
			{#each selectedLinks as link (link.targetType + link.targetId)}
				<li class="border-border bg-surface-raised flex items-center gap-2 rounded-lg border px-3 py-2">
					<div class="min-w-0 flex-1">
						<span
							class="bg-surface-muted text-ink-muted mb-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
						>
							{DECISION_LINK_TARGET_LABELS[link.targetType]}
						</span>
						<div class="min-w-0 truncate text-sm">
							<span class="text-ink font-medium">{link.title}</span>
							<span class="text-ink-muted text-xs"> · {link.moduleTitle}</span>
						</div>
					</div>
					<IconButton
						label="Remove link to {link.title}"
						size="md"
						variant="destructive"
						onclick={() => removeLink(link)}
					>
						<HugeiconsIcon
							icon={Delete02Icon}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</IconButton>
				</li>
			{/each}
		</ul>
	{/if}
</div>
