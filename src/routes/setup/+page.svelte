<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';
	import BrandMark from '$lib/components/brand/brand-mark.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import PasswordInput from '$lib/components/ui/password-input.svelte';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const hasError = $derived(!!errorMessage || !!form?.message);
	const errorText = $derived(errorMessage ?? form?.message ?? null);

	function clearError() {
		errorMessage = null;
	}

	const enhanceForm: SubmitFunction = () => {
		submitting = true;
		clearError();

		return async ({ result, update }) => {
			if (result.type === 'failure') {
				const data = result.data as { message?: string } | undefined;
				errorMessage = data?.message ?? 'Could not create admin account';
			} else if (result.type === 'error') {
				errorMessage = 'Something went wrong. Please try again.';
			}
			await update();
			submitting = false;
		};
	};

	const inputClass =
		'mt-2 border-transparent bg-stone-100 px-4 py-3 focus:border-stone-300 focus:ring-stone-200/60';
	const passwordFieldClass =
		'border-transparent bg-stone-100 px-4 py-3 focus:border-stone-300 focus:ring-stone-200/60';
	const inputErrorClass = 'border-red-300 bg-red-50/80 focus:border-red-400 focus:ring-red-200/50';
</script>

<svelte:head>
	<title>Setup · wrkin.space</title>
	<meta name="description" content="Initialize your wrkin.space instance" />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-stone-100 p-4 sm:p-6">
	<div
		class="flex w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-stone-50 shadow-[0_24px_80px_-12px_rgba(28,25,23,0.12)] ring-1 ring-border/60 lg:min-h-[36rem] lg:flex-row"
	>
		<!-- Form panel -->
		<div class="flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 sm:py-12 lg:px-14 lg:py-14">
			<div class="mx-auto w-full max-w-md lg:mx-0">
				<div
					class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
				>
					This is the initial setup for your self-hosted instance. The account you create here
					will be the <strong>admin</strong> — it can manage all users, teams, and spaces from the
					admin dashboard.
				</div>

				<h1 class="font-display text-4xl font-semibold tracking-tight text-ink">
					Initialize <BrandMark />
				</h1>
				<p class="mt-2 text-sm text-ink-muted">
					Create the admin account for your self-hosted wrkin.space instance.
				</p>

				<form
					method="post"
					action="?/createAdmin"
					use:enhance={enhanceForm}
					class="mt-10 space-y-5"
				>
					<div>
						<Label for="setup-name" class="text-ink-muted">Name</Label>
						<Input
							id="setup-name"
							name="name"
							required
							aria-invalid={hasError}
							class="{inputClass} {hasError ? inputErrorClass : ''}"
							oninput={clearError}
						/>
					</div>
					<div>
						<Label for="setup-email" class="text-ink-muted">Email</Label>
						<Input
							id="setup-email"
							name="email"
							type="email"
							required
							aria-invalid={hasError}
							class="{inputClass} {hasError ? inputErrorClass : ''}"
							oninput={clearError}
						/>
					</div>
					<div>
						<Label for="setup-password" class="text-ink-muted">Password</Label>
						<PasswordInput
							id="setup-password"
							name="password"
							required
							wrapperClass="mt-2"
							aria-invalid={hasError}
							class="{passwordFieldClass} {hasError ? inputErrorClass : ''}"
							oninput={clearError}
						/>
					</div>
					{#if hasError}
						<div
							class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
							role="alert"
						>
							{errorText}
						</div>
					{/if}
					<Button
						type="submit"
						disabled={submitting}
						class="mt-2 h-12 w-full rounded-xl !bg-ink text-base font-medium hover:!bg-stone-800 disabled:opacity-70"
					>
						{#if submitting}
							<span class="inline-flex items-center gap-2">
								<span
									class="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white"
									aria-hidden="true"
								></span>
								Creating admin account…
							</span>
						{:else}
							Create admin account
						{/if}
					</Button>
				</form>
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
					class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
				></div>

				<p
					class="absolute bottom-8 left-8 max-w-sm font-display text-2xl leading-snug text-white sm:text-3xl"
				>
					<span class="font-semibold">Community Edition</span>
				</p>
			</div>
		</div>
	</div>
</div>
