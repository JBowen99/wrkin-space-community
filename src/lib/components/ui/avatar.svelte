<script lang="ts">
	import { Avatar } from 'bits-ui';
	import { cn } from '../../cn';

	type Props = {
		src?: string | null;
		alt: string;
		fallback: string;
		class?: string;
	};

	let { src, alt, fallback, class: className = '' }: Props = $props();
</script>

<Avatar.Root class={cn('bg-surface-inset flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
	{#if src}
		<Avatar.Image {src} {alt} class="size-full object-cover" />
	{/if}
	<Avatar.Fallback
		class="bg-accent-muted text-accent flex size-full items-center justify-center text-xs font-medium"
	>
		{fallback}
	</Avatar.Fallback>
</Avatar.Root>
