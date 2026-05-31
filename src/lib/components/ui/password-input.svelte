<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { EyeIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';

	type Props = {
		id: string;
		name: string;
		required?: boolean;
		class?: string;
		wrapperClass?: string;
		'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	};

	let {
		id,
		name,
		required = false,
		class: className = '',
		wrapperClass = '',
		'aria-invalid': ariaInvalid,
		oninput
	}: Props = $props();

	let visible = $state(false);

	const toggleLabel = $derived(visible ? 'Hide password' : 'Show password');
</script>

<div class={wrapperClass}>
	<div class="relative">
		<input
			{id}
			{name}
			type={visible ? 'text' : 'password'}
			{required}
			aria-invalid={ariaInvalid}
			{oninput}
			autocomplete={id.includes('signup') ? 'new-password' : 'current-password'}
			class="w-full rounded-lg border border-border bg-surface-raised py-2.5 pr-11 pl-3 text-sm text-ink placeholder:text-stone-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none {className}"
		/>
		<button
			type="button"
			class="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition hover:text-ink focus:outline-none"
			aria-label={toggleLabel}
			aria-pressed={visible}
			onmousedown={(event) => event.preventDefault()}
			onclick={() => (visible = !visible)}
		>
			{#if visible}
				<HugeiconsIcon
					icon={ViewOffSlashIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			{:else}
				<HugeiconsIcon
					icon={EyeIcon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			{/if}
		</button>
	</div>
</div>
