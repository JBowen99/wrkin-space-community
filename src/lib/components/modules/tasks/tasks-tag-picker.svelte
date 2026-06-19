<script lang="ts">
	import type { TaskTagRow } from '$lib/shared/task-links';
	import { normalizeTagName } from '$lib/shared/task-links';
	import Combobox from '../../ui/combobox.svelte';

	type Props = {
		wrkspaceTags: TaskTagRow[];
		selectedTagIds?: string[];
		newTagNames?: string[];
	};

	let {
		wrkspaceTags,
		selectedTagIds = $bindable<string[]>([]),
		newTagNames = $bindable<string[]>([])
	}: Props = $props();

	const tagOptions = $derived(wrkspaceTags.map((t) => ({ value: t.id, label: t.name })));

	const extraTagChips = $derived(
		newTagNames.map((name, index) => ({
			id: `new-${index}-${name}`,
			label: name,
			onRemove: () => removeNewTag(name)
		}))
	);

	function addTagFromSearch(raw: string) {
		const name = normalizeTagName(raw);
		if (!name) return;

		const existingTag = wrkspaceTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
		if (existingTag) {
			if (!selectedTagIds.includes(existingTag.id)) {
				selectedTagIds = [...selectedTagIds, existingTag.id];
			}
			return;
		}

		if (
			!newTagNames.some((n) => n.toLowerCase() === name.toLowerCase()) &&
			!wrkspaceTags.some((t) => t.name.toLowerCase() === name.toLowerCase())
		) {
			newTagNames = [...newTagNames, name];
		}
	}

	function removeNewTag(name: string) {
		newTagNames = newTagNames.filter((n) => n !== name);
	}
</script>

<div>
	<Combobox
		id="task-tags"
		bind:value={selectedTagIds}
		options={tagOptions}
		placeholder="Search tags…"
		emptyMessage="No matching tags."
		onCreateFromSearch={addTagFromSearch}
		createLabel={(query) => `Create "${normalizeTagName(query)}"`}
		extraChips={extraTagChips}
	/>

	{#each newTagNames as name (name)}
		<input type="hidden" name="newTagNames" value={name} />
	{/each}

	{#each selectedTagIds as tagId (tagId)}
		<input type="hidden" name="tagIds" value={tagId} />
	{/each}
</div>
