<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Tooltip from '$lib/components/ui/tooltip.svelte';
	import { textChanged } from '$lib/shared/form-changes';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nameValue = $state('');

	$effect(() => {
		nameValue = data.user.name;
	});

	const canSave = $derived(textChanged(nameValue, data.user.name));
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a href="/teams" class="text-sm text-ink-muted hover:text-ink">← Back to teams</a>
		<h1 class="mt-2 font-display text-2xl font-semibold text-ink">Settings</h1>
		<p class="mt-1 text-sm text-ink-muted">Your account and team memberships.</p>
	</div>

	<SettingsSection title="Profile" description="How you appear across teams and wrkspaces.">
		<form method="POST" action="?/updateProfile" use:enhance class="space-y-4">
			<div>
				<Label for="name">Display name</Label>
				<Input id="name" name="name" bind:value={nameValue} required />
			</div>
			<div>
				<Label for="email">Email</Label>
				<Tooltip text="Email is managed by your sign-in provider and can't be changed here.">
					{#snippet trigger(props)}
						<span {...props} class="block">
							<Input id="email" name="email" value={data.user.email} class="opacity-60" />
						</span>
					{/snippet}
				</Tooltip>
			</div>
			{#if form?.message}
				<p class="text-sm text-red-600" role="alert">{form.message}</p>
			{/if}
			{#if form?.success}
				<p class="text-sm text-accent">Profile updated.</p>
			{/if}
			<ButtonUi type="submit" disabled={!canSave}>Save profile</ButtonUi>
		</form>
	</SettingsSection>

	<SettingsSection title="Account" description="Profile and notification preferences.">
		<ul class="space-y-2">
			<li>
				<a
					href="/settings/notifications"
					class="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-ink transition hover:border-accent/40"
				>
					<span>Notifications</span>
					<span class="text-xs text-ink-muted">In-app subscriptions</span>
				</a>
			</li>
		</ul>
	</SettingsSection>

	<SettingsSection title="Your teams" description="Teams you belong to.">
		<ul class="space-y-2">
			{#each data.teams as team (team.slug)}
				<li>
					<a
						href="/teams/{team.slug}"
						class="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium text-ink transition hover:border-accent/40"
					>
						<span>{team.name}</span>
						<Tooltip text="Your role in {team.name}">
							{#snippet trigger(props)}
								<span {...props} class="text-xs text-ink-muted capitalize">{team.role}</span>
							{/snippet}
						</Tooltip>
					</a>
				</li>
			{/each}
		</ul>
	</SettingsSection>
</div>
