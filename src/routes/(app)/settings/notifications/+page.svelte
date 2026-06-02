<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox.svelte';
	import Label from '$lib/components/ui/label.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let prefs = $state<{ category: PageData['preferences'][number]['category']; enabled: boolean }[]>(
		[]
	);

	$effect(() => {
		prefs = data.preferences.map((p) => ({ category: p.category, enabled: p.enabled }));
	});
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a href="/settings" class="text-sm text-ink-muted hover:text-ink">← Back to settings</a>
		<h1 class="mt-2 font-display text-2xl font-semibold text-ink">Notifications</h1>
		<p class="mt-1 text-sm text-ink-muted">
			Choose which types of activity send you in-app notifications.
		</p>
	</div>

	<SettingsSection
		title="Subscriptions"
		description="Activity is always logged in your wrkspaces. These settings control what appears in your notification inbox."
	>
		<form method="POST" action="?/updatePreferences" use:enhance class="space-y-4">
			{#each prefs as pref, index (pref.category)}
				{@const meta = data.labels[pref.category]}
				<div class="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
					<Checkbox
						id="category-{pref.category}"
						name="category:{pref.category}"
						checked={pref.enabled}
						value="on"
						onCheckedChange={(checked) => {
							prefs[index].enabled = checked;
						}}
					/>
					<div class="min-w-0 flex-1">
						<Label for="category-{pref.category}" class="font-medium text-ink">
							{meta.label}
						</Label>
						<p class="mt-0.5 text-sm text-ink-muted">{meta.description}</p>
					</div>
				</div>
			{/each}

			{#if form?.success}
				<p class="text-sm text-accent">Preferences saved.</p>
			{/if}

			<ButtonUi type="submit">Save preferences</ButtonUi>
		</form>
	</SettingsSection>
</div>
