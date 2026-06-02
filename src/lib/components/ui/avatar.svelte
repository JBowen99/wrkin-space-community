<script lang="ts">
	import { Avatar } from 'bits-ui';

	type Props = {
		src?: string | null;
		alt: string;
		fallback: string;
		class?: string;
	};

	let { src, alt, fallback, class: className = '' }: Props = $props();
</script>

<Avatar.Root class="flex size-8 shrink-0 overflow-hidden rounded-full bg-stone-200 {className}">
	{#if src}
		<Avatar.Image {src} {alt} class="size-full object-cover" />
	{/if}
	<Avatar.Fallback
		class="flex size-full items-center justify-center bg-accent-muted text-xs font-medium text-accent"
	>
		{fallback}
	</Avatar.Fallback>
</Avatar.Root>
