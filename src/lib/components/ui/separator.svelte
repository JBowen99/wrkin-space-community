<script lang="ts">
	import { Separator } from 'bits-ui';
	import { cn } from '../../cn';

type Props = {
	orientation?: 'horizontal' | 'vertical';
	decorative?: boolean;
	class?: string;
};

let {
	orientation = 'horizontal',
	decorative = true,
	class: className = ''
}: Props = $props();
</script>

<Separator.Root
	{orientation}
	{decorative}
	class={cn(
		'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[1px]',
		className
	)}
/>
