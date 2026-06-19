<script lang="ts">
	import ActivityFeed, { type SerializedActivityEvent } from '../activity/activity-feed.svelte';

	type Props = {
		events: SerializedActivityEvent[];
		teamSlug: string;
		wrkspaceSlug: string;
		activityHref: string;
	};

	let { events, teamSlug, wrkspaceSlug, activityHref }: Props = $props();
</script>

<section class="mt-12">
	<div class="mb-4 flex items-center justify-between gap-4">
		<h2 class="font-display text-ink text-lg font-semibold">Recent activity</h2>
		<a href={activityHref} class="text-accent text-sm hover:underline">View all</a>
	</div>
	<div class="border-border bg-surface-raised rounded-xl border px-4">
		<ActivityFeed {events} {teamSlug} {wrkspaceSlug} />
	</div>
</section>
