<script lang="ts">
	import type { PageData } from './$types';
	import WrkspaceHeader from '$lib/components/wrkspaces/wrkspace-header.svelte';
	import ActivityFeed from '$lib/components/activity/activity-feed.svelte';
	import { MODULE_CATALOG } from '$lib/shared/modules';

	let { data }: { data: PageData } = $props();

	const baseHref = $derived(
		`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}/activity`
	);
</script>

<div>
	<WrkspaceHeader
		name={data.wrkspace.name}
		description={data.wrkspace.description}
		settingsHref="/teams/{data.wrkspace.teamSlug}/wrkspaces/{data.wrkspace.slug}/settings"
		canDelete={data.capabilities?.delete_wrkspace ?? false}
		extraMenuItems={[
			{
				label: 'Dashboard',
				href: `/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}`
			}
		]}
	/>

	<section class="mt-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
			<h2 class="font-display text-xl font-semibold text-ink">Activity</h2>
			<div class="flex flex-wrap gap-2">
				<a
					href={baseHref}
					class="rounded-full px-3 py-1 text-xs font-medium transition {!data.moduleTypeFilter
						? 'bg-accent-muted text-accent'
						: 'border border-border text-ink-muted hover:text-ink'}"
				>
					All
				</a>
				{#each MODULE_CATALOG.filter((m) => m.enabled) as mod (mod.type)}
					<a
						href="{baseHref}?moduleType={mod.type}"
						class="rounded-full px-3 py-1 text-xs font-medium transition {data.moduleTypeFilter ===
						mod.type
							? 'bg-accent-muted text-accent'
							: 'border border-border text-ink-muted hover:text-ink'}"
					>
						{mod.label}
					</a>
				{/each}
			</div>
		</div>

		<div class="rounded-xl border border-border bg-surface-raised px-4">
			<ActivityFeed
				events={data.events}
				teamSlug={data.wrkspace.teamSlug}
				wrkspaceSlug={data.wrkspace.slug}
			/>
		</div>

		{#if data.nextCursor}
			<div class="mt-6 text-center">
				<a
					href="{baseHref}?cursor={data.nextCursor}{data.moduleTypeFilter
						? `&moduleType=${data.moduleTypeFilter}`
						: ''}"
					class="text-sm font-medium text-accent hover:underline"
				>
					Load more
				</a>
			</div>
		{/if}
	</section>
</div>
