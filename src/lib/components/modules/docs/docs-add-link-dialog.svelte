<script lang="ts">
	import Dialog from '../../ui/dialog.svelte';
	import Input from '../../ui/input.svelte';
	import Button from '../../ui/button.svelte';
	import Label from '../../ui/label.svelte';

	type Props = {
		open?: boolean;
		loading?: boolean;
		onSubmit: (url: string, title: string) => void;
	};

	let { open = $bindable(false), loading = false, onSubmit }: Props = $props();

	let url = $state('');
	let title = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSubmit(url.trim(), title.trim());
	}

	$effect(() => {
		if (!open) {
			url = '';
			title = '';
		}
	});
</script>

<Dialog
	bind:open
	title="Add link"
	description="Paste a URL to Google Docs, Notion, or any web page."
>
	<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
		<div>
			<Label for="link-url">URL</Label>
			<Input id="link-url" type="url" bind:value={url} placeholder="https://…" required />
		</div>
		<div>
			<Label for="link-title">Title (optional)</Label>
			<Input id="link-title" bind:value={title} placeholder="Display name" />
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={loading || !url.trim()}>
				{loading ? 'Adding…' : 'Add link'}
			</Button>
		</div>
	</form>
</Dialog>
