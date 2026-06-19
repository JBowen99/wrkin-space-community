<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import ButtonUi from '../ui/button.svelte';

	type Variant = 'header' | 'card';

	type Props = {
		title: string;
		/** SvelteKit form action, e.g. `?/updateModuleTitle` or `?/updateDocTitle` */
		formAction?: string;
		ariaLabel?: string;
		/** When set, posted with the title (dashboard module grid). */
		moduleId?: string;
		variant?: Variant;
	};

	let {
		title,
		formAction = '?/updateModuleTitle',
		ariaLabel = 'Title',
		moduleId,
		variant = 'header'
	}: Props = $props();

	const isCard = $derived(variant === 'card');
	const titleTag = $derived(isCard ? 'h3' : 'h1');

	const displayTitleClass = $derived(
		isCard
			? 'line-clamp-2 text-lg leading-snug font-semibold text-ink'
			: 'font-display text-2xl font-semibold text-ink'
	);

	const editTitleClass = $derived(
		isCard
			? 'text-lg leading-snug font-semibold text-ink outline-none'
			: 'font-display text-2xl font-semibold text-ink outline-none'
	);

	let editing = $state(false);
	let submitting = $state(false);
	let draft = $state('');
	let titleEl = $state<HTMLElement | null>(null);
	let formEl = $state<HTMLFormElement | null>(null);
	let hiddenInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (!editing) {
			draft = title;
		}
	});

	$effect(() => {
		if (!editing || !titleEl) return;

		titleEl.textContent = untrack(() => draft);
		titleEl.focus();
		placeCaretAtEnd(titleEl);
	});

	function syncDraft() {
		draft = titleEl?.textContent ?? '';
	}

	function placeCaretAtEnd(element: HTMLElement) {
		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(false);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
	}

	function startEdit(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		draft = title;
		editing = true;
	}

	function cancel() {
		draft = title;
		editing = false;
	}

	function save() {
		syncDraft();
		draft = draft.trim();
		if (!draft) {
			cancel();
			return;
		}
		if (hiddenInput) hiddenInput.value = draft;
		submitting = true;
		formEl?.requestSubmit();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			save();
		}
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain').replace(/\r?\n/g, ' ') ?? '';
		document.execCommand('insertText', false, text);
		syncDraft();
	}
</script>

{#if editing}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative w-full"
		onclick={(e) => e.stopPropagation()}
		onmousedown={(e: MouseEvent) => e.stopPropagation()}
	>
		<form
			bind:this={formEl}
			method="POST"
			action={formAction}
			use:enhance={() => {
				return async ({ update }) => {
					await update();
					editing = false;
					submitting = false;
				};
			}}
		>
			<input bind:this={hiddenInput} type="hidden" name="title" value={draft} />
			{#if moduleId}
				<input type="hidden" name="moduleId" value={moduleId} />
			{/if}

			<svelte:element
				this={titleTag}
				bind:this={titleEl}
				contenteditable="true"
				role="textbox"
				tabindex="0"
				aria-label={ariaLabel}
				class={editTitleClass}
				oninput={syncDraft}
				onkeydown={handleKeydown}
				onpaste={handlePaste}
				onblur={() => {
					requestAnimationFrame(() => {
						if (editing && !submitting) cancel();
					});
				}}
			/>

			<p
				role="status"
				class="border-border bg-surface-raised text-ink-muted pointer-events-none absolute top-full left-0 z-10 mt-1 rounded-md border px-2 py-0.5 whitespace-nowrap shadow-sm {isCard
					? 'text-xs'
					: 'text-sm'}"
			>
				Enter to save · Escape to cancel
			</p>
		</form>
	</div>
{:else}
	<ButtonUi
		type="button"
		variant="unstyled"
		class="group inline-flex w-fit max-w-full min-w-0 items-center gap-2 text-left"
		onclick={startEdit}
		onmousedown={(e: MouseEvent) => e.stopPropagation()}
	>
		<svelte:element this={titleTag} class="{displayTitleClass} group-hover:text-accent min-w-0">
			{title}
		</svelte:element>
		<span
			class="title-edit-label text-ink-muted inline-flex shrink-0 items-center leading-none {isCard
				? 'text-xs'
				: 'text-sm'}"
		>
			Edit
		</span>
	</ButtonUi>
{/if}

<style>
	.title-edit-label {
		clip-path: inset(0 100% 0 0);
		transition: clip-path 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.group:hover .title-edit-label,
	.group:focus-visible .title-edit-label {
		clip-path: inset(0 0 0 0);
	}

	@media (prefers-reduced-motion: reduce) {
		.title-edit-label {
			clip-path: inset(0 0 0 0);
			opacity: 0;
			transition: opacity 150ms ease;
		}

		.group:hover .title-edit-label,
		.group:focus-visible .title-edit-label {
			opacity: 1;
		}
	}
</style>
