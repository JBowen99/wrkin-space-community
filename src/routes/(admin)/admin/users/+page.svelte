<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import type { PageData } from './$types';
	import AlertDialog from '$lib/components/ui/alert-dialog.svelte';
	import ButtonUi from '$lib/components/ui/button.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let passwordDialogOpen = $state(false);
	let promoteDismissed = $state(false);
	let copied = $state(false);

	let showPromoteNotification = $derived(form?.success && form.promotedUserId && !promoteDismissed);

	$effect(() => {
		if (form?.success && 'newPassword' in form) {
			passwordDialogOpen = true;
			copied = false;
		}
		if (form) {
			promoteDismissed = false;
		}
	});

	async function copyPassword() {
		if (!form?.newPassword) return;
		await navigator.clipboard.writeText(form.newPassword);
		copied = true;
	}
</script>

<h1 class="font-display text-2xl font-semibold tracking-tight text-ink">Users</h1>
<p class="mt-1 text-sm text-ink-muted">
	{data.total} user{data.total !== 1 ? 's' : ''} registered.
</p>

<AlertDialog
	bind:open={passwordDialogOpen}
	title="Password reset"
	description="This password will not be shown again. Copy it now and share it with the user. They can change it in Settings."
	actionLabel="Done"
>
	<div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
		<p class="text-xs font-medium text-blue-600">New password</p>
		<code class="mt-1 block font-mono text-sm font-semibold break-all text-blue-900"
			>{form?.newPassword}</code
		>
	</div>
	<div class="mt-3 flex justify-end">
		<ButtonUi
			type="button"
			variant="unstyled"
			onclick={copyPassword}
			class="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
		>
			{#if copied}
				Copied!
			{:else}
				Copy password
			{/if}
		</ButtonUi>
	</div>
</AlertDialog>

{#if showPromoteNotification}
	<div
		class="mt-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
		role="status"
	>
		<svg
			class="h-4 w-4 shrink-0 text-green-500"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="2"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
			/>
		</svg>
		<span class="flex-1">User promoted to admin.</span>
		<ButtonUi
			type="button"
			variant="unstyled"
			onclick={() => (promoteDismissed = true)}
			class="-m-1 rounded-lg p-1 text-green-400 transition-colors hover:bg-green-100 hover:text-green-600"
			aria-label="Dismiss"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
			</svg>
		</ButtonUi>
	</div>
{/if}

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
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Name</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Email</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Role</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Teams</th>
				<th class="px-4 py-3 text-left font-medium text-ink-muted">Joined</th>
				<th class="px-4 py-3 text-right font-medium text-ink-muted">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border">
			{#each data.users as u (u.id)}
				<tr>
					<td class="px-4 py-3 font-medium text-ink">{u.name}</td>
					<td class="px-4 py-3 text-ink-muted">{u.email}</td>
					<td class="px-4 py-3">
						<span
							class="inline-block rounded-md px-2 py-0.5 text-xs font-medium {u.role === 'admin'
								? 'bg-ink text-white'
								: 'bg-surface-muted text-ink-muted'}"
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
								<ButtonUi
									type="submit"
									variant="unstyled"
									class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
								>
									Reset password
								</ButtonUi>
							</form>
							{#if u.role !== 'admin'}
								<form method="post" action="?/promoteToAdmin" use:enhance>
									<input type="hidden" name="userId" value={u.id} />
									<ButtonUi
										type="submit"
										variant="unstyled"
										class="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
									>
										Make admin
									</ButtonUi>
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
			<ButtonUi href="/admin/users?page={data.page - 1}" variant="ghost" class="h-9 px-3">
				Previous
			</ButtonUi>
		{/if}
		<span class="text-ink-muted">Page {data.page} of {data.totalPages}</span>
		{#if data.page < data.totalPages}
			<ButtonUi href="/admin/users?page={data.page + 1}" variant="ghost" class="h-9 px-3">
				Next
			</ButtonUi>
		{/if}
	</div>
{/if}
