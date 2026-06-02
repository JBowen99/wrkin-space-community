export const CHAT_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '😮'] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTIONS)[number];

export function isChatReactionEmoji(value: string): value is ChatReactionEmoji {
	return (CHAT_REACTIONS as readonly string[]).includes(value);
}
