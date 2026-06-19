<script lang="ts">
	import type {
		ActivityDigestReportData,
		PersonalReportData,
		ProgressReportData,
		ReportDetail,
		ReportSourceOptions,
		SummaryReportData,
		TimelineReportData,
		WorkloadReportData
	} from '$lib/server/reports';
	import type {
		ActivityDigestReportConfig,
		PersonalReportConfig,
		ProgressReportConfig,
		SummaryReportConfig,
		TimelineReportConfig,
		WorkloadReportConfig
	} from '$lib/shared/reports';
	import ProgressReportView from './progress-report-view.svelte';
	import TimelineReportView from './timeline-report-view.svelte';
	import WorkloadReportView from './workload-report-view.svelte';
	import PersonalReportView from './personal-report-view.svelte';
	import ActivityDigestReportView from './activity-digest-report-view.svelte';
	import SummaryReportView from './summary-report-view.svelte';
	import ReportConfigForm from './report-config-form.svelte';
	import {
		REPORT_TYPE_EMPTY_MESSAGES,
		REPORT_TYPE_HEADLINES,
		REPORT_TYPE_LABELS,
		isReportType
	} from '$lib/shared/reports';
	import type { TeamMemberOption } from './report-member-picker.svelte';

	type ModuleLink = {
		moduleId: string;
		moduleTitle: string;
		href: string;
	};

	type Props = {
		report: ReportDetail;
		typeLabel: string;
		sourceOptions: ReportSourceOptions;
		teamMembers: TeamMemberOption[];
		canEdit: boolean;
		moduleTitle: string;
		teamSlug: string;
		wrkspaceSlug: string;
		progressData: ProgressReportData | null;
		timelineData: TimelineReportData | null;
		workloadData: WorkloadReportData | null;
		personalData: PersonalReportData | null;
		digestData: ActivityDigestReportData | null;
		summaryData: SummaryReportData | null;
		moduleLinks: ModuleLink[];
		digestModuleTypeLabel: string | null;
	};

	let {
		report,
		typeLabel,
		sourceOptions,
		teamMembers,
		canEdit,
		moduleTitle,
		teamSlug,
		wrkspaceSlug,
		progressData,
		timelineData,
		workloadData,
		personalData,
		digestData,
		summaryData,
		moduleLinks,
		digestModuleTypeLabel
	}: Props = $props();

	const reportTypeLabel = $derived(
		isReportType(report.type) ? REPORT_TYPE_LABELS[report.type] : report.type
	);

	const headline = $derived(isReportType(report.type) ? REPORT_TYPE_HEADLINES[report.type] : null);

	const emptyMessage = $derived(
		isReportType(report.type) ? REPORT_TYPE_EMPTY_MESSAGES[report.type] : null
	);

	const initialSourceIds = $derived(report.sourceLinks.map((l) => l.sourceModuleId));
	const needsSources = $derived(
		report.type === 'progress' ||
			report.type === 'workload' ||
			report.type === 'timeline' ||
			report.type === 'summary'
	);
	const missingSources = $derived(needsSources && report.sourceLinks.length === 0);

	const hasReportData = $derived(
		(report.type === 'progress' && progressData) ||
			(report.type === 'timeline' && timelineData) ||
			(report.type === 'workload' && workloadData) ||
			(report.type === 'personal' && personalData) ||
			(report.type === 'activity_digest' && digestData) ||
			(report.type === 'summary' && summaryData)
	);
</script>

<div class="mt-6">
	<p class="text-ink-muted text-sm font-medium">{reportTypeLabel}</p>
	{#if headline}
		<p class="text-ink mt-1 text-base">{headline}</p>
	{:else}
		<p class="text-ink-muted mt-1 text-sm">{typeLabel}</p>
	{/if}

	{#if missingSources}
		<p
			class="border-border bg-surface-raised text-ink-muted mt-6 rounded-lg border px-4 py-3 text-sm"
		>
			Link at least one source module in settings below to populate this report.
		</p>
	{:else if !hasReportData && emptyMessage}
		<p
			class="border-border bg-surface-muted/30 text-ink-muted mt-6 rounded-lg border border-dashed px-4 py-6 text-sm"
		>
			{emptyMessage}
		</p>
	{/if}

	{#if report.type === 'progress' && progressData}
		<div class="mt-8">
			<ProgressReportView data={progressData} {moduleLinks} />
		</div>
	{:else if report.type === 'timeline' && timelineData}
		<div class="mt-8">
			<TimelineReportView data={timelineData} />
		</div>
	{:else if report.type === 'workload' && workloadData}
		<div class="mt-8">
			<WorkloadReportView data={workloadData} />
		</div>
	{:else if report.type === 'personal' && personalData}
		<div class="mt-8">
			<PersonalReportView data={personalData} {teamSlug} {wrkspaceSlug} />
		</div>
	{:else if report.type === 'activity_digest' && digestData}
		<div class="mt-8">
			<ActivityDigestReportView
				data={digestData}
				{teamSlug}
				{wrkspaceSlug}
				moduleTypeLabel={digestModuleTypeLabel}
			/>
		</div>
	{:else if report.type === 'summary' && summaryData}
		<div class="mt-8">
			<SummaryReportView data={summaryData} {teamSlug} {wrkspaceSlug} />
		</div>
	{/if}

	<ReportConfigForm
		reportId={report.id}
		reportType={report.type}
		title={moduleTitle}
		{sourceOptions}
		{initialSourceIds}
		workloadConfig={report.type === 'workload' ? (report.config as WorkloadReportConfig) : undefined}
		personalConfig={report.type === 'personal' ? (report.config as PersonalReportConfig) : undefined}
		digestConfig={
			report.type === 'activity_digest' ? (report.config as ActivityDigestReportConfig) : undefined
		}
		summaryConfig={report.type === 'summary' ? (report.config as SummaryReportConfig) : undefined}
		timelineConfig={report.type === 'timeline' ? (report.config as TimelineReportConfig) : undefined}
		progressConfig={report.type === 'progress' ? (report.config as ProgressReportConfig) : undefined}
		{teamMembers}
		{canEdit}
	/>
</div>
