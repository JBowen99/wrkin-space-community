import { describe, expect, it } from 'vitest';
import {
	buildActivityHref,
	formatActivitySummary,
	formatRelativeTime,
	type ActivityEventDisplay
} from './activity-render';

const ctx = {
	teamSlug: 'acme',
	wrkspaceSlug: 'main',
	moduleId: 'mod-1'
};

function event(partial: Partial<ActivityEventDisplay>): ActivityEventDisplay {
	return {
		id: 'evt-1',
		type: 'task.created',
		actorUserId: 'user-1',
		actorName: 'Alex',
		actorImage: null,
		targetType: 'task',
		targetId: 'task-1',
		metadata: { title: 'Fix login' },
		moduleId: 'mod-1',
		moduleType: 'tasks',
		createdAt: new Date('2026-05-30T12:00:00Z'),
		...partial
	};
}

describe('buildActivityHref', () => {
	it('builds task links with query param', () => {
		expect(
			buildActivityHref(
				{ type: 'task.updated', targetType: 'task', targetId: 'task-1', moduleId: 'mod-1' },
				ctx
			)
		).toBe('/teams/acme/wrkspaces/main/modules/mod-1?task=task-1');
	});

	it('builds doc links', () => {
		expect(
			buildActivityHref(
				{ type: 'doc.created', targetType: 'doc', targetId: 'doc-1', moduleId: 'mod-1' },
				ctx
			)
		).toBe('/teams/acme/wrkspaces/main/modules/mod-1/docs/doc-1');
	});
});

describe('formatActivitySummary', () => {
	it('formats task creation', () => {
		const formatted = formatActivitySummary(event({ type: 'task.created' }), ctx);
		expect(formatted.summary).toBe('Alex created task');
		expect(formatted.highlight).toBe('Fix login');
	});

	it('formats assignment notifications', () => {
		const formatted = formatActivitySummary(event({ type: 'task.assigned' }), ctx);
		expect(formatted.summary).toBe('Alex assigned you to');
	});

	it('formats doc title changes with previous title', () => {
		const formatted = formatActivitySummary(
			event({
				type: 'doc.title_changed',
				targetType: 'doc',
				targetId: 'doc-1',
				metadata: { title: 'New title', previousTitle: 'Old title' }
			}),
			ctx
		);
		expect(formatted.summary).toContain('renamed document from "Old title" to');
		expect(formatted.highlight).toBe('New title');
	});
});

describe('formatRelativeTime', () => {
	it('returns just now for recent timestamps', () => {
		const now = new Date('2026-05-30T12:00:00Z');
		expect(formatRelativeTime(new Date('2026-05-30T11:59:30Z'), now)).toBe('just now');
	});

	it('returns minutes for recent activity', () => {
		const now = new Date('2026-05-30T12:00:00Z');
		expect(formatRelativeTime(new Date('2026-05-30T11:45:00Z'), now)).toBe('15m ago');
	});
});
