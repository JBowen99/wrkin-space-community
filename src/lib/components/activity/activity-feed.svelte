<script lang="ts">
	import Avatar from '../ui/avatar.svelte';
	import { initialsFromName } from '$lib/shared/initials';
	import {
		formatActivitySummary,
		formatRelativeTime,
		type ActivityEventDisplay
	} from '$lib/shared/activity-render';

	export type SerializedActivityEvent = Omit<ActivityEventDisplay, 'createdAt'> & {
		createdAt: string;
	};

	type Props = {
		events: SerializedActivityEvent[];
		teamSlug: string;
		wrkspaceSlug: string;
		emptyMessage?: string;
	};

	let {
		events,
		teamSlug,
		wrkspaceSlug,
		emptyMessage = 'No activity yet.'
	}: Props = $props();

	function toDisplay(event: SerializedActivityEvent): ActivityEventDisplay {
		return { ...event, createdAt: new Date(event.createdAt) };
	}
</script>

<ul class="divide-y divide-border/60">
	{#if events.length === 0}
		<li class="py-8 text-center text-sm text-ink-muted">{emptyMessage}</li>
	{:else}
		{#each events as event (event.id)}
			{@const formatted = formatActivitySummary(toDisplay(event), {
				teamSlug,
				wrkspaceSlug,
				moduleId: event.moduleId
			})}
			<li>
				<a
					href={formatted.href ?? `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/activity`}
					class="flex gap-3 py-3 transition hover:bg-stone-50/80"
				>
					<Avatar
						src={event.actorImage}
						alt={event.actorName}
						fallback={initialsFromName(event.actorName)}
					/>
					<div class="min-w-0 flex-1">
						<p class="text-sm text-ink">
							{formatted.summary}
							{#if formatted.highlight}
								<span class="font-medium">{formatted.highlight}</span>
							{/if}
						</p>
						<p class="mt-0.5 text-xs text-ink-muted">
							{formatRelativeTime(new Date(event.createdAt))}
						</p>
					</div>
				</a>
			</li>
		{/each}
	{/if}
</ul>
