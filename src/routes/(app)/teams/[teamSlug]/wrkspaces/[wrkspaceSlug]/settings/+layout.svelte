<script lang="ts">
	import type { LayoutData } from './$types';
	import SettingsNav from '$lib/components/settings/settings-nav.svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a
			href="/teams/{data.access.teamSlug}/wrkspaces/{data.access.wrkspaceSlug}"
			class="text-sm text-ink-muted hover:text-ink"
		>
			← Back to wrkspace
		</a>
		<h1 class="mt-2 font-display text-2xl font-semibold text-ink">Wrkspace settings</h1>
		<p class="mt-1 text-sm text-ink-muted">{data.access.wrkspaceName}</p>
	</div>
	<SettingsNav items={data.navItems} />
	{@render children()}
</div>
