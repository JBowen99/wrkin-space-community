export type CollabUser = {
	clientId: number;
	id: string;
	name: string;
	color: string;
	image?: string | null;
};

/** Stable accent color for a user id (used for carets and selection highlights). */
export function collabUserColor(userId: string): string {
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = userId.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hue = Math.abs(hash) % 360;
	return `hsl(${hue} 65% 42%)`;
}

export function collabUserInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}

export function collabUserFromAwareness(
	states: Map<number, Record<string, unknown>>
): CollabUser[] {
	const users: CollabUser[] = [];

	for (const [clientId, state] of states) {
		const raw = state.user;
		if (!raw || typeof raw !== 'object') continue;

		const user = raw as Record<string, unknown>;
		const id = typeof user.id === 'string' ? user.id : String(clientId);
		const name = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : 'Anonymous';
		const color =
			typeof user.color === 'string' && user.color.trim() ? user.color : collabUserColor(id);
		const image = typeof user.image === 'string' ? user.image : null;

		users.push({ clientId, id, name, color, image });
	}

	return users.sort((a, b) => a.name.localeCompare(b.name));
}
