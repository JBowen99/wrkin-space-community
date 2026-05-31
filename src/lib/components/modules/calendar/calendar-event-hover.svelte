<script lang="ts">
	import { formatEventRange, truncateDescription, type CalendarEventInput } from '$lib/shared/calendar';

	type Props = {
		event: CalendarEventInput | null;
		anchorRect: DOMRect | null;
	};

	let { event, anchorRect }: Props = $props();

	const style = $derived.by(() => {
		if (!anchorRect) return 'display: none';
		const top = Math.max(8, anchorRect.top - 8);
		const left = Math.min(
			anchorRect.left,
			typeof window !== 'undefined' ? window.innerWidth - 280 : anchorRect.left
		);
		return `top: ${top}px; left: ${left}px; transform: translateY(-100%);`;
	});

	const descriptionPreview = $derived(
		event?.description?.trim() ? truncateDescription(event.description) : ''
	);
</script>

{#if event && anchorRect}
	<div
		class="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-md"
		{style}
		role="tooltip"
	>
		<p class="font-medium text-ink">{event.title}</p>
		<p class="mt-1 text-sm text-ink-muted">
			{formatEventRange(event.startsAt, event.endsAt)}
		</p>
		{#if descriptionPreview}
			<p class="mt-2 line-clamp-2 text-sm text-ink-muted">{descriptionPreview}</p>
		{/if}
	</div>
{/if}
