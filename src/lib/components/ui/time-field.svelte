<script lang="ts">
	import { TimeField } from 'bits-ui';
	import { Popover } from 'bits-ui';
	import { Time } from '@internationalized/date';
	import { cn } from '../../cn';

	type Props = {
		value?: Time | undefined;
		placeholder?: Time;
		label?: string;
		class?: string;
		hourCycle?: 12 | 24;
		required?: boolean;
	};

	let {
		value = $bindable<Time | undefined>(undefined),
		placeholder = $bindable<Time>(new Time(12, 0)),
		label,
		class: className = '',
		hourCycle = 12,
		required = false
	}: Props = $props();

	function getOptions(part: string): string[] {
		if (part === 'hour') {
			if (hourCycle === 12) {
				return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
			}
			return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
		}
		if (part === 'minute') {
			return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
		}
		if (part === 'dayPeriod') {
			return ['AM', 'PM'];
		}
		return [];
	}

	function selectOption(part: string, option: string) {
		if (!value) {
			value = new Time(hourCycle === 12 ? 12 : 0, 0);
		}

		if (part === 'hour') {
			const hour = parseInt(option, 10);
			const isPM = value.hour >= 12;
			if (hourCycle === 12) {
				value = new Time(isPM && hour < 12 ? hour + 12 : !isPM && hour === 12 ? 0 : hour, value.minute);
			} else {
				value = new Time(hour, value.minute);
			}
		} else if (part === 'minute') {
			value = new Time(value.hour, parseInt(option, 10));
		} else if (part === 'dayPeriod') {
			const isPM = option === 'PM';
			const currentHour = value.hour;
			if (isPM && currentHour < 12) {
				value = new Time(currentHour + 12, value.minute);
			} else if (!isPM && currentHour >= 12) {
				value = new Time(currentHour - 12, value.minute);
			}
		}
	}

	function isSelected(part: string, option: string): boolean {
		if (!value) return false;
		if (part === 'hour') {
			if (hourCycle === 12) {
				const h = value.hour % 12 || 12;
				return String(h).padStart(2, '0') === option;
			}
			return String(value.hour).padStart(2, '0') === option;
		}
		if (part === 'minute') {
			return String(value.minute).padStart(2, '0') === option;
		}
		if (part === 'dayPeriod') {
			return (value.hour >= 12 ? 'PM' : 'AM') === option;
		}
		return false;
	}
</script>

<TimeField.Root bind:value bind:placeholder {hourCycle} granularity="minute" {required}>
	<div class={cn('flex w-full flex-col gap-1.5', className)}>
		{#if label}
			<TimeField.Label class="text-ink block text-sm font-medium select-none">
				{label}
			</TimeField.Label>
		{/if}
		<TimeField.Input
			class="border-border bg-surface-raised text-ink hover:border-accent/40 focus-within:border-accent focus-within:ring-accent/20 flex h-11 w-full items-center rounded-lg border px-3 text-sm select-none focus-within:ring-2 focus-within:outline-none"
		>
			{#snippet children({ segments })}
				{#each segments as { part, value: segValue }, i (part + '-' + i)}
					{#if part === 'literal'}
						<TimeField.Segment {part} class="p-1 text-stone-400">
							{segValue}
						</TimeField.Segment>
					{:else}
						<Popover.Root>
							<Popover.Trigger class="hover:bg-accent/10 focus:bg-accent/10 focus:text-ink rounded px-1 py-1 focus-visible:ring-0! focus-visible:ring-offset-0! aria-[valuetext=Empty]:text-stone-400 cursor-pointer">
								{segValue}
							</Popover.Trigger>
							<Popover.Portal>
								<Popover.Content
									class="border-border bg-surface-raised z-50 max-h-48 w-[4.5rem] overflow-y-auto rounded-lg border p-1 shadow-md"
									sideOffset={4}
									align="center"
								>
									{#each getOptions(part) as option}
										{@const selected = isSelected(part, option)}
										<button
											type="button"
											class={cn(
												'w-full cursor-pointer rounded-md px-2 py-1 text-left text-sm',
												selected
													? 'bg-accent text-white font-medium'
													: 'text-ink hover:bg-surface-hover'
											)}
											onclick={() => selectOption(part, option)}
										>
											{option}
										</button>
									{/each}
								</Popover.Content>
							</Popover.Portal>
						</Popover.Root>
					{/if}
				{/each}
			{/snippet}
		</TimeField.Input>
	</div>
</TimeField.Root>
