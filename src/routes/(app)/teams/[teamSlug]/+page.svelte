<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from 'bits-ui';
	import SelectionPage from '$lib/shared/selection-page.svelte';
	import BrandText from '$lib/components/brand/brand-text.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import IconButton from '$lib/components/ui/icon-button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreate = $state(false);

	$effect(() => {
		if (form?.message) showCreate = true;
	});

	const controlSizeClass = 'h-11';

	const listItemClass = `flex w-full ${controlSizeClass} items-center justify-between rounded-lg border border-border bg-surface-raised px-4 text-left text-sm font-medium text-ink shadow-sm transition hover:border-accent/40 hover:bg-accent-muted/40`;
</script>

<SelectionPage title="Choose a wrkspace">
	{#snippet headerAction()}
		{#if data.capabilities?.create_wrkspace && !showCreate}
			<IconButton
				label="New wrkspace"
				tooltip="Create a new wrkspace"
				class="{controlSizeClass} w-11"
				onclick={() => (showCreate = true)}
			>
				<span class="text-xl leading-none font-light">+</span>
			</IconButton>
		{/if}
	{/snippet}

	{#if showCreate}
		<Card>
			<form method="POST" action="?/create" use:enhance class="space-y-4">
				<div>
					<Label for="wrkspace-name"><BrandText text="wrkspace name" /></Label>
					<Input id="wrkspace-name" name="name" placeholder="e.g. Q2 Launch" required />
				</div>
				{#if form?.message}
					<p class="text-sm text-red-600" role="alert">{form.message}</p>
				{/if}
				<div class="flex gap-3 pt-1">
					<ButtonUi type="submit" class="flex-1">Create wrkspace</ButtonUi>
					<ButtonUi type="button" variant="secondary" onclick={() => (showCreate = false)}>
						Cancel
					</ButtonUi>
				</div>
			</form>
		</Card>
	{:else if data.wrkspaces.length > 0}
		<ul class="space-y-2">
			{#each data.wrkspaces as wrk (wrk.id)}
				<li>
					<Button.Root href="/teams/{data.team.slug}/wrkspaces/{wrk.slug}" class={listItemClass}>
						<span>{wrk.name}</span>
						<span class="text-ink-muted" aria-hidden="true">→</span>
					</Button.Root>
				</li>
			{/each}
		</ul>
	{/if}
</SelectionPage>
