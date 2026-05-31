<script lang="ts">
	import type { LayoutData } from './$types';
	import SettingsNav from '$lib/components/settings/settings-nav.svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a href="/teams/{data.teamSlug}" class="text-sm text-ink-muted hover:text-ink">
			← Back to team
		</a>
		<h1 class="mt-2 font-display text-2xl font-semibold text-ink">Team settings</h1>
		<p class="mt-1 text-sm text-ink-muted">{data.membership.teamName}</p>
	</div>
	<SettingsNav items={data.navItems} />
	{@render children()}
</div>
