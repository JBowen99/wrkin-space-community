<script lang="ts">
	import type { PageData } from './$types';
	import SelectionPage from '$lib/shared/selection-page.svelte';
	import { Button } from 'bits-ui';

	let { data }: { data: PageData } = $props();
</script>

<SelectionPage title="Choose a team">
	{#if data.teams.length > 0}
		<ul class="space-y-2">
			{#each data.teams as team (team.id)}
				<li>
					<Button.Root
						href="/teams/{team.slug}"
						class="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-surface-raised px-4 text-left text-sm font-medium text-ink shadow-sm transition hover:border-accent/40 hover:bg-accent-muted/40"
					>
						<span>{team.name}</span>
						<span class="text-ink-muted" aria-hidden="true">→</span>
					</Button.Root>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-ink-muted">No teams found.</p>
	{/if}
</SelectionPage>
