<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import Button from '$lib/components/ui/button.svelte';
	import BrandText from '$lib/components/brand/brand-text.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import TemplatePicker from '$lib/components/templates/template-picker.svelte';
	import { BLANK_WRKSPACE_TEMPLATE_ID } from '$lib/shared/templates';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let templateId = $state(BLANK_WRKSPACE_TEMPLATE_ID);
</script>

<div class="mx-auto max-w-2xl">
	<Button href="/teams/{data.team.slug}" variant="ghost" class="mb-6 -ml-2"
		>← {data.team.name}</Button
	>

	<h1 class="font-display text-2xl font-semibold text-ink"><BrandText text="New wrkspace" /></h1>
	<p class="mt-1 text-sm text-ink-muted">
		<BrandText
			text="A wrkspace holds the modules your team uses — chat, calendar, cards, docs, forum, and more."
		/>
	</p>

	<Card class="mt-8">
		<form method="post" use:enhance class="space-y-5">
			<div>
				<Label for="wrkspace-name">Name</Label>
				<Input id="wrkspace-name" name="name" placeholder="e.g. Q2 Launch" required />
			</div>
			<div>
				<Label for="wrkspace-description">Description</Label>
				<Textarea
					id="wrkspace-description"
					name="description"
					placeholder="What is this wrkspace for?"
					rows={3}
					class="resize-none"
				/>
			</div>

			<TemplatePicker items={data.templates} bind:value={templateId} />

			{#if form?.message}
				<p class="text-sm text-danger" role="alert">{form.message}</p>
			{/if}
			<div class="flex gap-3 pt-2">
				<Button type="submit" class="flex-1">Create wrkspace</Button>
				<Button href="/teams/{data.team.slug}" variant="secondary">Cancel</Button>
			</div>
		</form>
	</Card>
</div>
