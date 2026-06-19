import { browser } from '$app/environment';

export type GanttCanvasColors = {
	columnStrokeColor: string;
};

const FALLBACK_STROKE = '#e5e7eb';

/** Resolved --color-border for svelte-gantt canvas column strokes (canvas cannot use CSS vars). */
export function readGanttCanvasColors(): GanttCanvasColors {
	if (!browser || typeof document === 'undefined') {
		return { columnStrokeColor: FALLBACK_STROKE };
	}
	const stroke = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-border')
		.trim();
	return { columnStrokeColor: stroke || FALLBACK_STROKE };
}

/** Re-read canvas stroke when appearance or palette changes. */
export function subscribeGanttCanvasColors(
	onChange: (colors: GanttCanvasColors) => void
): () => void {
	if (!browser) return () => {};

	const refresh = () => onChange(readGanttCanvasColors());
	refresh();
	window.addEventListener('wrkin-appearance-change', refresh);
	const obs = new MutationObserver(refresh);
	obs.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-appearance', 'data-palette']
	});
	return () => {
		window.removeEventListener('wrkin-appearance-change', refresh);
		obs.disconnect();
	};
}
