<script lang="ts">
	import ButtonUi from '../../ui/button.svelte';
	import ConfirmDialog from '../../ui/confirm-dialog.svelte';

	type Props = {
		reportId: string;
		canEdit: boolean;
	};

	let { reportId, canEdit }: Props = $props();

	let deleteOpen = $state(false);
</script>

{#if canEdit}
	<div class="border-border mt-8 border-t pt-6">
		<ButtonUi
			type="button"
			variant="secondary"
			class="text-danger h-9"
			onclick={() => (deleteOpen = true)}
		>
			Delete report
		</ButtonUi>
	</div>

	<ConfirmDialog
		bind:open={deleteOpen}
		title="Delete report?"
		description="This report and its configuration will be permanently removed."
		confirmLabel="Delete"
		destructive
		formAction="?/deleteReport"
		hiddenFields={{ reportId }}
	/>
{/if}
