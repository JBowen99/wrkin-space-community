<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let newPasswordFor: string | null = $state(null);
	let newPasswordValue: string | null = $state(null);

	function showNewPassword(userId: string, password: string) {
		newPasswordFor = userId;
		newPasswordValue = password;
	}

	function dismissPassword() {
		newPasswordFor = null;
		newPasswordValue = null;
	}
</script>

<h1 class="font-display text-2xl font-semibold tracking-tight text-ink">Users</h1>
<p class="mt-1 text-sm text-ink-muted">
	{data.total} user{data.total !== 1 ? 's' : ''} registered.
</p>

{#if form?.success && 'newPassword' in form}
	<div
		class="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
		role="alert"
	>
		<div class="flex-1">
			<p class="font-medium">Password reset successfully</p>
			<p class="mt-1">
				New password for this user:
				<code class="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900"
					>{form.newPassword}</code
				>
			</p>
			<p class="mt-1 text-amber-600">Share this with the user. They can change it in Settings.</p>
		</div>
		<button onclick={dismissPassword} class="text-amber-600 hover:text-amber-800">Dismiss</button>
	</div>
{/if}

{#if form?.success && form.promotedUserId}
	<div
		class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
		role="status"
	>
		User promoted to admin.
	</div>
{/if}

{#if form?.message}
	<div
		class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
		role="alert"
	>
		{form.message}
	</div>
{/if}

<div class="mt-6 overflow-hidden rounded-xl border border-border bg-white">
	<table class="w-full text-sm">
		<thead class="border-b border-border bg-stone-50/50">
			<tr>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Name</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Email</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Role</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Teams</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Joined</th>
				<th class="px-4 py-3 text-right font-medium text-ink-muted">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border">
			{#each data.users as u}
				<tr>
					<td class="px-4 py-3 font-medium text-ink">{u.name}</td>
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
					<td class="px-4 py-3 text-ink-muted">{u.teamCount}</td>
					<td class="px-4 py-3 text-ink-muted">
						{new Date(u.createdAt).toLocaleDateString()}
					</td>
					<td class="px-4 py-3 text-right">
						<div class="flex items-center justify-end gap-2">
							<form method="post" action="?/resetPassword" use:enhance>
								<input type="hidden" name="userId" value={u.id} />
								<button
									type="submit"
									class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-stone-100 hover:text-ink"
								>
									Reset password
								</button>
							</form>
							{#if u.role !== 'admin'}
								<form method="post" action="?/promoteToAdmin" use:enhance>
									<input type="hidden" name="userId" value={u.id} />
									<button
										type="submit"
										class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-stone-100 hover:text-ink"
									>
										Make admin
									</button>
								</form>
							{/if}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if data.totalPages > 1}
	<div class="mt-4 flex items-center justify-center gap-2 text-sm">
		{#if data.page > 1}
			<a
				href="/admin/users?page={data.page - 1}"
				class="rounded-lg px-3 py-1.5 font-medium text-ink-muted hover:bg-stone-100 hover:text-ink"
				>Previous</a
			>
		{/if}
		<span class="text-ink-muted"
			>Page {data.page} of {data.totalPages}</span
		>
		{#if data.page < data.totalPages}
			<a
				href="/admin/users?page={data.page + 1}"
				class="rounded-lg px-3 py-1.5 font-medium text-ink-muted hover:bg-stone-100 hover:text-ink"
				>Next</a
			>
		{/if}
	</div>
{/if}
