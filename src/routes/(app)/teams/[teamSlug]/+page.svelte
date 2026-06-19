<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import SelectionPage from '$lib/shared/selection-page.svelte';
	import BrandText from '$lib/components/brand/brand-text.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import IconButton from '$lib/components/ui/icon-button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import TemplatePicker from '$lib/components/templates/template-picker.svelte';
	import { BLANK_WRKSPACE_TEMPLATE_ID } from '$lib/shared/templates';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreate = $state(false);
	let templateId = $state(BLANK_WRKSPACE_TEMPLATE_ID);

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
				<TemplatePicker items={data.templates} bind:value={templateId} />
				{#if form?.message}
					<p class="text-sm text-danger" role="alert">{form.message}</p>
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
					<ButtonUi
						href="/teams/{data.team.slug}/wrkspaces/{wrk.slug}"
						variant="unstyled"
						class={listItemClass}
					>
						<span>{wrk.name}</span>
						<span class="text-ink-muted" aria-hidden="true">→</span>
					</ButtonUi>
				</li>
			{/each}
		</ul>
	{/if}
</SelectionPage>
