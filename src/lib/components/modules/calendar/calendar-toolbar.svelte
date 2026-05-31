<script lang="ts">
	import { Button, Tabs } from 'bits-ui';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';

	type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'listWeek';

	type Props = {
		title: string;
		view: CalendarView;
		exportHref: string;
		onImportClick: () => void;
		onPrev: () => void;
		onNext: () => void;
		onToday: () => void;
		onViewChange: (view: CalendarView) => void;
	};

	let { title, view, exportHref, onImportClick, onPrev, onNext, onToday, onViewChange }: Props =
		$props();

	const views: { id: CalendarView; label: string }[] = [
		{ id: 'dayGridMonth', label: 'Month' },
		{ id: 'timeGridWeek', label: 'Week' },
		{ id: 'listWeek', label: 'List' }
	];

	const controlSizeClass = 'h-11';

	const iconBtnClass = `inline-flex ${controlSizeClass} w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-ink transition hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50`;

	const tabTriggerClass =
		'flex h-full items-center rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 data-[state=active]:bg-accent data-[state=active]:text-white data-[state=inactive]:text-ink-muted data-[state=inactive]:hover:text-ink';
</script>

<div class="flex flex-col gap-2">
	<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
		<div class="flex flex-wrap items-center gap-1 justify-self-start">
			<Button.Root type="button" class={iconBtnClass} aria-label="Previous period" onclick={onPrev}>
				<HugeiconsIcon
					icon={ArrowLeft01Icon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</Button.Root>
			<ButtonUi type="button" variant="secondary" class="{controlSizeClass} px-3" onclick={onToday}
				>Today</ButtonUi
			>
			<Button.Root type="button" class={iconBtnClass} aria-label="Next period" onclick={onNext}>
				<HugeiconsIcon
					icon={ArrowRight01Icon}
					size={18}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</Button.Root>
			<ButtonUi
				type="button"
				variant="secondary"
				class="{controlSizeClass} px-3"
				onclick={onImportClick}
			>
				Import
			</ButtonUi>
			<ButtonUi variant="secondary" class="{controlSizeClass} px-3" href={exportHref} download>
				Export
			</ButtonUi>
		</div>

		<h2 class="min-w-0 truncate px-2 text-center text-lg font-semibold text-ink">{title}</h2>

		<Tabs.Root
			class="justify-self-end"
			value={view}
			onValueChange={(v) => {
				if (v === 'dayGridMonth' || v === 'timeGridWeek' || v === 'listWeek') {
					onViewChange(v);
				}
			}}
		>
			<Tabs.List
				class="inline-flex {controlSizeClass} items-center rounded-lg border border-border bg-surface p-0.5"
				aria-label="Calendar views"
			>
				{#each views as tab (tab.id)}
					<Tabs.Trigger value={tab.id} class={tabTriggerClass}>
						{tab.label}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
	</div>
</div>
