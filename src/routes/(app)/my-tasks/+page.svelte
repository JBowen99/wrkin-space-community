<script lang="ts">
	import type { PageData } from './$types';
	import MyTasksPage from '$lib/components/modules/tasks/my-tasks-page.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>My Tasks · wrkin.space</title>
	<meta name="description" content="Tasks assigned to you across all wrkspaces" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<MyTasksPage tasks={data.tasks} wrkspaces={data.wrkspaces} />
