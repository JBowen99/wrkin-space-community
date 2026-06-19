<script lang="ts">
	import {
		reportPreviewTypeLabel,
		type ReportsModulePreviewConfigured
	} from '$lib/shared/reports-preview';

	type Props = {
		reportType: ReportsModulePreviewConfigured['reportType'];
	};

	let { reportType }: Props = $props();
</script>

<p
	class="bg-surface-muted text-ink-muted mb-2 inline-flex w-fit max-w-full shrink-0 truncate rounded-full px-2.5 py-1 text-[10px] font-semibold"
>
	{reportPreviewTypeLabel(reportType)}
</p>
