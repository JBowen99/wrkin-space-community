<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import PreviewSkeleton from './preview-skeleton.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'calendar' }>;
	};

	let { preview }: Props = $props();

	function startOfLocalDay(date: Date) {
		const day = new Date(date);
		day.setHours(0, 0, 0, 0);
		return day;
	}

	function eventDateParts(d: Date | string) {
		const date = new Date(d);
		const isToday = startOfLocalDay(date).getTime() === startOfLocalDay(new Date()).getTime();
		const timeLabel = new Intl.DateTimeFormat(undefined, {
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);

		if (isToday) {
			return { isToday: true as const, monthLabel: '', dayLabel: '', timeLabel };
		}

		return {
			isToday: false as const,
			monthLabel: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
			dayLabel: new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date),
			timeLabel
		};
	}
</script>

{#if preview.isEmpty}
	<PreviewSkeleton variant="calendar" />
{:else if preview.upcomingEvents.length === 0}
	<div
		class="flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-surface/40 px-3 py-4 text-center"
	>
		<p class="text-xs font-medium text-ink-muted">No events this week</p>
	</div>
{:else}
	<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
		<p class="mb-1.5 shrink-0 text-xs font-medium tracking-wide text-ink-muted uppercase">
			Upcoming
		</p>
		<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
			{#each preview.upcomingEvents as event, index (index)}
				{@const parts = eventDateParts(event.startsAt)}
				<li
					class="flex min-w-0 items-stretch gap-2 rounded-lg border border-border/80 bg-white px-1.5 py-1.5 shadow-sm dark:bg-surface"
					aria-hidden="true"
				>
					<div
						class="flex w-10 shrink-0 flex-col items-center justify-center rounded-md border border-border/60 py-1 {parts.isToday
							? 'bg-accent-muted/50'
							: 'bg-surface'}"
					>
						{#if parts.isToday}
							<span class="text-[10px] leading-none font-semibold text-accent">Today</span>
						{:else}
							<span
								class="text-[9px] leading-none font-medium tracking-wide text-ink-muted uppercase"
							>
								{parts.monthLabel}
							</span>
							<span class="mt-0.5 text-sm leading-none font-semibold text-ink tabular-nums">
								{parts.dayLabel}
							</span>
						{/if}
					</div>
					<div class="flex min-w-0 flex-1 flex-col justify-center py-0.5">
						<p class="truncate text-xs leading-snug font-medium text-ink">{event.title}</p>
						<p class="mt-0.5 text-[10px] leading-none text-ink-muted tabular-nums">
							{parts.timeLabel}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
{/if}
