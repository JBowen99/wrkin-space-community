<script lang="ts">
	import Label from '../../ui/label.svelte';
	import Select from '../../ui/select.svelte';

	export type TeamMemberOption = {
		id: string;
		name: string;
		image: string | null;
	};

	type Props = {
		members: TeamMemberOption[];
		value?: string;
		name?: string;
		id?: string;
	};

	let { members, value = $bindable(''), name = 'userId', id = 'report-member' }: Props = $props();

	const options = $derived(members.map((m) => ({ value: m.id, label: m.name })));
</script>

<div>
	<Label for={id}>Team member</Label>
	<Select
		{id}
		{name}
		{options}
		{value}
		onValueChange={(v) => {
			value = v;
		}}
		class="mt-1"
	/>
</div>
