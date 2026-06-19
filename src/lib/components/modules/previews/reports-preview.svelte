<script lang="ts">
	import type { ModulePreview } from '$lib/server/modules';
	import { isConfiguredReportsPreview } from '$lib/shared/reports-preview';
	import ReportsEmptyState from '../reports/reports-empty-state.svelte';
	import ActivityDigestReportPreview from './reports/activity-digest-report-preview.svelte';
	import PersonalReportPreview from './reports/personal-report-preview.svelte';
	import ProgressReportPreview from './reports/progress-report-preview.svelte';
	import SummaryReportPreview from './reports/summary-report-preview.svelte';
	import TimelineReportPreview from './reports/timeline-report-preview.svelte';
	import WorkloadReportPreview from './reports/workload-report-preview.svelte';

	type Props = {
		preview: Extract<ModulePreview, { type: 'reports' }>;
	};

	let { preview }: Props = $props();
</script>

{#if !preview.configured}
	<ReportsEmptyState size="preview" />
{:else if isConfiguredReportsPreview(preview)}
	{#if preview.reportType === 'progress'}
		<ProgressReportPreview {preview} />
	{:else if preview.reportType === 'workload'}
		<WorkloadReportPreview {preview} />
	{:else if preview.reportType === 'timeline'}
		<TimelineReportPreview {preview} />
	{:else if preview.reportType === 'personal'}
		<PersonalReportPreview {preview} />
	{:else if preview.reportType === 'activity_digest'}
		<ActivityDigestReportPreview {preview} />
	{:else if preview.reportType === 'summary'}
		<SummaryReportPreview {preview} />
	{/if}
{/if}
