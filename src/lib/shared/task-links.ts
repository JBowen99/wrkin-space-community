import {
	DECISION_LINK_TARGET_LABELS,
	DECISION_LINK_TARGET_TYPES,
	type DecisionLinkTargetType,
	isDecisionLinkTargetType
} from './decisions';

export const TASK_LINK_TARGET_TYPES = [...DECISION_LINK_TARGET_TYPES, 'decision'] as const;
export type TaskLinkTargetType = DecisionLinkTargetType | 'decision';

export function isTaskLinkTargetType(value: string): value is TaskLinkTargetType {
	return (TASK_LINK_TARGET_TYPES as readonly string[]).includes(value);
}

export const TASK_LINK_TARGET_LABELS: Record<TaskLinkTargetType, string> = {
	...DECISION_LINK_TARGET_LABELS,
	decision: 'Decision'
};

export type TaskLinkInput = {
	targetType: TaskLinkTargetType;
	targetId: string;
	moduleId: string;
};

export type TaskTagRow = {
	id: string;
	name: string;
	color: string | null;
};

export function normalizeTagName(name: string): string {
	return name.trim().replace(/\s+/g, ' ');
}

export function buildWrkspaceItemHref(
	teamSlug: string,
	wrkspaceSlug: string,
	targetType: TaskLinkTargetType | DecisionLinkTargetType,
	moduleId: string,
	targetId: string
): string {
	const base = `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${moduleId}`;
	switch (targetType) {
		case 'doc_page':
			return `${base}/docs/${targetId}`;
		case 'forum_thread':
			return `${base}/threads/${targetId}`;
		case 'decision':
			return `${base}/decisions/${targetId}`;
		case 'task':
		default:
			return `${base}?task=${targetId}`;
	}
}

export { isDecisionLinkTargetType, type DecisionLinkTargetType };
