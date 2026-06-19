<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';
	import BrandMark from '$lib/components/brand/brand-mark.svelte';
	import BrandText from '$lib/components/brand/brand-text.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import PasswordInput from '$lib/components/ui/password-input.svelte';
	import { VERSION } from '$lib/version';

	let { form }: { form: ActionData } = $props();
	let mode = $state<'login' | 'signup'>('login');
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let errorForMode = $state<'login' | 'signup' | null>(null);

	const loginErrorText = $derived(
		errorForMode === 'login' && errorMessage
			? errorMessage
			: form?.action === 'login' && form?.message
				? form.message
				: null
	);
	const signupErrorText = $derived(
		errorForMode === 'signup' && errorMessage
			? errorMessage
			: form?.action === 'signup' && form?.message
				? form.message
				: null
	);
	const hasLoginError = $derived(mode === 'login' && !!loginErrorText);
	const hasSignupError = $derived(mode === 'signup' && !!signupErrorText);

	function clearAuthError() {
		errorMessage = null;
		errorForMode = null;
	}

	function messageFromResult(data: unknown, fallback: string): string {
		if (
			typeof data === 'object' &&
			data !== null &&
			'message' in data &&
			typeof data.message === 'string' &&
			data.message
		) {
			return data.message;
		}
		return fallback;
	}

	const enhanceForm: SubmitFunction = () => {
		const submitMode = mode;
		submitting = true;
		clearAuthError();

		return async ({ result, update }) => {
			if (result.type === 'failure') {
				const data = result.data as { action?: string; message?: string } | undefined;
				errorForMode =
					data?.action === 'login' || data?.action === 'signup' ? data.action : submitMode;
				errorMessage = messageFromResult(
					result.data,
					submitMode === 'login' ? 'Invalid email or password' : 'Could not create account'
				);
			} else if (result.type === 'error') {
				errorForMode = submitMode;
				errorMessage = 'Something went wrong. Please try again.';
			}

			await update();
			submitting = false;
		};
	};

	const inputClass =
		'mt-2 border-transparent bg-surface-muted px-4 py-3 focus:border-accent focus:ring-accent/20';
	const passwordFieldClass =
		'border-transparent bg-surface-muted px-4 py-3 focus:border-accent focus:ring-accent/20';
	const inputErrorClass = 'border-danger bg-danger-muted focus:border-danger focus:ring-danger/20';
</script>

<svelte:head>
	<title>Log in · wrkin.space</title>
	<meta name="description" content="Sign in to wrkin.space" />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-surface-muted p-4 sm:p-6">
	<div
		class="flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-surface-muted shadow-xl ring-1 ring-border/60 lg:min-h-[36rem] lg:flex-row"
	>
		<!-- Form panel -->
		<div class="flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 sm:py-12 lg:px-14 lg:py-14">
			<div class="mx-auto w-full max-w-md lg:mx-0">
				<p class="mb-6">
					<a
						href="/"
						class="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
					>
						<span aria-hidden="true">←</span>
						Back to home
					</a>
				</p>
				<h1 class="font-display text-4xl font-semibold tracking-tight text-ink">
					{#if mode === 'login'}
						Log in to <BrandMark />
					{:else}
						Create your account
					{/if}
				</h1>
				<p class="mt-2 text-sm text-ink-muted">
					{#if mode === 'login'}
						<BrandText
							text="Access your teams and wrkspaces — tasks, docs, chat, and the modules you have enabled."
						/>
					{:else}
						<BrandText
							text="Start with modular wrkspaces. Turn on only the tools each project needs."
						/>
					{/if}
				</p>

				{#if mode === 'login'}
					<form
						method="post"
						action="?/signInEmail"
						use:enhance={enhanceForm}
						class="mt-10 space-y-5"
					>
						<div>
							<Label for="login-email" class="text-ink-muted">Email</Label>
							<Input
								id="login-email"
								name="email"
								type="email"
								required
								aria-invalid={hasLoginError}
								class="{inputClass} {hasLoginError ? inputErrorClass : ''}"
								oninput={clearAuthError}
							/>
						</div>
						<div>
							<Label for="login-password" class="text-ink-muted">Password</Label>
							<PasswordInput
								id="login-password"
								name="password"
								required
								wrapperClass="mt-2"
								aria-invalid={hasLoginError}
								class="{passwordFieldClass} {hasLoginError ? inputErrorClass : ''}"
								oninput={clearAuthError}
							/>
						</div>
						{#if hasLoginError}
							<div
								class="rounded-xl border border-danger bg-danger-muted px-4 py-3 text-sm text-danger"
								role="alert"
							>
								{loginErrorText}
							</div>
						{/if}
						<Button
							type="submit"
							disabled={submitting}
							class="mt-2 h-12 w-full rounded-xl text-base font-medium disabled:opacity-70"
						>
							{#if submitting}
								<span class="inline-flex items-center gap-2">
									<span
										class="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current"
										aria-hidden="true"
									></span>
									Logging in…
								</span>
							{:else}
								Log in
							{/if}
						</Button>
					</form>
				{:else}
					<form
						method="post"
						action="?/signUpEmail"
						use:enhance={enhanceForm}
						class="mt-10 space-y-5"
					>
						<div>
							<Label for="signup-name" class="text-ink-muted">Name</Label>
							<Input
								id="signup-name"
								name="name"
								required
								aria-invalid={hasSignupError}
								class="{inputClass} {hasSignupError ? inputErrorClass : ''}"
								oninput={clearAuthError}
							/>
						</div>
						<div>
							<Label for="signup-email" class="text-ink-muted">Email</Label>
							<Input
								id="signup-email"
								name="email"
								type="email"
								required
								aria-invalid={hasSignupError}
								class="{inputClass} {hasSignupError ? inputErrorClass : ''}"
								oninput={clearAuthError}
							/>
						</div>
						<div>
							<Label for="signup-password" class="text-ink-muted">Password</Label>
							<PasswordInput
								id="signup-password"
								name="password"
								required
								wrapperClass="mt-2"
								aria-invalid={hasSignupError}
								class="{passwordFieldClass} {hasSignupError ? inputErrorClass : ''}"
								oninput={clearAuthError}
							/>
						</div>
						{#if hasSignupError}
							<div
								class="rounded-xl border border-danger bg-danger-muted px-4 py-3 text-sm text-danger"
								role="alert"
							>
								{signupErrorText}
							</div>
						{/if}
						<Button
							type="submit"
							disabled={submitting}
							class="mt-2 h-12 w-full rounded-xl text-base font-medium disabled:opacity-70"
						>
							{#if submitting}
								<span class="inline-flex items-center gap-2">
									<span
										class="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current"
										aria-hidden="true"
									></span>
									Creating account…
								</span>
							{:else}
								Create account
							{/if}
						</Button>
					</form>
				{/if}

				<p class="mt-8 text-center text-sm text-ink-muted">
					{#if mode === 'login'}
						Not a member?
						<Button
							type="button"
							variant="link"
							onclick={() => {
								mode = 'signup';
								submitting = false;
								clearAuthError();
							}}
						>
							Create an account
						</Button>
					{:else}
						Already have an account?
						<Button
							type="button"
							variant="link"
							onclick={() => {
								mode = 'login';
								submitting = false;
								clearAuthError();
							}}
						>
							Log in
						</Button>
					{/if}
				</p>
			</div>
		</div>

		<!-- Hero panel -->
		<div class="relative flex-1 p-4 pt-0 lg:p-4 lg:pl-0">
			<div
				class="relative h-56 overflow-hidden rounded-[1.75rem] sm:h-72 lg:h-full lg:min-h-[28rem]"
			>
				<img
					src="/hero-gradient-community.webp"
					alt=""
					class="absolute inset-0 h-full w-full object-cover"
				/>
				<div
					class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
				></div>

				<p
					class="absolute bottom-8 left-8 max-w-sm font-display text-2xl leading-snug text-white drop-shadow-sm sm:text-3xl"
				>
					<span class="font-semibold">Community Edition</span>
					{#if VERSION !== 'dev'}
						<span class="mt-1 block text-sm font-normal opacity-75">v{VERSION}</span>
					{/if}
				</p>
			</div>
		</div>
	</div>
</div>
