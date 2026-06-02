import type { ChatMessageRow } from '$lib/server/modules';

export type ChatSearchField = 'body' | 'author' | 'attachment';

export type ChatSearchMatch = {
	messageId: string;
	field: ChatSearchField;
	attachmentId?: string;
	start: number;
	length: number;
};

export type HighlightSegment = {
	text: string;
	highlight: boolean;
	active: boolean;
};

type SearchTarget = {
	field: ChatSearchField;
	text: string;
	attachmentId?: string;
};

/** Text fields that are actually rendered for the given message. */
export function getMessageSearchTargets(
	message: ChatMessageRow,
	currentUserId: string
): SearchTarget[] {
	const targets: SearchTarget[] = [];

	if (message.body) {
		targets.push({ field: 'body', text: message.body });
	}
	// Author label is only shown on other people's messages.
	if (message.authorId !== currentUserId) {
		targets.push({ field: 'author', text: message.authorName });
	}
	for (const att of message.attachments) {
		targets.push({ field: 'attachment', text: att.originalName, attachmentId: att.id });
	}

	return targets;
}

function findInText(
	text: string,
	messageId: string,
	field: ChatSearchField,
	needle: string,
	matches: ChatSearchMatch[],
	attachmentId?: string
) {
	const lower = text.toLowerCase();
	const lowerNeedle = needle.toLowerCase();
	let start = 0;

	while (start <= lower.length - lowerNeedle.length) {
		const idx = lower.indexOf(lowerNeedle, start);
		if (idx === -1) break;

		matches.push({
			messageId,
			field,
			attachmentId,
			start: idx,
			length: lowerNeedle.length
		});
		start = idx + lowerNeedle.length;
	}
}

export function findChatMatches(
	messages: ChatMessageRow[],
	query: string,
	currentUserId: string
): ChatSearchMatch[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return [];

	const matches: ChatSearchMatch[] = [];

	for (const message of messages) {
		for (const target of getMessageSearchTargets(message, currentUserId)) {
			findInText(target.text, message.id, target.field, needle, matches, target.attachmentId);
		}
	}

	return matches;
}

export function messageHasSearchMatch(
	message: ChatMessageRow,
	query: string,
	currentUserId: string
): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) return false;

	return getMessageSearchTargets(message, currentUserId).some((t) =>
		t.text.toLowerCase().includes(needle)
	);
}

export function matchKey(match: ChatSearchMatch): string {
	return `${match.messageId}:${match.field}:${match.attachmentId ?? ''}:${match.start}`;
}

export function buildHighlightSegments(
	text: string,
	query: string,
	active?: Pick<ChatSearchMatch, 'start' | 'length'>
): HighlightSegment[] {
	const needle = query.trim();
	if (!needle) return [{ text, highlight: false, active: false }];

	const lower = text.toLowerCase();
	const lowerNeedle = needle.toLowerCase();
	const segments: HighlightSegment[] = [];
	let cursor = 0;

	while (cursor <= text.length - lowerNeedle.length) {
		const idx = lower.indexOf(lowerNeedle, cursor);
		if (idx === -1) {
			segments.push({ text: text.slice(cursor), highlight: false, active: false });
			break;
		}
		if (idx > cursor) {
			segments.push({ text: text.slice(cursor, idx), highlight: false, active: false });
		}
		const slice = text.slice(idx, idx + lowerNeedle.length);
		segments.push({
			text: slice,
			highlight: true,
			active: active !== undefined && idx === active.start && active.length === lowerNeedle.length
		});
		cursor = idx + lowerNeedle.length;
	}

	return segments.length > 0 ? segments : [{ text, highlight: false, active: false }];
}
