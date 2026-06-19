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
		class="border-border/80 bg-surface/40 flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center"
	>
		<p class="text-ink-muted text-xs font-medium">No events this week</p>
	</div>
{:else}
	<div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
		<p class="text-ink-muted mb-1.5 shrink-0 text-xs font-medium tracking-wide uppercase">
			Upcoming
		</p>
		<ul class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
			{#each preview.upcomingEvents as event, index (index)}
				{@const parts = eventDateParts(event.startsAt)}
				<li
					class="border-border/80 bg-surface-raised flex min-w-0 items-stretch gap-2 rounded-lg border px-1.5 py-1.5 shadow-sm"
					aria-hidden="true"
				>
					<div
						class="border-border/60 flex w-9 shrink-0 flex-col items-center justify-center rounded-md border py-1 {parts.isToday
							? 'bg-accent-muted/50'
							: 'bg-surface'}"
					>
						{#if parts.isToday}
							<span class="text-accent text-[10px] leading-none font-semibold">Today</span>
						{:else}
							<span
								class="text-ink-muted text-[9px] leading-none font-medium tracking-wide uppercase"
							>
								{parts.monthLabel}
							</span>
							<span class="text-ink mt-0.5 text-sm leading-none font-semibold tabular-nums">
								{parts.dayLabel}
							</span>
						{/if}
					</div>
					<div class="flex min-w-0 flex-1 flex-col justify-center py-0.5">
						<p class="text-ink truncate text-xs leading-snug font-medium">{event.title}</p>
						<p class="text-ink-muted mt-0.5 text-[10px] leading-none tabular-nums">
							{parts.timeLabel}
						</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
{/if}
