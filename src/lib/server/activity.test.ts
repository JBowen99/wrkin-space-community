import { describe, expect, it } from 'vitest';
import type { ActivityEventInput } from '../shared/activity';
import type { NotificationCategory } from '../shared/activity';
import {
	filterRecipientsByPreferences,
	resolveRecipientIds
} from './activity';

describe('resolveRecipientIds', () => {
	const baseInput: ActivityEventInput = {
		wrkspaceId: 'ws-1',
		actorUserId: 'actor-1',
		type: 'task.updated',
		targetType: 'task',
		targetId: 'task-1',
		metadata: { title: 'Fix bug' }
	};

	it('returns empty for none rule', () => {
		expect(resolveRecipientIds(baseInput, 'none', ['a-1'], ['m-1', 'm-2'])).toEqual([]);
	});

	it('returns assignees for assignees rule', () => {
		expect(resolveRecipientIds(baseInput, 'assignees', ['a-1', 'a-2'], ['m-1'])).toEqual([
			'a-1',
			'a-2'
		]);
	});

	it('returns wrkspace members for wrkspace_members rule', () => {
		expect(resolveRecipientIds(baseInput, 'wrkspace_members', [], ['m-1', 'm-2'])).toEqual([
			'm-1',
			'm-2'
		]);
	});

	it('returns mentioned users for mentioned_users rule', () => {
		const input: ActivityEventInput = {
			...baseInput,
			type: 'task.assigned',
			metadata: { title: 'Fix bug', mentionedUserIds: ['u-new'] }
		};
		expect(resolveRecipientIds(input, 'mentioned_users', ['a-old'], ['m-1'])).toEqual(['u-new']);
	});
});

describe('filterRecipientsByPreferences', () => {
	it('excludes the actor', () => {
		const prefs = new Map([['user-1', new Set(['tasks' as const])]]);
		expect(
			filterRecipientsByPreferences(['user-1', 'user-2'], 'tasks', prefs, 'user-1')
		).toEqual(['user-2']);
	});

	it('respects disabled categories', () => {
		const prefs = new Map<string, Set<NotificationCategory>>([
			['user-1', new Set(['docs'])],
			['user-2', new Set(['tasks'])]
		]);
		expect(
			filterRecipientsByPreferences(['user-1', 'user-2'], 'tasks', prefs, 'actor')
		).toEqual(['user-2']);
	});

	it('uses defaults when user has no stored preferences', () => {
		const prefs = new Map<string, Set<'tasks'>>();
		expect(filterRecipientsByPreferences(['user-1'], 'tasks', prefs, 'actor')).toEqual(['user-1']);
		expect(filterRecipientsByPreferences(['user-1'], 'chat', prefs, 'actor')).toEqual([]);
	});
});
