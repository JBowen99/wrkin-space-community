<script lang="ts">
	import type { DecisionStatus } from '$lib/shared/decisions';
	import { DECISION_STATUS_LABELS } from '$lib/shared/decisions';
	import Badge from '../../ui/badge.svelte';

	type Props = {
		status: DecisionStatus;
	};

	let { status }: Props = $props();

	const variants: Record<DecisionStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
		draft: 'neutral',
		accepted: 'success',
		deprecated: 'warning',
		superseded: 'neutral'
	};
</script>

<Badge variant={variants[status]}>{DECISION_STATUS_LABELS[status]}</Badge>
