export const DECISION_STATUSES = ['draft', 'accepted', 'deprecated', 'superseded'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const DEFAULT_DECISION_STATUS: DecisionStatus = 'accepted';

export function isDecisionStatus(value: string): value is DecisionStatus {
	return (DECISION_STATUSES as readonly string[]).includes(value);
}

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
	draft: 'Draft',
	accepted: 'Accepted',
	deprecated: 'Deprecated',
	superseded: 'Superseded'
};

export const DECISION_LINK_TARGET_TYPES = ['task', 'doc_page', 'forum_thread'] as const;
export type DecisionLinkTargetType = (typeof DECISION_LINK_TARGET_TYPES)[number];

export function isDecisionLinkTargetType(value: string): value is DecisionLinkTargetType {
	return (DECISION_LINK_TARGET_TYPES as readonly string[]).includes(value);
}

export const DECISION_LINK_TARGET_LABELS: Record<DecisionLinkTargetType, string> = {
	task: 'Task',
	doc_page: 'Doc',
	forum_thread: 'Forum thread'
};

export const DECISION_SORT_OPTIONS = ['newest', 'oldest', 'title', 'status'] as const;
export type DecisionSort = (typeof DECISION_SORT_OPTIONS)[number];

export const DEFAULT_DECISION_SORT: DecisionSort = 'newest';

export function isDecisionSort(value: string): value is DecisionSort {
	return (DECISION_SORT_OPTIONS as readonly string[]).includes(value);
}

export function parseDecisionSort(raw: string | null | undefined): DecisionSort {
	if (raw && isDecisionSort(raw)) return raw;
	return DEFAULT_DECISION_SORT;
}

export const DECISION_SORT_LABELS: Record<DecisionSort, string> = {
	newest: 'Newest first',
	oldest: 'Oldest first',
	title: 'Title (A–Z)',
	status: 'Status'
};

export const DECISIONS_PER_PAGE = 20;

export type DecisionStatusTab = DecisionStatus | 'all';

export const DECISION_STATUS_TAB_LABELS: Record<DecisionStatusTab, string> = {
	all: 'All',
	...DECISION_STATUS_LABELS
};

export function parseDecisionStatusFilter(raw: string | null | undefined): DecisionStatusTab {
	if (raw === 'all' || !raw) return 'all';
	if (isDecisionStatus(raw)) return raw;
	return 'all';
}
