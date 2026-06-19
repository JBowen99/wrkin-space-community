<script lang="ts">
	import { DatePicker } from 'bits-ui';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calendar03Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { cn } from '../../cn';

	type Props = {
		value?: DateValue | undefined;
		placeholder?: DateValue;
		label?: string;
		class?: string;
	};

	let {
		value = $bindable<DateValue | undefined>(undefined),
		placeholder = $bindable<DateValue>(
			new CalendarDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())
		),
		label,
		class: className = ''
	}: Props = $props();
</script>

<DatePicker.Root bind:value bind:placeholder weekdayFormat="short" fixedWeeks={true}>
	<div class={cn('flex w-full flex-col gap-1.5', className)}>
		{#if label}
			<DatePicker.Label class="text-ink block text-sm font-medium select-none">
				{label}
			</DatePicker.Label>
		{/if}
		<DatePicker.Input
			class="border-border bg-surface-raised text-ink hover:border-accent/40 focus-within:border-accent focus-within:ring-accent/20 flex h-11 w-full items-center rounded-lg border px-3 text-sm select-none focus-within:ring-2 focus-within:outline-none"
		>
			{#snippet children({ segments })}
				{#each segments as { part, value: segValue }, i (part + '-' + i)}
					<div class="inline-block select-none">
						{#if part === 'literal'}
							<DatePicker.Segment {part} class="p-1 text-stone-400">
								{segValue}
							</DatePicker.Segment>
						{:else}
							<DatePicker.Segment
								{part}
								class="hover:bg-accent/10 focus:bg-accent/10 focus:text-ink rounded px-1 py-1 focus-visible:ring-0! focus-visible:ring-offset-0! aria-[valuetext=Empty]:text-stone-400"
							>
								{segValue}
							</DatePicker.Segment>
						{/if}
					</div>
				{/each}
				<DatePicker.Trigger
					class="text-ink-muted hover:bg-accent/10 hover:text-ink ml-auto inline-flex size-8 items-center justify-center rounded-md transition"
				>
					<HugeiconsIcon
						icon={Calendar03Icon}
						size={18}
						color="currentColor"
						strokeWidth={2}
						aria-hidden={true}
					/>
				</DatePicker.Trigger>
			{/snippet}
		</DatePicker.Input>
		<DatePicker.Portal>
			<DatePicker.Content
				sideOffset={6}
				class="border-border bg-surface-raised z-[60] rounded-xl border p-3 shadow-md"
				onInteractOutside={(e) => e.preventDefault()}
			>
				<DatePicker.Calendar>
					{#snippet children({ months, weekdays })}
						<DatePicker.Header class="flex items-center justify-between">
							<DatePicker.PrevButton
								class="text-ink-muted hover:bg-accent/10 hover:text-ink inline-flex size-9 items-center justify-center rounded-md transition"
							>
								<HugeiconsIcon
									icon={ArrowLeft01Icon}
									size={16}
									color="currentColor"
									strokeWidth={2}
									aria-hidden={true}
								/>
							</DatePicker.PrevButton>
							<DatePicker.Heading class="text-ink text-sm font-semibold" />
							<DatePicker.NextButton
								class="text-ink-muted hover:bg-accent/10 hover:text-ink inline-flex size-9 items-center justify-center rounded-md transition"
							>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									size={16}
									color="currentColor"
									strokeWidth={2}
									aria-hidden={true}
								/>
							</DatePicker.NextButton>
						</DatePicker.Header>
						{#each months as month (month.value)}
							<DatePicker.Grid class="mt-2 w-full border-collapse space-y-1 select-none">
								<DatePicker.GridHead>
									<DatePicker.GridRow class="mb-1 flex w-full justify-between">
										{#each weekdays as day (day)}
											<DatePicker.HeadCell
												class="text-ink-muted flex size-9 items-center justify-center text-xs font-medium"
											>
												{day.slice(0, 2)}
											</DatePicker.HeadCell>
										{/each}
									</DatePicker.GridRow>
								</DatePicker.GridHead>
								<DatePicker.GridBody>
									{#each month.weeks as weekDates (weekDates)}
										<DatePicker.GridRow class="flex w-full">
											{#each weekDates as date (date)}
												<DatePicker.Cell
													{date}
													month={month.value}
													class="relative size-9 p-0 text-center text-sm"
												>
													<DatePicker.Day
														class="hover:border-accent hover:bg-accent/10 data-[selected]:border-accent data-[selected]:bg-accent relative inline-flex size-9 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-sm font-normal whitespace-nowrap transition-all data-[disabled]:pointer-events-none data-[disabled]:text-stone-300 data-[outside-month]:pointer-events-none data-[outside-month]:text-stone-300 data-[selected]:font-medium data-[selected]:text-white data-[unavailable]:text-stone-400 data-[unavailable]:line-through"
													>
														{date.day}
													</DatePicker.Day>
												</DatePicker.Cell>
											{/each}
										</DatePicker.GridRow>
									{/each}
								</DatePicker.GridBody>
							</DatePicker.Grid>
						{/each}
					{/snippet}
				</DatePicker.Calendar>
			</DatePicker.Content>
		</DatePicker.Portal>
	</div>
</DatePicker.Root>
