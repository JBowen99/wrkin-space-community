import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import {
	DECISIONS_PER_PAGE,
	DEFAULT_DECISION_SORT,
	DEFAULT_DECISION_STATUS,
	isDecisionLinkTargetType,
	isDecisionSort,
	isDecisionStatus,
	parseDecisionSort,
	type DecisionLinkTargetType,
	type DecisionSort,
	type DecisionStatus
} from '../shared/decisions';
import type { ActivityType } from '../shared/activity';
import { db } from './db/index.ts';
import {
	decisionLink,
	decisionParticipant,
	decisionRecord,
	docPage,
	forumThread,
	taskItem,
	user,
	wrkspaceModule
} from './db/schema.ts';
import { escapeIlike } from './ilike.ts';
import { getModuleForUser } from './modules.ts';
import { getModuleContext, recordActivity } from './activity.ts';
import { uniqueId } from '../shared/slug';
import { buildWrkspaceItemHref } from './wrkspace-links.ts';
import { listLinkableTargetsForWrkspace, type LinkableTarget } from './linkable-targets.ts';

export type { LinkableTarget };

export type DecisionParticipantRow = {
	id: string;
	name: string;
	image: string | null;
};

export type DecisionLinkRow = {
	id: string;
	targetType: DecisionLinkTargetType;
	targetId: string;
	moduleId: string;
	moduleTitle: string;
	title: string;
	href: string;
};

export type DecisionListRow = {
	id: string;
	moduleId: string;
	title: string;
	summary: string;
	rationale: string;
	status: DecisionStatus;
	authorId: string;
	authorName: string;
	authorImage: string | null;
	decidedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	supersedesId: string | null;
	supersedesTitle: string | null;
	participantCount: number;
	linkCount: number;
};

export type DecisionRelations = {
	participants: Record<string, DecisionParticipantRow[]>;
	links: Record<string, DecisionLinkRow[]>;
};

export type DecisionDetail = {
	id: string;
	moduleId: string;
	title: string;
	summary: string;
	rationale: string;
	status: DecisionStatus;
	decidedAt: Date | null;
	authorId: string;
	authorName: string;
	authorImage: string | null;
	supersedesId: string | null;
	supersedesTitle: string | null;
	supersededBy: { id: string; title: string } | null;
	createdAt: Date;
	updatedAt: Date;
	participants: DecisionParticipantRow[];
	links: DecisionLinkRow[];
};

export type DecisionsPage = {
	decisions: DecisionListRow[];
	totalCount: number;
	page: number;
	perPage: number;
	q: string;
	sort: DecisionSort;
	statusCounts: Record<string, number>;
};

export type DecisionInput = {
	title: string;
	summary: string;
	rationale: string;
	status: DecisionStatus;
	decidedAt: Date | null;
	participantIds: string[];
	supersedesId: string | null;
	links: { targetType: DecisionLinkTargetType; targetId: string; moduleId: string }[];
};

export type TeamMemberOption = {
	id: string;
	name: string;
	image: string | null;
};

export { parseDecisionSort } from '../shared/decisions';

export function parseDecisionSortFromQuery(raw: string | null): DecisionSort {
	return parseDecisionSort(raw);
}

const DECISION_MODULE_PREVIEW_LIMIT = 3;

async function assertDecisionsModule(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<{ wrkspaceId: string } | undefined> {
	const mod = await getModuleForUser(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!mod || mod.type !== 'decisions') return undefined;
	return { wrkspaceId: mod.wrkspaceId };
}

async function recordDecisionActivity(
	moduleId: string,
	actorUserId: string,
	type: ActivityType,
	decisionId: string,
	metadata: { title: string }
): Promise<void> {
	const ctx = await getModuleContext(moduleId);
	if (!ctx) return;

	await recordActivity({
		wrkspaceId: ctx.wrkspaceId,
		actorUserId,
		type,
		moduleId: ctx.moduleId,
		moduleType: ctx.moduleType,
		targetType: 'decision',
		targetId: decisionId,
		metadata
	});
}

export function buildDecisionLinkHref(
	teamSlug: string,
	wrkspaceSlug: string,
	targetType: DecisionLinkTargetType,
	moduleId: string,
	targetId: string
): string {
	return buildWrkspaceItemHref(teamSlug, wrkspaceSlug, targetType, moduleId, targetId);
}

export function buildDecisionHref(
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	decisionId: string
): string {
	return `/teams/${teamSlug}/wrkspaces/${wrkspaceSlug}/modules/${moduleId}/decisions/${decisionId}`;
}

function decisionListWhere(moduleId: string, q?: string, status?: DecisionStatus): SQL {
	const conditions = [eq(decisionRecord.moduleId, moduleId)];

	if (status) {
		conditions.push(eq(decisionRecord.status, status));
	}

	const trimmed = q?.trim();
	if (trimmed) {
		const pattern = `%${escapeIlike(trimmed)}%`;
		conditions.push(
			or(ilike(decisionRecord.title, pattern), ilike(decisionRecord.summary, pattern))!
		);
	}

	return and(...conditions)!;
}

function decisionOrderBy(sort: DecisionSort) {
	switch (sort) {
		case 'oldest':
			return [asc(decisionRecord.createdAt)];
		case 'title':
			return [asc(decisionRecord.title)];
		case 'status':
			return [asc(decisionRecord.status), desc(decisionRecord.updatedAt)];
		case 'newest':
		default:
			return [desc(decisionRecord.updatedAt), desc(decisionRecord.createdAt)];
	}
}

function excerptSummary(summary: string, maxLen = 140): string {
	const trimmed = summary.trim().replace(/\s+/g, ' ');
	if (!trimmed) return '';
	if (trimmed.length <= maxLen) return trimmed;
	return `${trimmed.slice(0, maxLen)}…`;
}

export async function getDecisionsModulePreview(moduleId: string): Promise<{
	totalCount: number;
	draftCount: number;
	acceptedCount: number;
	recent: { title: string; summary: string; status: DecisionStatus }[];
}> {
	const empty = {
		totalCount: 0,
		draftCount: 0,
		acceptedCount: 0,
		recent: [] as { title: string; summary: string; status: DecisionStatus }[]
	};

	const [countRow] = await db
		.select({ value: count() })
		.from(decisionRecord)
		.where(eq(decisionRecord.moduleId, moduleId));

	const totalCount = Number(countRow?.value ?? 0);
	if (totalCount === 0) {
		return empty;
	}

	const [draftRow] = await db
		.select({ value: count() })
		.from(decisionRecord)
		.where(and(eq(decisionRecord.moduleId, moduleId), eq(decisionRecord.status, 'draft')));

	const [acceptedRow] = await db
		.select({ value: count() })
		.from(decisionRecord)
		.where(and(eq(decisionRecord.moduleId, moduleId), eq(decisionRecord.status, 'accepted')));

	const rows = await db
		.select({
			title: decisionRecord.title,
			summary: decisionRecord.summary,
			status: decisionRecord.status
		})
		.from(decisionRecord)
		.where(eq(decisionRecord.moduleId, moduleId))
		.orderBy(desc(decisionRecord.updatedAt))
		.limit(DECISION_MODULE_PREVIEW_LIMIT);

	return {
		totalCount,
		draftCount: Number(draftRow?.value ?? 0),
		acceptedCount: Number(acceptedRow?.value ?? 0),
		recent: rows.map((r) => ({
			title: r.title,
			summary: excerptSummary(r.summary, 80),
			status: isDecisionStatus(r.status) ? r.status : DEFAULT_DECISION_STATUS
		}))
	};
}

export async function listDecisions(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	options?: {
		page?: number;
		perPage?: number;
		q?: string;
		sort?: DecisionSort;
		status?: DecisionStatus | 'all';
	}
): Promise<DecisionsPage> {
	const perPage = options?.perPage ?? DECISIONS_PER_PAGE;
	const q = options?.q?.trim() ?? '';
	const sort = options?.sort ?? DEFAULT_DECISION_SORT;
	const statusFilter = options?.status && options.status !== 'all' ? options.status : undefined;
	const empty: DecisionsPage = {
		decisions: [],
		totalCount: 0,
		page: 1,
		perPage,
		q,
		sort,
		statusCounts: {}
	};

	if (!(await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return empty;
	}

	const moduleWhere = eq(decisionRecord.moduleId, moduleId);

	const statusCountRows = await db
		.select({
			status: decisionRecord.status,
			count: count()
		})
		.from(decisionRecord)
		.where(moduleWhere)
		.groupBy(decisionRecord.status);

	const statusCounts: Record<string, number> = {};
	for (const row of statusCountRows) {
		statusCounts[row.status] = Number(row.count);
	}

	const where = decisionListWhere(moduleId, q || undefined, statusFilter);

	const [countRow] = await db.select({ value: count() }).from(decisionRecord).where(where);
	const totalCount = Number(countRow?.value ?? 0);
	if (totalCount === 0) return { ...empty, statusCounts };

	const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
	const requestedPage = Math.max(1, options?.page ?? 1);
	const page = Math.min(requestedPage, totalPages);
	const offset = (page - 1) * perPage;

	const rows = await db
		.select({
			id: decisionRecord.id,
			moduleId: decisionRecord.moduleId,
			title: decisionRecord.title,
			summary: decisionRecord.summary,
			rationale: decisionRecord.rationale,
			status: decisionRecord.status,
			authorId: decisionRecord.authorId,
			authorName: user.name,
			authorImage: user.image,
			decidedAt: decisionRecord.decidedAt,
			createdAt: decisionRecord.createdAt,
			updatedAt: decisionRecord.updatedAt,
			supersedesId: decisionRecord.supersedesId
		})
		.from(decisionRecord)
		.innerJoin(user, eq(decisionRecord.authorId, user.id))
		.where(where)
		.orderBy(...decisionOrderBy(sort))
		.limit(perPage)
		.offset(offset);

	const decisionIds = rows.map((r) => r.id);

	const participantCountMap = new Map<string, number>();
	const linkCountMap = new Map<string, number>();

	if (decisionIds.length > 0) {
		const pCounts = await db
			.select({
				decisionId: decisionParticipant.decisionId,
				value: count()
			})
			.from(decisionParticipant)
			.where(inArray(decisionParticipant.decisionId, decisionIds))
			.groupBy(decisionParticipant.decisionId);

		for (const row of pCounts) {
			participantCountMap.set(row.decisionId, Number(row.value));
		}

		const lCounts = await db
			.select({
				decisionId: decisionLink.decisionId,
				value: count()
			})
			.from(decisionLink)
			.where(inArray(decisionLink.decisionId, decisionIds))
			.groupBy(decisionLink.decisionId);

		for (const row of lCounts) {
			linkCountMap.set(row.decisionId, Number(row.value));
		}
	}

	const supersedesIds = rows.map((r) => r.supersedesId).filter((id): id is string => id !== null);
	const supersedesTitles = new Map<string, string>();

	if (supersedesIds.length > 0) {
		const uniqueIds = [...new Set(supersedesIds)];
		const titleRows = await db
			.select({ id: decisionRecord.id, title: decisionRecord.title })
			.from(decisionRecord)
			.where(inArray(decisionRecord.id, uniqueIds));

		for (const row of titleRows) {
			supersedesTitles.set(row.id, row.title);
		}
	}

	const decisions: DecisionListRow[] = rows.map((row) => ({
		id: row.id,
		moduleId: row.moduleId,
		title: row.title,
		summary: excerptSummary(row.summary),
		rationale: row.rationale,
		status: isDecisionStatus(row.status) ? row.status : DEFAULT_DECISION_STATUS,
		authorId: row.authorId,
		authorName: row.authorName,
		authorImage: row.authorImage,
		decidedAt: row.decidedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		supersedesId: row.supersedesId,
		supersedesTitle: row.supersedesId ? (supersedesTitles.get(row.supersedesId) ?? null) : null,
		participantCount: participantCountMap.get(row.id) ?? 0,
		linkCount: linkCountMap.get(row.id) ?? 0
	}));

	return { decisions, totalCount, page, perPage, q, sort, statusCounts };
}

async function loadParticipants(decisionId: string): Promise<DecisionParticipantRow[]> {
	return db
		.select({
			id: user.id,
			name: user.name,
			image: user.image
		})
		.from(decisionParticipant)
		.innerJoin(user, eq(decisionParticipant.userId, user.id))
		.where(eq(decisionParticipant.decisionId, decisionId))
		.orderBy(asc(user.name));
}

async function resolveLinkTitle(
	targetType: DecisionLinkTargetType,
	targetId: string
): Promise<string> {
	switch (targetType) {
		case 'task': {
			const [row] = await db
				.select({ title: taskItem.title })
				.from(taskItem)
				.where(eq(taskItem.id, targetId))
				.limit(1);
			return row?.title ?? 'Task';
		}
		case 'doc_page': {
			const [row] = await db
				.select({ title: docPage.title })
				.from(docPage)
				.where(eq(docPage.id, targetId))
				.limit(1);
			return row?.title ?? 'Document';
		}
		case 'forum_thread': {
			const [row] = await db
				.select({ title: forumThread.title })
				.from(forumThread)
				.where(eq(forumThread.id, targetId))
				.limit(1);
			return row?.title ?? 'Thread';
		}
		default:
			return 'Link';
	}
}

async function loadLinks(
	decisionId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<DecisionLinkRow[]> {
	const linkRows = await db
		.select({
			id: decisionLink.id,
			targetType: decisionLink.targetType,
			targetId: decisionLink.targetId,
			moduleId: decisionLink.moduleId,
			moduleTitle: wrkspaceModule.title
		})
		.from(decisionLink)
		.innerJoin(wrkspaceModule, eq(decisionLink.moduleId, wrkspaceModule.id))
		.where(eq(decisionLink.decisionId, decisionId));

	const links: DecisionLinkRow[] = [];
	for (const link of linkRows) {
		if (!isDecisionLinkTargetType(link.targetType)) continue;
		const title = await resolveLinkTitle(link.targetType, link.targetId);
		links.push({
			id: link.id,
			targetType: link.targetType,
			targetId: link.targetId,
			moduleId: link.moduleId,
			moduleTitle: link.moduleTitle,
			title,
			href: buildDecisionLinkHref(
				teamSlug,
				wrkspaceSlug,
				link.targetType,
				link.moduleId,
				link.targetId
			)
		});
	}
	return links;
}

export async function listDecisionRelations(
	decisionIds: string[],
	teamSlug: string,
	wrkspaceSlug: string
): Promise<DecisionRelations> {
	const result: DecisionRelations = {
		participants: {},
		links: {}
	};

	if (decisionIds.length === 0) return result;

	const pRows = await db
		.select({
			decisionId: decisionParticipant.decisionId,
			id: user.id,
			name: user.name,
			image: user.image
		})
		.from(decisionParticipant)
		.innerJoin(user, eq(decisionParticipant.userId, user.id))
		.where(inArray(decisionParticipant.decisionId, decisionIds))
		.orderBy(asc(user.name));

	for (const row of pRows) {
		const list = result.participants[row.decisionId] ?? [];
		list.push({ id: row.id, name: row.name, image: row.image });
		result.participants[row.decisionId] = list;
	}

	const linkRows = await db
		.select({
			decisionId: decisionLink.decisionId,
			id: decisionLink.id,
			targetType: decisionLink.targetType,
			targetId: decisionLink.targetId,
			moduleId: decisionLink.moduleId,
			moduleTitle: wrkspaceModule.title
		})
		.from(decisionLink)
		.innerJoin(wrkspaceModule, eq(decisionLink.moduleId, wrkspaceModule.id))
		.where(inArray(decisionLink.decisionId, decisionIds));

	const uniqueTargetKeys = new Set<string>();
	const targetLookup: {
		key: string;
		targetType: string;
		targetId: string;
		decisionId: string;
		linkId: string;
		moduleId: string;
		moduleTitle: string;
	}[] = [];

	for (const link of linkRows) {
		if (!isDecisionLinkTargetType(link.targetType)) continue;
		const key = `${link.targetType}:${link.targetId}`;
		uniqueTargetKeys.add(key);
		targetLookup.push({
			key,
			targetType: link.targetType,
			targetId: link.targetId,
			decisionId: link.decisionId,
			linkId: link.id,
			moduleId: link.moduleId,
			moduleTitle: link.moduleTitle
		});
	}

	const titleMap = new Map<string, string>();
	const uniqueTargets = [...uniqueTargetKeys];
	for (const targetKey of uniqueTargets) {
		const [type, id] = targetKey.split(':');
		const title = await resolveLinkTitle(type as DecisionLinkTargetType, id);
		titleMap.set(targetKey, title);
	}

	for (const entry of targetLookup) {
		const title = titleMap.get(entry.key) ?? 'Link';
		const list = result.links[entry.decisionId] ?? [];
		list.push({
			id: entry.linkId,
			targetType: entry.targetType as DecisionLinkTargetType,
			targetId: entry.targetId,
			moduleId: entry.moduleId,
			moduleTitle: entry.moduleTitle,
			title,
			href: buildDecisionLinkHref(
				teamSlug,
				wrkspaceSlug,
				entry.targetType as DecisionLinkTargetType,
				entry.moduleId,
				entry.targetId
			)
		});
		result.links[entry.decisionId] = list;
	}

	return result;
}

export async function getDecision(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	decisionId: string
): Promise<DecisionDetail | undefined> {
	if (!(await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return undefined;
	}

	const rows = await db
		.select({
			id: decisionRecord.id,
			moduleId: decisionRecord.moduleId,
			title: decisionRecord.title,
			summary: decisionRecord.summary,
			rationale: decisionRecord.rationale,
			status: decisionRecord.status,
			decidedAt: decisionRecord.decidedAt,
			authorId: decisionRecord.authorId,
			authorName: user.name,
			authorImage: user.image,
			supersedesId: decisionRecord.supersedesId,
			createdAt: decisionRecord.createdAt,
			updatedAt: decisionRecord.updatedAt
		})
		.from(decisionRecord)
		.innerJoin(user, eq(decisionRecord.authorId, user.id))
		.where(and(eq(decisionRecord.id, decisionId), eq(decisionRecord.moduleId, moduleId)))
		.limit(1);

	const row = rows[0];
	if (!row) return undefined;

	let supersedesTitle: string | null = null;
	if (row.supersedesId) {
		const [prev] = await db
			.select({ title: decisionRecord.title })
			.from(decisionRecord)
			.where(and(eq(decisionRecord.id, row.supersedesId), eq(decisionRecord.moduleId, moduleId)))
			.limit(1);
		supersedesTitle = prev?.title ?? null;
	}

	const supersededRows = await db
		.select({ id: decisionRecord.id, title: decisionRecord.title })
		.from(decisionRecord)
		.where(eq(decisionRecord.supersedesId, decisionId))
		.limit(1);

	const participants = await loadParticipants(decisionId);
	const links = await loadLinks(decisionId, teamSlug, wrkspaceSlug);

	return {
		id: row.id,
		moduleId: row.moduleId,
		title: row.title,
		summary: row.summary,
		rationale: row.rationale,
		status: isDecisionStatus(row.status) ? row.status : DEFAULT_DECISION_STATUS,
		decidedAt: row.decidedAt,
		authorId: row.authorId,
		authorName: row.authorName,
		authorImage: row.authorImage,
		supersedesId: row.supersedesId,
		supersedesTitle,
		supersededBy: supersededRows[0] ?? null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		participants,
		links
	};
}

async function validateSupersedes(
	moduleId: string,
	supersedesId: string | null,
	decisionId?: string
): Promise<boolean> {
	if (!supersedesId) return true;
	if (decisionId && supersedesId === decisionId) return false;

	const [row] = await db
		.select({ id: decisionRecord.id })
		.from(decisionRecord)
		.where(and(eq(decisionRecord.id, supersedesId), eq(decisionRecord.moduleId, moduleId)))
		.limit(1);

	return !!row;
}

async function validateLinksInWrkspace(
	wrkspaceId: string,
	links: { targetType: DecisionLinkTargetType; targetId: string; moduleId: string }[]
): Promise<boolean> {
	if (links.length === 0) return true;

	const moduleIds = [...new Set(links.map((l) => l.moduleId))];
	const modules = await db
		.select({ id: wrkspaceModule.id, type: wrkspaceModule.type })
		.from(wrkspaceModule)
		.where(and(eq(wrkspaceModule.wrkspaceId, wrkspaceId), inArray(wrkspaceModule.id, moduleIds)));

	const moduleById = new Map(modules.map((m) => [m.id, m.type]));

	for (const link of links) {
		const modType = moduleById.get(link.moduleId);
		if (!modType) return false;

		if (link.targetType === 'task' && modType !== 'tasks') return false;
		if (link.targetType === 'doc_page' && modType !== 'docs') return false;
		if (link.targetType === 'forum_thread' && modType !== 'forum') return false;

		let exists = false;
		if (link.targetType === 'task') {
			const [row] = await db
				.select({ id: taskItem.id })
				.from(taskItem)
				.where(and(eq(taskItem.id, link.targetId), eq(taskItem.moduleId, link.moduleId)))
				.limit(1);
			exists = !!row;
		} else if (link.targetType === 'doc_page') {
			const [row] = await db
				.select({ id: docPage.id })
				.from(docPage)
				.where(and(eq(docPage.id, link.targetId), eq(docPage.moduleId, link.moduleId)))
				.limit(1);
			exists = !!row;
		} else if (link.targetType === 'forum_thread') {
			const [row] = await db
				.select({ id: forumThread.id })
				.from(forumThread)
				.where(and(eq(forumThread.id, link.targetId), eq(forumThread.moduleId, link.moduleId)))
				.limit(1);
			exists = !!row;
		}

		if (!exists) return false;
	}

	return true;
}

async function setDecisionParticipants(
	decisionId: string,
	participantIds: string[]
): Promise<void> {
	await db.delete(decisionParticipant).where(eq(decisionParticipant.decisionId, decisionId));

	const unique = [...new Set(participantIds.filter(Boolean))];
	if (unique.length === 0) return;

	await db.insert(decisionParticipant).values(
		unique.map((userId) => ({
			decisionId,
			userId
		}))
	);
}

async function setDecisionLinks(
	decisionId: string,
	links: { targetType: DecisionLinkTargetType; targetId: string; moduleId: string }[]
): Promise<void> {
	await db.delete(decisionLink).where(eq(decisionLink.decisionId, decisionId));

	const seen = new Set<string>();
	const toInsert: {
		id: string;
		decisionId: string;
		targetType: DecisionLinkTargetType;
		targetId: string;
		moduleId: string;
	}[] = [];

	for (const link of links) {
		const key = `${link.targetType}:${link.targetId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		toInsert.push({
			id: uniqueId(),
			decisionId,
			targetType: link.targetType,
			targetId: link.targetId,
			moduleId: link.moduleId
		});
	}

	if (toInsert.length === 0) return;
	await db.insert(decisionLink).values(toInsert);
}

export function parseDecisionLinksFromForm(formData: FormData): {
	targetType: DecisionLinkTargetType;
	targetId: string;
	moduleId: string;
}[] {
	const raw = formData.get('links')?.toString() ?? '';
	if (!raw.trim()) return [];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];

		const links: { targetType: DecisionLinkTargetType; targetId: string; moduleId: string }[] = [];
		for (const item of parsed) {
			if (!item || typeof item !== 'object') continue;
			const o = item as Record<string, unknown>;
			const targetType = String(o.targetType ?? '');
			const targetId = String(o.targetId ?? '').trim();
			const moduleId = String(o.moduleId ?? '').trim();
			if (!isDecisionLinkTargetType(targetType) || !targetId || !moduleId) continue;
			links.push({ targetType, targetId, moduleId });
		}
		return links;
	} catch {
		return [];
	}
}

export function parseDecisionInputFromForm(formData: FormData): DecisionInput | null {
	const title = formData.get('title')?.toString().trim() ?? '';
	if (!title) return null;

	const summary = formData.get('summary')?.toString() ?? '';
	const rationale = formData.get('rationale')?.toString() ?? '';

	const statusRaw = formData.get('status')?.toString() ?? DEFAULT_DECISION_STATUS;
	if (!isDecisionStatus(statusRaw)) return null;

	const decidedAtRaw = formData.get('decidedAt')?.toString() ?? '';
	let decidedAt: Date | null = null;
	if (decidedAtRaw) {
		const d = new Date(decidedAtRaw);
		if (Number.isNaN(d.getTime())) return null;
		decidedAt = d;
	}

	const participantIds = formData
		.getAll('participantIds')
		.map((v) => v.toString())
		.filter(Boolean);

	const supersedesRaw = formData.get('supersedesId')?.toString().trim() ?? '';
	const supersedesId = supersedesRaw || null;

	const links = parseDecisionLinksFromForm(formData);

	return {
		title,
		summary: summary.trim(),
		rationale: rationale.trim(),
		status: statusRaw,
		decidedAt,
		participantIds,
		supersedesId,
		links
	};
}

export async function listTeamMembersForDecisions(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string
): Promise<TeamMemberOption[]> {
	const { listTeamMembersForWrkspace } = await import('./tasks.ts');
	return listTeamMembersForWrkspace(userId, teamSlug, wrkspaceSlug);
}

export async function listLinkableTargets(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string
): Promise<LinkableTarget[]> {
	const ctx = await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!ctx) return [];

	const targets = await listLinkableTargetsForWrkspace(ctx.wrkspaceId);
	return targets.filter((t) => isDecisionLinkTargetType(t.targetType)) as LinkableTarget[];
}

export async function listDecisionsForSupersedesPicker(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	excludeDecisionId?: string
): Promise<{ id: string; title: string }[]> {
	if (!(await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return [];
	}

	const rows = await db
		.select({ id: decisionRecord.id, title: decisionRecord.title })
		.from(decisionRecord)
		.where(eq(decisionRecord.moduleId, moduleId))
		.orderBy(asc(decisionRecord.title));

	return rows.filter((r) => r.id !== excludeDecisionId);
}

export async function createDecision(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	input: DecisionInput
): Promise<string | undefined> {
	const ctx = await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!ctx) return undefined;

	if (!(await validateSupersedes(moduleId, input.supersedesId))) return undefined;
	if (!(await validateLinksInWrkspace(ctx.wrkspaceId, input.links))) return undefined;

	const id = uniqueId();
	const now = new Date();

	await db.insert(decisionRecord).values({
		id,
		moduleId,
		title: input.title,
		summary: input.summary,
		rationale: input.rationale,
		status: input.status,
		decidedAt: input.decidedAt,
		authorId: userId,
		supersedesId: input.supersedesId,
		createdAt: now,
		updatedAt: now
	});

	await setDecisionParticipants(id, input.participantIds);
	await setDecisionLinks(id, input.links);

	await recordDecisionActivity(moduleId, userId, 'decision.created', id, { title: input.title });

	return id;
}

export async function updateDecision(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	decisionId: string,
	input: DecisionInput
): Promise<{ ok: boolean; statusChanged?: boolean }> {
	const ctx = await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId);
	if (!ctx) return { ok: false };

	const existing = await getDecision(userId, teamSlug, wrkspaceSlug, moduleId, decisionId);
	if (!existing) return { ok: false };

	if (!(await validateSupersedes(moduleId, input.supersedesId, decisionId))) {
		return { ok: false };
	}
	if (!(await validateLinksInWrkspace(ctx.wrkspaceId, input.links))) {
		return { ok: false };
	}

	const statusChanged = existing.status !== input.status;

	await db
		.update(decisionRecord)
		.set({
			title: input.title,
			summary: input.summary,
			rationale: input.rationale,
			status: input.status,
			decidedAt: input.decidedAt,
			supersedesId: input.supersedesId,
			updatedAt: new Date()
		})
		.where(and(eq(decisionRecord.id, decisionId), eq(decisionRecord.moduleId, moduleId)));

	await setDecisionParticipants(decisionId, input.participantIds);
	await setDecisionLinks(decisionId, input.links);

	if (statusChanged) {
		await recordDecisionActivity(moduleId, userId, 'decision.status_changed', decisionId, {
			title: input.title
		});
	} else {
		await recordDecisionActivity(moduleId, userId, 'decision.updated', decisionId, {
			title: input.title
		});
	}

	return { ok: true, statusChanged };
}

export async function deleteDecision(
	userId: string,
	teamSlug: string,
	wrkspaceSlug: string,
	moduleId: string,
	decisionId: string
): Promise<boolean> {
	if (!(await assertDecisionsModule(userId, teamSlug, wrkspaceSlug, moduleId))) {
		return false;
	}

	const existing = await getDecision(userId, teamSlug, wrkspaceSlug, moduleId, decisionId);
	if (!existing) return false;

	await db
		.delete(decisionRecord)
		.where(and(eq(decisionRecord.id, decisionId), eq(decisionRecord.moduleId, moduleId)));

	await recordDecisionActivity(moduleId, userId, 'decision.deleted', decisionId, {
		title: existing.title
	});

	return true;
}
