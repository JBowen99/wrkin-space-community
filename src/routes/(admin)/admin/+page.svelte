<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1 class="font-display text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
<p class="mt-1 text-sm text-ink-muted">Overview of your self-hosted wrkin.space instance.</p>

<div class="mt-8 grid gap-4 sm:grid-cols-3">
	<div class="rounded-2xl border border-border bg-white p-6">
		<p class="text-sm font-medium text-ink-muted">Users</p>
		<p class="mt-1 font-display text-3xl font-semibold text-ink">{data.stats.userCount}</p>
	</div>
	<div class="rounded-2xl border border-border bg-white p-6">
		<p class="text-sm font-medium text-ink-muted">Teams</p>
		<p class="mt-1 font-display text-3xl font-semibold text-ink">{data.stats.teamCount}</p>
	</div>
	<div class="rounded-2xl border border-border bg-white p-6">
		<p class="text-sm font-medium text-ink-muted">Wrkspaces</p>
		<p class="mt-1 font-display text-3xl font-semibold text-ink">{data.stats.wrkspaceCount}</p>
	</div>
</div>

{#if data.recentUsers.length > 0}
	<div class="mt-10">
		<h2 class="font-display text-lg font-semibold text-ink">Recent users</h2>
		<div class="mt-4 overflow-hidden rounded-xl border border-border bg-white">
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-stone-50/50">
					<tr>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Name</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Email</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Role</th>
						<th class="px-4 py-3 text-left font-medium text-ink-muted">Joined</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each data.recentUsers as u}
						<tr>
							<td class="px-4 py-3 text-ink">{u.name}</td>
							<td class="px-4 py-3 text-ink-muted">{u.email}</td>
							<td class="px-4 py-3">
								<span
									class="inline-block rounded-md px-2 py-0.5 text-xs font-medium {u.role ===
									'admin'
										? 'bg-ink text-white'
										: 'bg-stone-100 text-ink-muted'}"
								>
									{u.role}
								</span>
							</td>
							<td class="px-4 py-3 text-ink-muted">
								{new Date(u.createdAt).toLocaleDateString()}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="mt-3 text-center">
			<a href="/admin/users" class="text-sm font-medium text-ink-muted hover:text-ink"
				>View all users</a
			>
		</div>
	</div>
{/if}
