<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings01Icon } from '@hugeicons/core-free-icons';
	import {
		getSubscriptionTierLabel,
		SUBSCRIPTION_TIER_CHIP_CLASS,
		type SubscriptionTier
	} from '$lib/shared/pricing';
	import SelectionPage from '$lib/shared/selection-page.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import IconButton from '$lib/components/ui/icon-button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Tooltip from '$lib/components/ui/tooltip.svelte';

	const tierDescriptions: Record<SubscriptionTier, string> = {
		personal: 'Personal plan — solo use, limited features.',
		plus: 'Plus plan — invite teammates, more wrkspaces.',
		pro: 'Pro plan — unlimited wrkspaces and advanced limits.'
	};

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreate = $state(false);

	$effect(() => {
		if (form?.message) showCreate = true;
	});

	const controlSizeClass = 'h-11';

	const listItemClass = `flex w-full ${controlSizeClass} items-center justify-between rounded-lg border border-border bg-surface-raised px-4 text-left text-sm font-medium text-ink shadow-sm transition hover:border-accent/40 hover:bg-accent-muted/40`;

	const addButtonClass = `flex ${controlSizeClass} w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-xl font-light text-ink-muted transition hover:border-accent/50 hover:bg-accent-muted/40 hover:text-accent`;

	const tierChipClass = (tier: SubscriptionTier) =>
		`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${SUBSCRIPTION_TIER_CHIP_CLASS[tier]}`;
</script>

<SelectionPage title="Choose a team">
	{#snippet headerAction()}
		{#if !showCreate}
			<Tooltip text="Create a new team">
				{#snippet trigger(props)}
					<ButtonUi
						{...props}
						type="button"
						variant="unstyled"
						class={addButtonClass}
						aria-label="New team"
						onclick={() => (showCreate = true)}
					>
						+
					</ButtonUi>
				{/snippet}
			</Tooltip>
		{/if}
	{/snippet}

	{#if showCreate}
		<Card>
			<form method="POST" action="?/create" use:enhance class="space-y-4">
				<div>
					<Label for="team-name">Team name</Label>
					<Input id="team-name" name="name" placeholder="e.g. Acme Co" required />
				</div>
				{#if form?.message}
					<p class="text-sm text-danger" role="alert">{form.message}</p>
				{/if}
				<div class="flex gap-3 pt-1">
					<ButtonUi type="submit" class="flex-1">Create team</ButtonUi>
					<ButtonUi type="button" variant="secondary" onclick={() => (showCreate = false)}>
						Cancel
					</ButtonUi>
				</div>
			</form>
		</Card>
	{:else if data.teams.length > 0}
		<ul class="space-y-2">
			{#each data.teams as team (team.id)}
				<li class="flex items-center gap-2">
					<ButtonUi href="/teams/{team.slug}" variant="unstyled" class="{listItemClass} flex-1">
						<span>{team.name}</span>
						<span class="flex items-center gap-2">
							<Tooltip text={tierDescriptions[team.subscriptionTier]}>
								{#snippet trigger(props)}
									<span {...props} class={tierChipClass(team.subscriptionTier)}>
										{getSubscriptionTierLabel(team.subscriptionTier)}
									</span>
								{/snippet}
							</Tooltip>
							<span class="text-ink-muted" aria-hidden="true">→</span>
						</span>
					</ButtonUi>
					{#if team.capabilities.manage_team}
						<IconButton
							href="/teams/{team.slug}/settings"
							label="{team.name} settings"
							tooltip="Team settings"
							variant="default"
							size="lg"
						>
							<HugeiconsIcon
								icon={Settings01Icon}
								color="currentColor"
								strokeWidth={2}
								aria-hidden={true}
							/>
						</IconButton>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</SelectionPage>
