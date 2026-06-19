<script lang="ts">
	import type { TaskBacklinkRow } from '$lib/server/tasks';
	import ButtonUi from '../../ui/button.svelte';

	type Props = {
		backlinks: TaskBacklinkRow[];
	};

	let { backlinks }: Props = $props();

	const sourceLabels: Record<TaskBacklinkRow['sourceType'], string> = {
		decision: 'Decision',
		task: 'Task',
		okr: 'OKR key result'
	};
</script>

{#if backlinks.length > 0}
	<ul class="flex flex-col gap-1.5">
		{#each backlinks as link (link.sourceType + link.sourceId)}
			<li class="border-border bg-surface/50 rounded-lg border px-3 py-2 text-sm">
				<span class="text-ink-muted">{sourceLabels[link.sourceType]}</span>
				<span aria-hidden="true"> · </span>
				<ButtonUi href={link.href} variant="link" class="inline h-auto min-h-0 p-0 text-sm">
					{link.title}
				</ButtonUi>
				<span class="text-ink-muted"> ({link.moduleTitle})</span>
			</li>
		{/each}
	</ul>
{/if}
