<script lang="ts">
	import Avatar from '../../ui/avatar.svelte';
	import type { TaskAssigneeRow } from '$lib/server/tasks';

	type Props = {
		assignees: TaskAssigneeRow[];
		max?: number;
		class?: string;
	};

	let { assignees, max = 4, class: className = '' }: Props = $props();

	const visible = $derived(assignees.slice(0, max));
	const overflow = $derived(Math.max(0, assignees.length - max));

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	}
</script>

{#if assignees.length > 0}
	<div class="flex items-center -space-x-1.5 {className}">
		{#each visible as assignee (assignee.userId)}
			<Avatar
				src={assignee.image}
				alt={assignee.name}
				fallback={initials(assignee.name)}
				class="ring-surface-raised size-6 ring-2"
			/>
		{/each}
		{#if overflow > 0}
			<span
				class="bg-surface-inset text-ink-muted ring-surface-raised flex size-6 items-center justify-center rounded-full text-[10px] font-medium ring-2"
			>
				+{overflow}
			</span>
		{/if}
	</div>
{/if}
