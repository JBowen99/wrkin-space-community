<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import DialogUi from '$lib/components/ui/dialog.svelte';
	import IconButton from '$lib/components/ui/icon-button.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Copy01Icon,
		CheckmarkCircle02Icon,
		Delete01Icon,
		AiChat01Icon
	} from '@hugeicons/core-free-icons';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let newKeyName = $state('');
	let revealOpen = $state(false);
	let revealedKey = $state<{ name: string | null; key: string } | null>(null);
	let copied = $state(false);
	let pendingRevokeId = $state<string | null>(null);
	let revoking = $state(false);

	let apiKeys = $state(data.apiKeys);

	$effect(() => {
		apiKeys = data.apiKeys;
	});

	$effect(() => {
		if (form?.created) {
			revealedKey = { name: form.created.name, key: form.created.key };
			revealOpen = true;
			newKeyName = '';
		}
		if (form?.revokedId) {
			apiKeys = apiKeys.filter((k) => k.id !== form!.revokedId);
			pendingRevokeId = null;
		}
	});

	function displayKey(start: string | null, prefix: string | null): string {
		if (start) return `${start}••••`;
		if (prefix) return `${prefix}••••`;
		return '••••';
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function copyRevealed() {
		if (!revealedKey) return;
		try {
			await navigator.clipboard.writeText(revealedKey.key);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// clipboard unavailable
		}
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div>
		<a href="/settings" class="text-sm text-ink-muted hover:text-ink">← Settings</a>
		<h1 class="mt-2 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
			<HugeiconsIcon icon={AiChat01Icon} size={22} color="currentColor" strokeWidth={2} />
			API Keys
		</h1>
		<p class="mt-1 text-sm text-ink-muted">
			Create keys so external AI tools (Claude, Codex, Opencode) and scripts can access your
			workspaces on your behalf.
		</p>
	</div>

	<SettingsSection
		title="Create a key"
		description="The full key is shown only once — copy it somewhere safe."
	>
		<form method="POST" action="?/createKey" use:enhance class="flex items-end gap-3">
			<div class="flex-1">
				<Label for="name">Label (optional)</Label>
				<Input id="name" name="name" placeholder="e.g. Claude Code" bind:value={newKeyName} />
			</div>
			<ButtonUi type="submit">
				<HugeiconsIcon icon={Copy01Icon} size={16} color="currentColor" strokeWidth={2} />
				Create key
			</ButtonUi>
		</form>
	</SettingsSection>

	<SettingsSection title="Your keys" description="Keys act as your account when used.">
		{#if apiKeys.length === 0}
			<p class="text-sm text-ink-muted">No API keys yet.</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each apiKeys as key (key.id)}
					<li class="flex items-center justify-between gap-4 py-3">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-ink">
								{key.name ?? 'Unnamed key'}
							</p>
							<p class="font-mono text-xs text-ink-muted">
								{displayKey(key.start, key.prefix)} · created {formatDate(key.createdAt)}
								{#if key.expiresAt}
									· expires {formatDate(key.expiresAt)}
								{/if}
								{#if !key.enabled}
									· <span class="text-danger">disabled</span>
								{/if}
							</p>
						</div>
						{#if pendingRevokeId === key.id}
							<form
								method="POST"
								action="?/revokeKey"
								use:enhance={() => {
									revoking = true;
									return async ({ update }) => {
										await update();
										revoking = false;
									};
								}}
								class="flex items-center gap-2"
							>
								<input type="hidden" name="keyId" value={key.id} />
								<span class="text-xs text-danger">Revoke?</span>
								<ButtonUi type="submit" disabled={revoking}>Yes, revoke</ButtonUi>
								<ButtonUi type="button" variant="secondary" onclick={() => (pendingRevokeId = null)}
									>Cancel</ButtonUi
								>
							</form>
						{:else}
							<IconButton
								label="Revoke key"
								size="sm"
								variant="subtle"
								onclick={() => (pendingRevokeId = key.id)}
							>
								<HugeiconsIcon icon={Delete01Icon} size={16} color="currentColor" strokeWidth={2} />
							</IconButton>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</SettingsSection>
</div>

<DialogUi bind:open={revealOpen} title="API key created" size="lg">
	{#if revealedKey}
		<div class="space-y-3">
			<p class="text-sm text-ink-muted">
				Copy this key now. For security, it won't be shown again.
			</p>
			<div class="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
				<code class="flex-1 font-mono text-sm break-all text-ink">{revealedKey.key}</code>
				<ButtonUi variant="secondary" onclick={copyRevealed}>
					{#if copied}
						<HugeiconsIcon
							icon={CheckmarkCircle02Icon}
							size={16}
							color="currentColor"
							strokeWidth={2}
						/>
						Copied
					{:else}
						<HugeiconsIcon icon={Copy01Icon} size={16} color="currentColor" strokeWidth={2} />
						Copy
					{/if}
				</ButtonUi>
			</div>
			<div class="flex justify-end">
				<ButtonUi onclick={() => (revealOpen = false)}>Done</ButtonUi>
			</div>
		</div>
	{/if}
</DialogUi>
