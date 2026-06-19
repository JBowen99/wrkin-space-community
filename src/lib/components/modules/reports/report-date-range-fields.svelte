<script lang="ts">
	import {
		REPORT_DATE_PRESETS,
		REPORT_DATE_PRESET_LABELS,
		isReportDatePreset,
		type ReportDatePreset
	} from '$lib/shared/reports';
	import Label from '../../ui/label.svelte';
	import Select from '../../ui/select.svelte';

	type Props = {
		id?: string;
		name?: string;
		value?: ReportDatePreset;
	};

	let {
		id = 'report-date-preset',
		name = 'datePreset',
		value = $bindable('last_30_days' as ReportDatePreset)
	}: Props = $props();

	const options = REPORT_DATE_PRESETS.map((p) => ({
		value: p,
		label: REPORT_DATE_PRESET_LABELS[p]
	}));
</script>

<div>
	<Label for={id}>Date range</Label>
	<Select
		{id}
		{name}
		{options}
		{value}
		onValueChange={(v) => {
			if (isReportDatePreset(v)) value = v;
		}}
		class="mt-1"
	/>
</div>
