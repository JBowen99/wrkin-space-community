<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { SvelteGantt, SvelteGanttDependencies } from 'svelte-gantt/svelte';
	import {
		buildGanttScaleConfig,
		type GanttTaskModel,
		type GanttTimeScale,
		type TasksGanttData
	} from '$lib/shared/tasks-gantt';
	import { wrkinGanttDateAdapter } from '$lib/shared/gantt-date-adapter';
	import { readGanttCanvasColors, subscribeGanttCanvasColors } from '../../../gantt-canvas-colors';
	import {
		attachReportTimelineHeightFit,
		attachReportTimelineStickyScroll,
		fitReportTimelineHostHeight,
		syncReportTimelineStickyCards
	} from '../../../report-timeline-sticky';
	import { tick } from 'svelte';

	type Props = {
		gantt: TasksGanttData;
		itemHrefs: Record<string, string>;
		timeScale: GanttTimeScale;
	};

	let { gantt, itemHrefs, timeScale }: Props = $props();

	let ganttInstance = $state<InstanceType<typeof SvelteGantt> | undefined>();
	let ganttHostEl = $state<HTMLDivElement | undefined>();
	let canvasColors = $state(readGanttCanvasColors());

	const REPORT_ROW_HEIGHT = 94;
	const REPORT_ROW_PADDING = 6;

	$effect(() => {
		if (!browser) return;
		return subscribeGanttCanvasColors((colors) => {
			canvasColors = colors;
		});
	});

	const scaleConfig = $derived(buildGanttScaleConfig(timeScale, gantt));
	const accentByItemId = $derived(new Map(gantt.tasks.map((t) => [String(t.id), t.color ?? null])));

	function applyCardAccent(node: HTMLElement, model: GanttTaskModel) {
		const itemId = String(model.id);
		const isEvent = model.classes?.includes('report-timeline-event-bar');
		const accent = accentByItemId.get(itemId) ?? (isEvent ? null : null);
		if (accent) {
			node.style.setProperty('--rt-accent', accent);
		} else if (isEvent) {
			node.style.setProperty('--rt-accent', 'var(--color-chart-4)');
		}
	}

	const options = $derived({
		rows: gantt.rows,
		tasks: gantt.tasks,
		dependencies: gantt.dependencies,
		from: scaleConfig.from,
		to: scaleConfig.to,
		tableWidth: 0,
		ganttTableModules: [],
		ganttBodyModules: [SvelteGanttDependencies],
		reflectOnParentRows: false,
		reflectOnChildRows: false,
		layout: 'pack' as const,
		rowHeight: REPORT_ROW_HEIGHT,
		rowPadding: REPORT_ROW_PADDING,
		headers: scaleConfig.headers,
		zoomLevels: [
			{
				headers: scaleConfig.headers,
				minWidth: scaleConfig.minWidth,
				fitWidth: scaleConfig.fitWidth
			}
		],
		classes: 'wrkin-gantt wrkin-report-timeline',
		highlightedDurations: scaleConfig.highlightedDurations,
		highlightColor: scaleConfig.highlightColor,
		columnStrokeColor: canvasColors.columnStrokeColor,
		useCanvasColumns: scaleConfig.useCanvasColumns,
		columnUnit: scaleConfig.columnUnit,
		columnOffset: scaleConfig.columnOffset,
		minWidth: scaleConfig.minWidth,
		fitWidth: scaleConfig.fitWidth,
		magnetUnit: scaleConfig.magnetUnit,
		magnetOffset: scaleConfig.magnetOffset,
		dateAdapter: wrkinGanttDateAdapter,
		taskElementHook: (node: HTMLElement, model: GanttTaskModel) => {
			applyCardAccent(node, model);
			return {
				update(updated: GanttTaskModel) {
					applyCardAccent(node, updated);
				},
				destroy() {}
			};
		}
	});

	function openItem(itemId: string) {
		const href = itemHrefs[itemId];
		if (href && href !== '#') void goto(href);
	}

	$effect(() => {
		const instance = ganttInstance;
		if (!instance || !browser) return;

		const offDblClick = instance.api.tasks.on.dblclicked(([svelteTask]) => {
			openItem(String(svelteTask.model.id));
		});

		const offSelect = instance.api.tasks.on.select(([svelteTask]) => {
			openItem(String(svelteTask.model.id));
		});

		return () => {
			offDblClick();
			offSelect();
		};
	});

	$effect(() => {
		const host = ganttHostEl;
		gantt.tasks;
		timeScale;
		if (!host || !browser) return;

		let detachSticky: (() => void) | undefined;
		let detachHeight: (() => void) | undefined;

		void tick().then(() => {
			const scroller = host.querySelector<HTMLElement>('.sg-timeline-body');
			const syncLayout = () => {
				fitReportTimelineHostHeight(host);
				if (scroller) syncReportTimelineStickyCards(scroller);
			};

			syncLayout();

			detachHeight = attachReportTimelineHeightFit(host, syncLayout);
			if (scroller) {
				detachSticky = attachReportTimelineStickyScroll(scroller, () => {
					syncReportTimelineStickyCards(scroller);
				});
			}
		});

		return () => {
			detachSticky?.();
			detachHeight?.();
		};
	});
</script>

{#if gantt.tasks.length === 0}
	<div
		class="border-border text-ink-muted flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm"
	>
		<p>No scheduled items in the linked modules.</p>
		<p class="text-xs">Add tasks with dates or calendar events to populate the timeline.</p>
	</div>
{:else if browser}
	<div bind:this={ganttHostEl} class="wrkin-gantt-host wrkin-report-timeline-host relative w-full">
		{#key `${timeScale}-${canvasColors.columnStrokeColor}`}
			<SvelteGantt bind:this={ganttInstance} {...options} />
		{/key}
	</div>
{:else}
	<div
		class="border-border text-ink-muted flex h-64 items-center justify-center rounded-xl border border-dashed text-sm"
	>
		Loading timeline…
	</div>
{/if}
