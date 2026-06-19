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

	let { events, teamSlug, wrkspaceSlug, emptyMessage = 'No activity yet.' }: Props = $props();

	function toDisplay(event: SerializedActivityEvent): ActivityEventDisplay {
		return { ...event, createdAt: new Date(event.createdAt) };
	}
</script>

<ul class="divide-border/60 divide-y">
	{#if events.length === 0}
		<li class="text-ink-muted py-8 text-center text-sm">{emptyMessage}</li>
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
					class="hover:bg-surface-hover/80 flex gap-3 py-3 transition"
				>
					<Avatar
						src={event.actorImage}
						alt={event.actorName}
						fallback={initialsFromName(event.actorName)}
					/>
					<div class="min-w-0 flex-1">
						<p class="text-ink text-sm">
							{formatted.summary}
							{#if formatted.highlight}
								<span class="font-medium">{formatted.highlight}</span>
							{/if}
						</p>
						<p class="text-ink-muted mt-0.5 text-xs">
							{formatRelativeTime(new Date(event.createdAt))}
						</p>
					</div>
				</a>
			</li>
		{/each}
	{/if}
</ul>
