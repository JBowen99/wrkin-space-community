import type { SubscriptionTier } from './pricing';

export const MODULE_CATALOG = [
	{
		type: 'chat',
		label: 'Chat',
		description: 'Single continuous communication channel',
		enabled: true,
		titlePrefix: 'Chat',
		tierMin: 'personal'
	},
	{
		type: 'forum',
		label: 'Forum',
		description: 'Threaded discussions and replies',
		enabled: true,
		titlePrefix: 'Forum',
		tierMin: 'personal'
	},
	{
		type: 'calendar',
		label: 'Calendar',
		description: 'Milestones, deadlines, and scheduling',
		enabled: true,
		titlePrefix: 'Calendar',
		tierMin: 'personal'
	},
	{
		type: 'cards',
		label: 'Cards',
		description: 'Columns and cards for tracking anything',
		enabled: true,
		titlePrefix: 'Cards',
		tierMin: 'personal'
	},
	{
		type: 'docs',
		label: 'Docs & Files',
		description: 'Collaborative documents, knowledge base, and file storage',
		enabled: true,
		titlePrefix: 'Docs',
		tierMin: 'personal'
	},
	{
		type: 'tasks',
		label: 'Tasks',
		description: 'Assign work and track it in kanban or gantt views',
		enabled: true,
		titlePrefix: 'To-dos',
		tierMin: 'personal'
	},
	{
		type: 'okrs',
		label: 'OKRs',
		description: 'Set and track objectives and key results',
		enabled: true,
		titlePrefix: 'OKRs',
		tierMin: 'plus'
	},
	{
		type: 'decisions',
		label: 'Decisions',
		description: 'Decision tracking and rationale',
		enabled: true,
		titlePrefix: 'Decisions',
		tierMin: 'personal'
	},
	{
		type: 'reports',
		label: 'Reports',
		description: 'Progress, workload, timelines, and digests across modules',
		enabled: true,
		titlePrefix: 'Reports',
		tierMin: 'personal'
	}
] as const satisfies readonly {
	type: string;
	label: string;
	description: string;
	enabled: boolean;
	titlePrefix: string;
	tierMin: SubscriptionTier;
}[];

export type ModuleType = (typeof MODULE_CATALOG)[number]['type'];

export function isModuleType(value: string): value is ModuleType {
	return MODULE_CATALOG.some((m) => m.type === value);
}

/** Modules that can be added from the wrkspace “Add module” picker. */
export function getAddableModules() {
	return MODULE_CATALOG.filter((entry) => entry.enabled);
}

export function getModuleCatalogEntry(type: ModuleType) {
	return MODULE_CATALOG.find((m) => m.type === type)!;
}

export function defaultModuleTitle(type: ModuleType, existingCount: number): string {
	const entry = getModuleCatalogEntry(type);
	return `${entry.titlePrefix} ${existingCount + 1}`;
}

export function getModuleTierMin(type: ModuleType): SubscriptionTier {
	return getModuleCatalogEntry(type).tierMin;
}
