<script lang="ts">
	import type { DecisionListRow } from '$lib/server/decisions';
	import DecisionStatusBadge from './decision-status-badge.svelte';

	type Props = {
		decision: DecisionListRow;
		onClick: () => void;
	};

	let { decision, onClick }: Props = $props();

	function formatRelative(date: Date): string {
		const diffMs = date.getTime() - Date.now();
		const diffSec = Math.round(diffMs / 1000);
		const absSec = Math.abs(diffSec);
		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

		if (absSec < 60) return rtf.format(diffSec, 'second');
		const diffMin = Math.round(diffSec / 60);
		if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
		const diffHr = Math.round(diffMin / 60);
		if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
		const diffDay = Math.round(diffHr / 24);
		if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
		const diffMonth = Math.round(diffDay / 30);
		return rtf.format(diffMonth, 'month');
	}

	const metaParts = $derived.by(() => {
		const parts: string[] = [decision.authorName];
		if (decision.participantCount > 0) {
			parts.push(
				`${decision.participantCount} participant${decision.participantCount === 1 ? '' : 's'}`
			);
		}
		if (decision.linkCount > 0) {
			parts.push(`${decision.linkCount} link${decision.linkCount === 1 ? '' : 's'}`);
		}
		parts.push(formatRelative(decision.updatedAt));
		return parts;
	});
</script>

<button
	type="button"
	onclick={onClick}
	class="group hover:bg-surface-hover flex w-full px-4 py-3 text-left transition"
>
	<div class="flex flex-wrap items-center gap-2">
		<h3 class="text-ink group-hover:text-accent min-w-0 flex-1 truncate text-sm font-medium">{decision.title}</h3>
		<DecisionStatusBadge status={decision.status} />
	</div>
	{#if decision.summary}
		<p class="text-ink-muted mt-1 line-clamp-1 text-sm leading-relaxed">{decision.summary}</p>
	{/if}
	<div class="text-ink-muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
		{#each metaParts as part, i (i)}
			{#if i > 0}<span aria-hidden="true" class="opacity-40">&middot;</span>{/if}
			<span>{part}</span>
		{/each}
	</div>
</button>
