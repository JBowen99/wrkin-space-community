<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import LabelUi from '../../ui/label.svelte';
	import Input from '../../ui/input.svelte';
	import ButtonUi from '../../ui/button.svelte';
	import { iconButtonClass as iconBtnClass } from '../../../icon-button-styles';

	type Props = {
		id?: string;
		options?: string[];
		onchange?: (options: string[]) => void;
	};

	let { id = 'select-options', options = [], onchange }: Props = $props();

	let draft = $state('');

	const chipClass =
		'inline-flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface-muted py-1 pr-1 pl-2.5 text-sm text-ink';

	const chipRemoveClass = iconBtnClass('sm', 'subtle');

	const iconButtonClass =
		'flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted/60 text-ink-muted transition hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-40';

	function emit(next: string[]) {
		onchange?.(next);
	}

	function normalize(value: string) {
		return value.trim();
	}

	function addOption() {
		const value = normalize(draft);
		if (!value) return;
		if (options.some((option) => option.toLowerCase() === value.toLowerCase())) {
			draft = '';
			return;
		}
		emit([...options, value]);
		draft = '';
	}

	function removeOption(index: number) {
		emit(options.filter((_, i) => i !== index));
	}

	function moveOption(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= options.length) return;
		const next = [...options];
		const [item] = next.splice(index, 1);
		next.splice(target, 0, item);
		emit(next);
	}

	function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addOption();
		}
	}
</script>

<div class="space-y-3">
	<LabelUi for="{id}-input">Options</LabelUi>

	{#if options.length > 0}
		<ul class="space-y-2" aria-label="Select options">
			{#each options as option, index (option)}
				<li class="flex items-center gap-2">
					<span class={chipClass}>
						<span class="truncate">{option}</span>
						<button
							type="button"
							class={chipRemoveClass}
							aria-label="Remove {option}"
							onclick={() => removeOption(index)}
						>
							<HugeiconsIcon icon={Cancel01Icon} color="currentColor" strokeWidth={2} aria-hidden={true} />
						</button>
					</span>
					<ButtonUi
						type="button"
						variant="unstyled"
						class={iconButtonClass}
						disabled={index === 0}
						onclick={() => moveOption(index, -1)}
						aria-label="Move {option} up"
					>
						<HugeiconsIcon
							icon={ArrowUp01Icon}
							size={16}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</ButtonUi>
					<ButtonUi
						type="button"
						variant="unstyled"
						class={iconButtonClass}
						disabled={index === options.length - 1}
						onclick={() => moveOption(index, 1)}
						aria-label="Move {option} down"
					>
						<HugeiconsIcon
							icon={ArrowDown01Icon}
							size={16}
							color="currentColor"
							strokeWidth={2}
							aria-hidden={true}
						/>
					</ButtonUi>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-ink-muted text-sm">Add at least one option.</p>
	{/if}

	<div class="flex items-center gap-2">
		<Input
			id="{id}-input"
			bind:value={draft}
			placeholder="Add option…"
			class="min-w-0 flex-1"
			onkeydown={handleKeydown}
		/>
		<ButtonUi type="button" variant="secondary" disabled={!draft.trim()} onclick={addOption}>
			Add
		</ButtonUi>
	</div>
</div>
