<script lang="ts">
	import { enhance } from '$app/forms';
	import SettingsSection from './settings-section.svelte';
	import ButtonUi from '../ui/button.svelte';
	import Label from '../ui/label.svelte';
	import PasswordInput from '../ui/password-input.svelte';

	type Props = {
		form?: {
			passwordError?: string | undefined;
			passwordSuccess?: boolean | undefined;
		} | null;
	};

	let { form }: Props = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	const canChangePassword = $derived(
		currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0
	);
</script>

<SettingsSection title="Password" description="Change your account password.">
	<form method="POST" action="?/changePassword" use:enhance class="space-y-4">
		<div>
			<Label for="currentPassword">Current password</Label>
			<PasswordInput id="currentPassword" name="currentPassword" bind:value={currentPassword} required />
		</div>
		<div>
			<Label for="newPassword">New password</Label>
			<PasswordInput id="newPassword" name="newPassword" bind:value={newPassword} required />
		</div>
		<div>
			<Label for="confirmPassword">Confirm new password</Label>
			<PasswordInput id="confirmPassword" name="confirmPassword" bind:value={confirmPassword} required />
		</div>
		{#if form?.passwordError}
			<p class="text-sm text-red-600" role="alert">{form.passwordError}</p>
		{/if}
		{#if form?.passwordSuccess}
			<p class="text-sm text-accent">Password updated successfully.</p>
		{/if}
		<ButtonUi type="submit" disabled={!canChangePassword}>Update password</ButtonUi>
	</form>
</SettingsSection>
