<script lang="ts">
	import type { PageData } from './$types';
	import WrkspaceHeader from '$lib/components/wrkspaces/wrkspace-header.svelte';
	import ModuleGrid from '$lib/components/modules/module-grid.svelte';
	import RecentActivity from '$lib/components/activity/recent-activity.svelte';
	import ModulePickerDialog from '$lib/components/modules/module-picker-dialog.svelte';

	let { data }: { data: PageData } = $props();

	const moduleHref = (moduleId: string) =>
		`/teams/${data.wrkspace.teamSlug}/wrkspaces/${data.wrkspace.slug}/modules/${moduleId}`;
</script>

<div>
	<WrkspaceHeader
		name={data.wrkspace.name}
		description={data.wrkspace.description}
		settingsHref="/teams/{data.wrkspace.teamSlug}/wrkspaces/{data.wrkspace.slug}/settings"
		canDelete={data.capabilities?.delete_wrkspace ?? false}
	/>

	<section class="mt-10">
		<h2 class="sr-only">Modules</h2>
		<ModuleGrid modules={data.modules} {moduleHref} modulePicker={ModulePickerDialog} />
	</section>

	<RecentActivity
		events={data.recentActivity}
		teamSlug={data.wrkspace.teamSlug}
		wrkspaceSlug={data.wrkspace.slug}
		activityHref="/teams/{data.wrkspace.teamSlug}/wrkspaces/{data.wrkspace.slug}/activity"
	/>
</div>
