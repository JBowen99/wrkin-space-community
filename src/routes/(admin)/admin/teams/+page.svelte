<script lang="ts">
	import ButtonUi from '$lib/components/ui/button.svelte';
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let confirmDeleteId: string | null = $state(null);

	function askDelete(teamId: string) {
		confirmDeleteId = teamId;
	}

	function cancelDelete() {
		confirmDeleteId = null;
	}
</script>

<h1 class="font-display text-2xl font-semibold tracking-tight text-ink">Teams</h1>
<p class="mt-1 text-sm text-ink-muted">
	{data.teams.length} team{data.teams.length !== 1 ? 's' : ''} across your instance.
</p>

{#if form?.message}
	<div
		class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
		role="alert"
	>
		{form.message}
	</div>
{/if}

<div class="mt-6 overflow-hidden rounded-xl border border-border bg-surface-raised">
	<table class="w-full text-sm">
		<thead class="border-b border-border bg-surface-muted/50">
			<tr>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Team</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Owner</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Members</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Wrkspaces</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Created</th>
				<th class="px-4 py-3 text-right font-medium text-ink-muted">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border">
			{#each data.teams as t (t.id)}
				<tr>
					<td class="px-4 py-3">
						<a href="/admin/teams/{t.id}" class="font-medium text-ink hover:underline">
							{t.name}
						</a>
						<span class="ml-2 text-ink-muted">({t.slug})</span>
					</td>
					<td class="px-4 py-3 text-ink-muted">
						{t.ownerName ?? '—'}
						{#if t.ownerEmail}
							<span class="block text-xs">{t.ownerEmail}</span>
						{/if}
					</td>
					<td class="px-4 py-3 text-ink-muted">{t.memberCount}</td>
					<td class="px-4 py-3 text-ink-muted">{t.wrkspaceCount}</td>
					<td class="px-4 py-3 text-ink-muted">
						{new Date(t.createdAt).toLocaleDateString()}
					</td>
					<td class="px-4 py-3 text-right">
						{#if confirmDeleteId === t.id}
							<div class="flex items-center justify-end gap-2">
								<form method="post" action="?/deleteTeam" use:enhance>
									<input type="hidden" name="teamId" value={t.id} />
									<ButtonUi
										type="submit"
										variant="unstyled"
										class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
									>
										Confirm delete
									</ButtonUi>
								</form>
								<ButtonUi
									type="button"
									variant="unstyled"
									onclick={cancelDelete}
									class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
								>
									Cancel
								</ButtonUi>
							</div>
						{:else}
							<ButtonUi
								type="button"
								variant="unstyled"
								onclick={() => askDelete(t.id)}
								class="rounded-lg px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-muted"
							>
								Delete
							</ButtonUi>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
