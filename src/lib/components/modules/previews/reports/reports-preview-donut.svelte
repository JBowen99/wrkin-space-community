<script lang="ts">
	type Props = {
		percent: number;
		size?: number;
		label?: string;
	};

	let { percent, size = 64, label }: Props = $props();

	const clamped = $derived(Math.min(100, Math.max(0, percent)));
	const radius = 15;
	const circumference = 2 * Math.PI * radius;
	const offset = $derived(circumference - (clamped / 100) * circumference);
</script>

<div class="flex items-center gap-3">
	<svg
		viewBox="0 0 36 36"
		width={size}
		height={size}
		role="img"
		aria-label={label ?? `${clamped}% complete`}
	>
		<circle
			cx="18"
			cy="18"
			r={radius}
			fill="none"
			stroke="var(--color-surface-inset)"
			stroke-width="4"
		/>
		<circle
			cx="18"
			cy="18"
			r={radius}
			fill="none"
			stroke="var(--color-success)"
			stroke-width="4"
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			transform="rotate(-90 18 18)"
		/>
		<text
			x="18"
			y="18.5"
			text-anchor="middle"
			dominant-baseline="middle"
			class="fill-ink text-[8px] font-bold"
		>
			{clamped}%
		</text>
	</svg>
	{#if label}
		<p class="text-ink-muted min-w-0 text-xs leading-snug">{label}</p>
	{/if}
</div>
