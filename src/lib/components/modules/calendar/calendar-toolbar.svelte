<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import ButtonUi from '../../ui/button.svelte';
	import IconButton from '../../ui/icon-button.svelte';
	import TabsUi from '../../ui/tabs.svelte';

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

	const views = [
		{ value: 'dayGridMonth' as const, label: 'Month' },
		{ value: 'timeGridWeek' as const, label: 'Week' },
		{ value: 'listWeek' as const, label: 'List' }
	];

	const controlSizeClass = 'h-11';
</script>

<div class="flex flex-col gap-2">
	<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
		<div class="flex flex-wrap items-center gap-1 justify-self-start">
			<IconButton label="Previous period" variant="subtle" size="lg" onclick={onPrev}>
				<HugeiconsIcon
					icon={ArrowLeft01Icon}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</IconButton>
			<ButtonUi type="button" variant="secondary" class="{controlSizeClass} px-3" onclick={onToday}
				>Today</ButtonUi
			>
			<IconButton label="Next period" variant="subtle" size="lg" onclick={onNext}>
				<HugeiconsIcon
					icon={ArrowRight01Icon}
					color="currentColor"
					strokeWidth={2}
					aria-hidden={true}
				/>
			</IconButton>
			<!-- <ButtonUi
				type="button"
				variant="secondary"
				class="{controlSizeClass} px-3"
				onclick={onImportClick}
			>
				Import
			</ButtonUi>
			<ButtonUi variant="secondary" class="{controlSizeClass} px-3" href={exportHref} download>
				Export
			</ButtonUi> -->
		</div>

		<h2 class="text-ink min-w-0 truncate px-2 text-center text-lg font-semibold">{title}</h2>

		<TabsUi
			tabs={views}
			value={view}
			onValueChange={(v) => {
				if (v === 'dayGridMonth' || v === 'timeGridWeek' || v === 'listWeek') {
					onViewChange(v);
				}
			}}
			listClass={controlSizeClass}
			ariaLabel="Calendar views"
			class="justify-self-end"
		/>
	</div>
</div>
