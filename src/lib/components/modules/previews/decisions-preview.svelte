<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import {
		DECISION_STATUS_LABELS,
		isDecisionStatus,
		type DecisionStatus
	} from '$lib/shared/decisions';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'decisions' }>;
	};

	let { preview }: Props = $props();

	function decisionStatus(value: string): DecisionStatus {
		return isDecisionStatus(value) ? value : 'accepted';
	}

	function statusClass(status: DecisionStatus): string {
		if (status === 'accepted')
			return 'bg-success-muted text-success dark:bg-emerald-900/20 dark:text-emerald-400';
		if (status === 'deprecated') return 'bg-warning-muted text-warning';
		return 'bg-surface-muted text-ink-muted';
	}
</script>

{#if preview.totalCount === 0}
	<PreviewSkeleton variant="decisions" />
{:else}
	<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
		{#if preview.draftCount > 0 || preview.acceptedCount > 0}
			<div class="mb-2 flex shrink-0 flex-wrap gap-1.5">
				{#if preview.draftCount > 0}
					<p
						class="bg-surface-muted text-ink-muted inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium"
					>
						{preview.draftCount} draft{preview.draftCount === 1 ? '' : 's'}
					</p>
				{/if}
				{#if preview.acceptedCount > 0}
					<p
						class="bg-success-muted text-success inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium dark:bg-emerald-900/20 dark:text-emerald-400"
					>
						{preview.acceptedCount} accepted
					</p>
				{/if}
			</div>
		{/if}

		{#if preview.recent.length > 0}
			<ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
				{#each preview.recent as item, index (index)}
					{@const status = decisionStatus(item.status)}
					<li
						class="border-border/80 bg-surface-raised min-w-0 rounded-lg border px-2.5 py-2 text-xs leading-snug shadow-sm"
						aria-hidden="true"
					>
						<div class="flex min-w-0 items-center gap-1.5">
							<p class="text-ink min-w-0 flex-1 truncate font-medium">{item.title}</p>
							<span
								class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium {statusClass(
									status
								)}"
							>
								{DECISION_STATUS_LABELS[status]}
							</span>
						</div>
						{#if item.summary}
							<p class="text-ink-muted mt-1 line-clamp-2 text-[11px] leading-snug">
								{item.summary}
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
