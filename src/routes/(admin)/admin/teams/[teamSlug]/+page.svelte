<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import type { PageData } from './$types';
	import ButtonUi from '$lib/components/ui/button.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let confirmDeleteTeam = $state(false);
	let confirmDeleteWrkspaceId: string | null = $state(null);
</script>

<div class="flex items-start justify-between">
	<div>
		<h1 class="font-display text-2xl font-semibold tracking-tight text-ink">{data.team.name}</h1>
		<p class="mt-1 text-sm text-ink-muted">
			Slug: {data.team.slug} · Created {new Date(data.team.createdAt).toLocaleDateString()}
		</p>
	</div>
	<div>
		{#if confirmDeleteTeam}
			<div class="flex items-center gap-2">
				<form method="post" action="?/deleteTeam" use:enhance>
					<input type="hidden" name="teamId" value={data.team.id} />
					<ButtonUi
						type="submit"
						variant="unstyled"
						class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
					>
						Confirm delete team
					</ButtonUi>
				</form>
				<ButtonUi
					type="button"
					variant="unstyled"
					onclick={() => (confirmDeleteTeam = false)}
					class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
				>
					Cancel
				</ButtonUi>
			</div>
		{:else}
			<ButtonUi
				type="button"
				variant="unstyled"
				onclick={() => (confirmDeleteTeam = true)}
				class="rounded-lg px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-muted"
			>
				Delete team
			</ButtonUi>
		{/if}
	</div>
</div>

{#if form?.message}
	<div
		class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger"
		role="alert"
	>
		{form.message}
	</div>
{/if}

{#if form?.success}
	<div
		class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
		role="status"
	>
		Wrkspace deleted.
	</div>
{/if}

<div class="mt-8">
	<h2 class="font-display text-lg font-semibold text-ink">
		Wrkspaces ({data.wrkspaces.length})
	</h2>

	{#if data.wrkspaces.length === 0}
		<p class="mt-4 text-sm text-ink-muted">No wrkspaces in this team.</p>
	{:else}
		<div class="mt-4 overflow-hidden rounded-xl border border-border bg-surface-raised">
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-surface-muted/50">
					<tr>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Name</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Slug</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Members</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Created by</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Created</th>
						<th class="px-4 py-3 text-right font-medium text-ink-muted">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each data.wrkspaces as w (w.id)}
						<tr>
							<td class="px-4 py-3 font-medium text-ink">{w.name}</td>
							<td class="px-4 py-3 text-ink-muted">{w.slug}</td>
							<td class="px-4 py-3 text-ink-muted">{w.memberCount}</td>
							<td class="px-4 py-3 text-ink-muted">{w.createdByName ?? '—'}</td>
							<td class="px-4 py-3 text-ink-muted">
								{new Date(w.createdAt).toLocaleDateString()}
							</td>
							<td class="px-4 py-3 text-right">
								{#if confirmDeleteWrkspaceId === w.id}
									<div class="flex items-center justify-end gap-2">
										<form method="post" action="?/deleteWrkspace" use:enhance>
											<input type="hidden" name="wrkspaceId" value={w.id} />
											<ButtonUi
												type="submit"
												variant="unstyled"
												class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
											>
												Confirm
											</ButtonUi>
										</form>
										<ButtonUi
											type="button"
											variant="unstyled"
											onclick={() => (confirmDeleteWrkspaceId = null)}
											class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
										>
											Cancel
										</ButtonUi>
									</div>
								{:else}
									<ButtonUi
										type="button"
										variant="unstyled"
										onclick={() => (confirmDeleteWrkspaceId = w.id)}
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
	{/if}
</div>

<div class="mt-8">
	<a
		href="/admin/teams"
		class="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
	>
		Back to teams
	</a>
</div>
