<script lang="ts">
	import {
		formatCardFieldValue,
		type CardFieldDefinition,
		type CardFieldValues,
		type CardModuleConfig
	} from '$lib/shared/cards-schema';

	type Props = {
		config: CardModuleConfig;
		fieldValues: CardFieldValues;
	};

	let { config, fieldValues }: Props = $props();

	const primaryKey = $derived(config.layout.primaryFieldKey);

	const faceFields = $derived.by(() => {
		const fields: CardFieldDefinition[] = [];
		const seen = new Set<string>();
		for (const key of config.layout.faceFieldKeys) {
			const field = config.schema.fields.find((item) => item.key === key);
			if (field && !seen.has(key)) {
				fields.push(field);
				seen.add(key);
			}
		}
		return fields;
	});

	function displayValue(field: CardFieldDefinition): string {
		const raw = fieldValues[field.key];
		const truncate = field.type === 'long_text' ? 120 : undefined;
		return formatCardFieldValue(field.type, raw ?? null, { truncate });
	}
</script>

{#each faceFields as field (field.key)}
	{#if field.key === primaryKey}
		<p class="text-ink text-sm font-medium">{displayValue(field) || 'Untitled'}</p>
	{:else if displayValue(field)}
		<p class="text-ink-muted mt-1 text-xs leading-relaxed">{displayValue(field)}</p>
	{/if}
{/each}
