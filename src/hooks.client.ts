import type { HandleClientError } from '@sveltejs/kit';

async function reportClientError(payload: Record<string, unknown>): Promise<void> {
	try {
		const body = JSON.stringify(payload);
		if ('sendBeacon' in navigator) {
			const blob = new Blob([body], { type: 'application/json' });
			const ok = navigator.sendBeacon('/api/log/client-error', blob);
			if (ok) return;
		}
		await fetch('/api/log/client-error', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
			keepalive: true
		});
	} catch {
	}
}

export const handleError: HandleClientError = ({ error, event, status, message }) => {
	const errorId =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

	const err =
		error instanceof Error
			? { name: error.name, message: error.message, stack: error.stack }
			: { message: String(error) };

	void reportClientError({
		error_id: errorId,
		status,
		message,
		error: err,
		path: event.url.pathname,
		route: event.route?.id,
		user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
	});

	return {
		message: status >= 500 ? 'Something went wrong' : message,
		errorId
	};
};
