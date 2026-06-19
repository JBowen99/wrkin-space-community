<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import ButtonUi from './button.svelte';
	import { EyeIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
	import { cn } from '../../cn';

	type Props = {
		id: string;
		name: string;
		value?: string;
		required?: boolean;
		class?: string;
		wrapperClass?: string;
		'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
		oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
	};

	let {
		id,
		name,
		value = $bindable(''),
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
			bind:value
			aria-invalid={ariaInvalid}
			{oninput}
			autocomplete={id.includes('signup') ? 'new-password' : 'current-password'}
			class={cn(
				'border-border bg-surface-raised text-ink focus:border-accent focus:ring-accent/20 placeholder:text-ink-muted/60 w-full rounded-lg border py-2.5 pr-11 pl-3 text-sm focus:ring-2 focus:outline-none',
				className
			)}
		/>
		<ButtonUi
			type="button"
			variant="unstyled"
			class="text-ink-muted hover:text-ink absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition focus:outline-none"
			aria-label={toggleLabel}
			aria-pressed={visible}
			onmousedown={(event: MouseEvent) => event.preventDefault()}
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
		</ButtonUi>
	</div>
</div>
